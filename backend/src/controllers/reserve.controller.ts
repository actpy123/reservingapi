import { AssumptionModel, IAssumption } from '@models/assumption.model';
import { unzip } from '@utils/app.utils';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import * as Papa from 'papaparse';
import { parse } from 'path';
import { Assumption, Scenario } from '@CustomTypes/app.type';
import { findProductByScenario, loadRates, normalizeProductPercents } from '@libs/reserve.libs';
import { toNumber } from '@utils/number.utils';

import { resolve } from 'path';
import Piscina from 'piscina';
import { ReserveResultModel } from '@models/reserve-result.model';
import { AuthenticatedRequest } from '@middlewares/authenticateMiddleware';
import { SessionSimulation } from '@models/session.model';
import { ControlSheet } from '@models/control-sheet.model';
import { isValidObjectId, Types } from 'mongoose';

export async function getCurrentAssumptions(req: AuthenticatedRequest, res: Response) {
  try {
    const user: any = req.user; // ✅ always defined here
    const { sessionId } = req.query; // ✅ always defined here
    const assumptions = await AssumptionModel.find({ valid: true, userId: user._id, sessionId }).lean<Assumption[]>();
    // You could process files here or send them back
    res.sendCustomResponse(200, {
      message: 'Files uploaded and stored in memory.',
      data: {
        files: assumptions,
      },
    });
  } catch (error) {
    res.sendCustomResponse(500, { message: 'invalid user' });
  }
}

