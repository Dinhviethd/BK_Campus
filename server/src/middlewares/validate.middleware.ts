import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '@/utils/error.response';

/**
 * Middleware để validate request body, query, params sử dụng Zod schema
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[source];
      const validatedData = schema.parse(dataToValidate);
      
      // Gán lại data đã được validate
      req[source] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        const errorMessage = errorMessages
          .map((e: any) => `${e.field}: ${e.message}`)
          .join('; ');
        
        next(new AppError(400, errorMessage));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Middleware để validate nhiều nguồn dữ liệu cùng lúc
 */
export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: string[] = [];

      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          errors.push(...result.error.issues.map((e: any) => `body.${e.path.join('.')}: ${e.message}`));
        } else {
          req.body = result.data;
        }
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          errors.push(...result.error.issues.map((e: any) => `query.${e.path.join('.')}: ${e.message}`));
        } else {
          req.query = result.data as any;
        }
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          errors.push(...result.error.issues.map((e: any) => `params.${e.path.join('.')}: ${e.message}`));
        } else {
          req.params = result.data as any;
        }
      }

      if (errors.length > 0) {
        throw new AppError(400, errors.join('; '));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
