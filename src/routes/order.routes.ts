import { Router } from 'express';
import { prisma } from '../config/prisma';
import { notFound } from '../utils/errors';
const router=Router();
router.get('/:id',async(req,res,next)=>{try{const o=await prisma.order.findUnique({where:{publicId:req.params.id},include:{customer:true,items:true}});if(!o)throw notFound('Order not found');res.json({success:true,data:{...o,amount:Number(o.amount),customer:{id:o.customer.publicId,name:o.customer.name,email:o.customer.email}}})}catch(e){next(e)}});
export default router;
