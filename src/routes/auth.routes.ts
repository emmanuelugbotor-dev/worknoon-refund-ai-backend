import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
const router=Router();
const schema=z.object({email:z.string().email(),password:z.string().min(8)});
router.post('/login',(req,res,next)=>{try{const {email,password}=schema.parse(req.body);const expectedEmail=process.env.ADMIN_EMAIL||'admin@worknoon.local';const expectedPassword=process.env.ADMIN_PASSWORD||'ChangeMe123!';if(email!==expectedEmail||password!==expectedPassword){return res.status(401).json({success:false,error:{code:'INVALID_CREDENTIALS',message:'Invalid credentials'}})}const token=jwt.sign({sub:email,role:'admin'},env.JWT_SECRET,{expiresIn:'2h'});res.json({success:true,data:{token}})}catch(e){next(e)}});
export default router;
