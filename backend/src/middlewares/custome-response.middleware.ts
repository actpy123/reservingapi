import { NextFunction, RequestHandler, Request, Response } from "express";
import { Body } from "../../express";

export const customResponseMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.sendCustomResponse = (statusCode: number, body: Body) => {
    const { message, data } = body;

    const response: any = {
      success: [200, 203].includes(statusCode),
    };

    if (message !== undefined) {
      response.message = message;
    }

    if (data !== undefined) {
      response.data = data;
    }
    if (message === undefined && data === undefined) {
      throw new Error("Either message or data is undefined");
    }
    res.status(statusCode).json(response);
  };
  next(); // Call the next middleware
};
