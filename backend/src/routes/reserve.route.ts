import { downloadCashflow, downloadOutput } from '@controllers/download.controllers';
import {
  controlSheet,
  createSessionSimulation,
  getAllSessionName,
  getAllUserControlSheets,
  getCurrentAssumptions,
  reserveCalculator,
  uploadAssumptions,
  deleteControlSheet,
  createEmptySession,
  createControlSheet,
} from '@controllers/reserve.controller';
import { authenticateRequest } from '@middlewares/authenticateMiddleware';
import { Router } from 'express';
import multer, { Multer, StorageEngine } from 'multer';
const storage: StorageEngine = multer.memoryStorage();
const upload: Multer = multer({ storage });

const reserve = Router();

reserve.post('/assumptions', authenticateRequest, upload.single('files'), uploadAssumptions);
reserve.get('/assumptions', authenticateRequest, getCurrentAssumptions);
reserve.post('/reserve-calculator', authenticateRequest, reserveCalculator);
reserve.get('/download/output/:id', authenticateRequest, downloadOutput);
reserve.get('/download/cashflow/:id', authenticateRequest, downloadCashflow);
reserve.post('/save', authenticateRequest, createSessionSimulation); //create new session
reserve.post('/create-session', authenticateRequest, createEmptySession); //create new session empty session
reserve.post('/control', authenticateRequest, createControlSheet); //create new session empty session
reserve.get('/control/:id', authenticateRequest, controlSheet); //get control sheet for particular session
reserve.get('/sessions', authenticateRequest, getAllSessionName); //get all session name and id based on user
reserve.delete('/control/:id', authenticateRequest, deleteControlSheet); //delete control sheet for particular session

export default reserve;
