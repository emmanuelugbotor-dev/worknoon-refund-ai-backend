import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import crypto from 'crypto';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  (req as any).requestId = requestId;
  next();
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId;
  if (err instanceof ZodError) return res.status(400).json({ success:false, error:{ code:'VALIDATION_ERROR', message:'Invalid request', details:err.issues }, requestId });
  if (err instanceof AppError) return res.status(err.statusCode).json({ success:false, error:{ code:err.code, message:err.message }, requestId });
  console.error(err);
  return res.status(500).json({ success:false, error:{ code:'INTERNAL_ERROR', message:'An unexpected error occurred.' }, requestId });
}
