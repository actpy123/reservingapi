import { ZodTypeAny, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to validate req.body against a Zod schema.
 * Sends a response on error, otherwise calls next().
 */
const validate =
  (schema: ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  };

export default validate;
