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
} from '@controllers/reserve.controller';
import { authenticateRequest } from '@middlewares/authenticateMiddleware';
import { Router } from 'express';
import multer, { Multer, StorageEngine } from 'multer';
const storage: StorageEngine = multer.memoryStorage();
const upload: Multer = multer({ storage });

const orderRoute = Router();

orderRoute.post('/assumptions', authenticateRequest, upload.single('files'), uploadAssumptions);
orderRoute.get('/assumptions', authenticateRequest, getCurrentAssumptions);
orderRoute.post('/reserve-calculator', authenticateRequest, reserveCalculator);
orderRoute.get('/download/output/:id', authenticateRequest, downloadOutput);
orderRoute.get('/download/cashflow/:id', authenticateRequest, downloadCashflow);
orderRoute.post('/save', authenticateRequest, createSessionSimulation); //create new session
orderRoute.post('/create-session', authenticateRequest, createEmptySession  ); //create new session empty session
orderRoute.get('/control/:id', authenticateRequest, controlSheet); //get control sheet for particular session
orderRoute.get('/sessions', authenticateRequest, getAllSessionName); //get all session name and id based on user
orderRoute.delete('/control/:id', authenticateRequest, deleteControlSheet); //delete control sheet for particular session

export default orderRoute;
