import mongoose from "mongoose";
import User from '../models/userModel.js'
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
  },
  assignedTo:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"UserModel",
    default:null
  },
couponType: {
  type:String,
  enum:["admin", "referral"],
  default:"admin"
}
},{timestamps:true})
export default mongoose.model("Coupon",couponSchema)