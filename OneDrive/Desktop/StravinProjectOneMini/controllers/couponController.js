import mongoose from "mongoose"
import Coupon from '../models/couponModel.js'



export const getCouponPage=async(req,res)=>{
try{
  const coupons = await Coupon.find().sort({createdAt:-1})

    res.render('admin/coupons', {coupons})
}catch(error){
    res.status(500).json({success:"false",message:"Server at coupon page loading"})
}
}
export const addCouponPage=async(req,res)=>{
  try{
    res.render('admin/addCoupon')
  }catch(error){
    res.status(500).json({success:false,message:"Server error at loading coupo page"})
  }
}
export const addCoupon=async(req,res)=>{
    try{
    const {code,discountType,expiryDate}=req.body;
    const discount = Number(req.body.discountValue);
    const min = Number(req.body.minPurchase) || 0;
    const max = Number(req.body.maxDiscount) || 0;
    
    if (!code || !discountType|| !expiryDate) {
      return res.json({ success: false, message: "All fields required" });
    }
   if(isNaN(discount) || discount <= 0) {
        return res.json({success:false,message:"Discount must be positive"});
    }
    if (discountType ==="percentage" && discount>90) {
        return res.json({ success:false, message:"Maximum 90% allowed" });
    }
    if (min < 0) {
        return res.json({success:false,message:"Minimum purchase cannot be negative"});
    }

    if (max < 0) {
     return res.json({success:false,message:"Max discount cannot be negative"});
    }
   
    if (new Date(expiryDate)<new Date()) {
    return res.json({success:false,message:"Expiry must be future date"})
  }

    const existing = await Coupon.findOne({code:code.toUpperCase()});
    if (existing) {
      return res.json({success:false,message:"Coupon already exists" });
    }
    const coupon = new Coupon({
      code:code.toUpperCase(),
      discountType,
      discountValue:discount,
      minPurchase:min,
      maxDiscount:max,
      expiryDate
    })
    await coupon.save()
    return res.json({success:true,message:"Coupon added successfully!"})
    }
    catch(error){
    console.log(error);
    res.json({success:false,message:"Server error"})
    }
}