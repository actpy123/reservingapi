import { Request, Response, Router } from "express";

const orderRoute = Router();

orderRoute.get("/", (req: Request, res: Response) => {
  res.sendCustomResponse(200, {
    message: "Annuity rates inserted successfully.",
  });
});

export default orderRoute;