export async function uploadAssumptions(req: AuthenticatedRequest, res: Response) {
  const user: any = req.user; // 👈 Type assertion here
  const assumptionFileZip = req.file as Express.Multer.File; // 👈 Type assertion here
  const sessionId: string = req.body.sessionId as string;

  if (!isValidObjectId(sessionId)) {
    console.log('isSessionExist', false); // Invalid format means it can't exist
    return res.status(400).send('Session does not Exist');
  }

  const isSessionExist = !!(await SessionSimulation.exists({ _id: sessionId }));

  if (!assumptionFileZip || !isSessionExist) {
    return res.status(400).send('No file uploaded');
  }
  try {
    const extractedFiles = unzip(assumptionFileZip.buffer);
    await AssumptionModel.updateMany({ valid: true, sessionId, userId: user._id }, { $set: { valid: false } });
    const assumptionId = randomUUID();

    const assumptions = [];

    for (const file of extractedFiles) {
      if (file.fileName.includes('.csv')) {
        const assumptionName = parse(file.fileName).name;

        const csvString = file.content.toString('utf8');
        const result = Papa.parse(csvString, {
          header: true, // First row as header
          skipEmptyLines: true,
        });
        assumptions.push({ name: assumptionName, data: result.data, assumptionId, sessionId, userId: user._id });
      }
    }
    const saved = await AssumptionModel.insertMany(assumptions);

    res.sendCustomResponse(200, {
      message: 'Files uploaded and stored in memory.',
      data: {
        assumptionId,
        files: assumptions,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to unzip file');
  }
}

const piscina = new Piscina({
  filename:
    process.env.NODE_ENV === 'local' ? resolve(process.cwd(), 'src/workers/reserve-calculator.worker.ts') : resolve(process.cwd(), 'dist/workers/reserve-calculator.worker.js'),
  maxThreads: 8,
  execArgv: process.env.NODE_ENV === 'local' ? ['-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register'] : [],
});

export async function reserveCalculator(req: AuthenticatedRequest, res: Response) {
  try {
    const user: any = req.user; // ✅ always defined here
    const { controlSheetId, sessionId } = req.body;

    const assumptions = await AssumptionModel.find({ valid: true, userId: user._id, sessionId }).lean<Assumption[]>();

    const assumptionId: any = assumptions[0].assumptionId;

    console.log('con', controlSheetId);
    const controlSheet: any = await ControlSheet.findById(controlSheetId).lean();
    console.log('controlSheet', controlSheet);

    const fileData = controlSheet?.data ?? null;
    // console.log('fileData', fileData);

    if (!fileData || !fileData.length) {
      res.sendCustomResponse(400, { message: 'unable to retrive file data' });
      return;
    }

    // const policySummaries = createPolicySummaryArray(1201);
    let skippedPolicies = 0;
    let successfulPolicies = 0;
    let reserveResultId;
    let product = findProductByScenario(assumptions, controlSheet?.scenarioCode);
    product = normalizeProductPercents(product);
    const mortalityRates = loadRates(assumptions, product['Mortality Table Number']);
    const mortalityBERates = loadRates(assumptions, product['Mortality Loading BE Table Number']);
    const morbidityRates = loadRates(assumptions, product['Morbidity Table Number']);
    const lapseRates = loadRates(assumptions, product['Lapse Table Number']);
    const interestRates = loadRates(assumptions, product['Interest Rate Table']);
    const inflationRates = loadRates(assumptions, product['Expense Inflation Table']);
    const gsvRates = loadRates(assumptions, product['GSV Table']);
    const ssvRates = loadRates(assumptions, product['SSV Table']);
    const maturityBenefitRates = loadRates(assumptions, product['Maturity Benefit Table']);
    const incomeSurvivalBenefitRates = loadRates(assumptions, product['Income_Survival Benefit Table']);
    product['MAD FLAG'] = toNumber(product['MAD FLAG']);

    const promises = fileData.map((policyData: any) =>
      piscina.run({
        policyData,
        product,
        incomeSurvivalBenefitRates,
        maturityBenefitRates,
        mortalityRates,
        mortalityBERates,
        morbidityRates,
        lapseRates,
        inflationRates,
        interestRates,
        gsvRates,
        ssvRates,
      }),
    );

    const results = await Promise.allSettled(promises);

    const finalReserves = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    skippedPolicies += rejected.length;
    successfulPolicies += finalReserves.length;

    const cashflowResult = new Array(1201);
    finalReserves.forEach((item: any) => {
      item.cashFlows.forEach((cashflowItem: any, index: number) => {
        for (const [key, value] of Object.entries(cashflowItem)) {
          cashflowResult[index] = cashflowResult[index] ?? {};
          cashflowResult[index][key] = (cashflowResult[index][key] ?? 0) + value;
          cashflowResult[index].Period = index;
        }
      });
    });

    const reserveResult = new ReserveResultModel({
      scenarioCode: controlSheet.scenarioCode,
      assumptionId,
      output: finalReserves.map((item) => item.output),
      cashflow: cashflowResult.filter(Boolean),
    });
    reserveResultId = reserveResult._id;
    await reserveResult.save();

    const outputFile = `${process.env.VITE_API_BASE_URL}/download/output/${reserveResultId}`;
    const cashflows = `${process.env.VITE_API_BASE_URL}/download/cashflow/${reserveResultId}`;

    const updateControlSheet = await ControlSheet.findByIdAndUpdate(
      controlSheetId,
      { $set: { cashFlowUrl: cashflows, outPutUrl: outputFile, success: successfulPolicies, execution: 'Completed' } },
      { new: true },
    );
    res.sendCustomResponse(200, {
      data: {
        skippedPolicies,
        successfulPolicies,
        outputFile: outputFile,
        cashflows: cashflows,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.sendCustomResponse(500, { message: 'internal server error', data: null });
    return;
    // skippedPolicies += 1;
  }
}

export async function createEmptySession(req: AuthenticatedRequest, res: Response) {
  const user: any = req.user;
  const { sessionName } = req.body;

  if (typeof sessionName !== 'string' || sessionName.length < 3) {
    res.sendCustomResponse(400, { message: `Session Name Invalid` });
    return;
  }

  const session = await SessionSimulation.create({
    userId: user._id,
    name: sessionName,
  });

  res.sendCustomResponse(200, { data: session });
}

export async function createSessionSimulation(req: AuthenticatedRequest, res: Response) {
  const user: any = req.user;
  const { scenarioCode, inputFilePath, sessionId, sessionName } = req.body;

  try {
    let session;

    if (sessionId) {
      session = await SessionSimulation.findOne({
        _id: sessionId,
        userId: user._id,
      });

      if (!session) {
        res.sendCustomResponse(400, { message: `session not found` });
        return;
      }
    } else {
      session = await SessionSimulation.create({
        userId: user._id,
        name: sessionName,
      });
    }
    res.sendCustomResponse(200, { data: { session } });
    return;
  } catch (error) {
    console.error('createSessionSimulation error:', error);
    res.sendCustomResponse(500, { message: 'internal server error' });
  }
}

export async function createControlSheet(req: AuthenticatedRequest, res: Response) {
  try {
    const user: any = req.user;
    const { sessionId, scenarioCode, inputFilePath, data, rowNumber } = req.body;

    const session = await SessionSimulation.findOne({
      _id: sessionId,
      userId: user._id,
    });

    if (!session) {
      return res.sendCustomResponse(400, { message: 'Session not found' });
    }

    const controlSheet = await ControlSheet.create({
      sessionId: session._id,
      scenarioCode,
      inputFilePath,
      data: Papa.parse(data, {
        header: true, // First row as header
        skipEmptyLines: true,
      }).data,
      execution: 'pending',
      rowNumber,
    });

    res.sendCustomResponse(200, { data: controlSheet });
  } catch (error) {
    console.error('createControlSheet error:', error);
    res.sendCustomResponse(500, { message: 'internal server error' });
  }
}

export async function controlSheet(req: AuthenticatedRequest, res: Response) {
  try {
    const sessionId = req.params.id;
    const user: any = req.user;

    // Optional: verify session belongs to user
    const session = await SessionSimulation.findOne({
      _id: sessionId,
      userId: user._id,
    });

    console.log('session', session);
    if (!session) {
      return res.sendCustomResponse(400, { message: 'Session not found' });
    }

    // Fetch control sheets for this session + user
    const controlSheets = await ControlSheet.find({
      sessionId,
    }).sort({ createdAt: -1 });
    res.sendCustomResponse(200, { data: controlSheets });
    return;
  } catch (error) {
    console.error('sessionsimulation error:', error);
    res.sendCustomResponse(500, { message: 'internal server error' });
  }
}

export async function getAllUserControlSheets(req: AuthenticatedRequest, res: Response) {
  try {
    const user: any = req.user;

    // 1. Get all session IDs belonging to the user
    const sessions = await SessionSimulation.find({ userId: user._id }, { _id: 1 });

    if (!sessions.length) {
      return res.status(200).json({
        success: true,
        data: {
          controlSheets: [],
        },
      });
    }

    const sessionIds = sessions.map((s) => s._id);

    // 2. Fetch all control sheets for those sessions
    const controlSheets = await ControlSheet.find({
      sessionId: { $in: sessionIds },
    }).sort({ createdAt: -1 }); // optional

    return res.status(200).json({
      success: true,
      data: {
        controlSheets,
      },
    });
  } catch (error) {
    console.error('getAllUserControlSheets error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getAllSessionName(req: AuthenticatedRequest, res: Response) {
  const user: any = req.user;
  try {
    const sessions = await SessionSimulation.find({ userId: user._id }, { _id: 1, name: 1 }).sort({ createdAt: -1 });
    const data = sessions.map((session) => ({ id: session._id, name: session.name }));
    res.sendCustomResponse(200, { data: data });
  } catch (error) {
    console.log('error', error);
    res.sendCustomResponse(500, { message: `internal server error ${error}` });
  }
}

export async function deleteControlSheet(req: AuthenticatedRequest, res: Response) {
  try {
    const controlSheetId = req.params.id;
    const user: any = req.user;
    const controlSheet = await ControlSheet.findById(controlSheetId);

    if (!controlSheet) {
      return res.sendCustomResponse(404, { message: 'Control sheet not found' });
    }

    const session = await SessionSimulation.findOne({
      _id: controlSheet.sessionId,
      userId: user._id,
    });

    if (!session) {
      return res.sendCustomResponse(403, { message: 'Unauthorized' });
    }

    // 2. Hard Delete
    await ControlSheet.findByIdAndDelete(controlSheetId);

    res.sendCustomResponse(200, { message: 'Deleted successfully' });
  } catch (error) {
    console.error('delete error:', error);
    res.sendCustomResponse(500, { message: 'internal server error' });
  }
}
