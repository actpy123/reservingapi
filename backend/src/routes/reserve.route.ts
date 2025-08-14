import { getCurrentAssumptions, uploadAssumptions } from '@controllers/reserve.controller';
import { Router } from 'express';
import multer, { Multer, StorageEngine } from 'multer';
const storage: StorageEngine = multer.memoryStorage();
const upload: Multer = multer({ storage });

const orderRoute = Router();

orderRoute.post('/assumptions', upload.single('files'), uploadAssumptions);
orderRoute.get('/assumptions', getCurrentAssumptions);

export default orderRoute;
