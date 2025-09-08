import { AssumptionModel } from '@models/assumption.model';
import { ReserveResultModel } from '@models/reserve-result.model';
import { Request, Response } from 'express';
import * as Papa from 'papaparse';

export async function downloadOutput(req: Request, res: Response) {
  const { id } = req.params;

  const results = await ReserveResultModel.findOne({ _id: id }).lean();
  if (results && results.output) {
    const productData = await AssumptionModel.findOne({ assumptionId: results?.assumptionId, name: 'product_master' }).lean();
    // Convert first dataset
    if (productData && productData?.data) {
      const product = productData?.data.find((item: any) => {
        return item['Scenario Code'] === results.scenarioCode;
      });
      const productCsv = Papa.unparse([product]);

      const output = Papa.unparse(results.output);

      const finalCsv = `${productCsv}\n\n${output}`;
      res.header('Content-Type', 'text/csv');
      res.attachment('data.csv'); // filename
      res.send(finalCsv);
      return;
    }
  }
  res.sendCustomResponse(200, {
    message: 'Files do not exist.',
  });
}
