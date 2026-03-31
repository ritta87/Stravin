import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code:{
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    discountType:{
        type:String,
        required:true,
        enum:["percentage","fixed"]
    },
    discountValue:{
        type:Number,
        required:true
    },
    minPurchase: {
    type:Number,
    default: 0
  },
  maxDiscount: {
    type:Number,
    default: 0 
  },
  expiryDate: {
    type: Date,
    required:true
  },
  isActive: {
    type:Boolean,
    default:true
  }
},{timestamps:true})
export default mongoose.model("Coupon",couponSchema)