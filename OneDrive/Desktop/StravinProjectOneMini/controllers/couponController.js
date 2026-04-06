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
    res.status(500).json({success:false,message:"Server error at loading coupon page"})
  }
}
export const addCoupon=async(req,res)=>{
    try{
    const {code,discountType,discountValue,minPurchase,maxDiscount,expiryDate}=req.body;
    const discount = Number(req.body.discountValue);
    const min = Number(req.body.minPurchase) || 0;
    const max = Number(req.body.maxDiscount) || 0;
    console.log(req.body)
    if (!code || !discountType||!discountValue|| !expiryDate) {
      return res.json({success:false,message:"All fields are required"})
    }
   if(isNaN(discount) || discount <= 0) {
        return res.json({success:false,message:"Discount must be positive"})
    }
    if (discountType ==="percentage" && discount>90) {
        return res.json({ success:false, message:"Maximum 90% allowed" })
    }
    if (discountType === "fixed" && discount > 10000) { 
    return res.json({success:false,message:"Maximum fixed discount exceeded"})
  }
    if (min < 0) {
        return res.json({success:false,message:"Minimum purchase cannot be negative"})
    }

    if (max < 0) {
     return res.json({success:false,message:"Max discount cannot be negative"})
    }
   
    if (new Date(expiryDate)<new Date()) {
    return res.json({success:false,message:"Expiry must be a future date"})
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
//edit coupon..............
export const getEditCoupon=async(req,res)=>{
  try {
    const {id} = req.params;
    const coupon = await Coupon.findById(id)
    if (!coupon) {
      return res.json({success:false,message:"Coupon not found"});
    }
    return res.render('admin/editCoupn',{coupon})
  } catch(error) {
    console.log(error)
    return res.json({success:false,message:"Server error at edit coupon"});
  }
}

  export const editCoupon = async (req, res) => {
  try {
    const id = req.params.id;
    const {code, discountType, discountValue, minPurchase, maxDiscount, expiryDate} = req.body;
    console.log(id)
    if (!id) return res.json({ success:false,message:"Coupon ID missing"})

    const coupon = await Coupon.findById(id);
    if (!coupon) return res.json({success:false,message:"Coupon not found"})

    
    if (!code || !discountType || !expiryDate)
      return res.json({ success: false,message:"All fields are required"})

    const discount = Number(discountValue)
    if (isNaN(discount) || discount <= 0)
      return res.json({ success: false, message:"Discount must be positive"})

    if (discountType === "percentage" && discount > 90)
      return res.json({ success: false, message: "Maximum 90% allowed for percentage" })

    if (discountType === "fixed" && discount > 10000)
      return res.json({ success: false, message: "Maximum fixed discount exceeded" })

    coupon.code = code.toUpperCase();
    coupon.discountType = discountType;
    coupon.discountValue = discount;
    coupon.minPurchase = Number(minPurchase || 0);
    coupon.maxDiscount = Number(maxDiscount || 0);
    coupon.expiryDate = new Date(expiryDate);

    await coupon.save();

    res.json({ success: true,message:"Coupon updated successfully"});
  } catch (err) {
    console.log(err);
    res.json({ success: false, message:"Server error while updating coupon"});
  }
}
export const deleteCoupon = async(req,res)=>{
  try {
    const {id} = req.params
    await Coupon.findByIdAndDelete(id)
    return res.json({success:true,message:"Coupon deleted successfully"})
  } catch (error) {
    console.log(error)
    return res.json({ success:false,message:"Server error"})
  }
}