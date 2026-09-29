import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
export function requireAdmin(req:Request,_res:Response,next:NextFunction){
 const h=req.header('authorization'); if(!h?.startsWith('Bearer ')) return next(new AppError(401,'UNAUTHORIZED','Admin authentication required'));
 try{(req as any).admin=jwt.verify(h.slice(7),env.JWT_SECRET);next()}catch{next(new AppError(401,'UNAUTHORIZED','Invalid or expired admin token'))}
}
