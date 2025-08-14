import { uploadAssumptions } from "@controllers/reserve.controller";
import { Router } from "express";
import multer, { Multer, StorageEngine } from "multer";
const storage: StorageEngine = multer.memoryStorage();
const upload: Multer = multer({ storage });

const orderRoute = Router();

orderRoute.post("/", upload.single("files"), uploadAssumptions);

export default orderRoute;
