import { downloadCashflow, downloadOutput } from '@controllers/download.controllers';
import { getCurrentAssumptions, reserveCalculator, uploadAssumptions } from '@controllers/reserve.controller';
import { Router } from 'express';
import multer, { Multer, StorageEngine } from 'multer';
const storage: StorageEngine = multer.memoryStorage();
const upload: Multer = multer({ storage });

const orderRoute = Router();

orderRoute.post('/assumptions', upload.single('files'), uploadAssumptions);
orderRoute.get('/assumptions', getCurrentAssumptions);
orderRoute.post('/reserve-calculator', reserveCalculator);
orderRoute.get('/download/output/:id', downloadOutput);
orderRoute.get('/download/cashflow/:id', downloadCashflow);

export default orderRoute;
