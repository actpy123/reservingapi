import "express";

type Body = {
  message?: string | string[] | { [key: string]: string }[] | undefined;
  data?: any;
};
import { Response } from "express";

declare global {
  namespace Express {
    interface Response {
      sendCustomResponse: (statusCode: number, body: Body) => void;
    }
  }
}
