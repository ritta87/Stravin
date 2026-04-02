import mongoose from "mongoose";
import Produt from '../models/productModel.js'
import User from '../models/userModel.js';

const cartSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    isLocked: {type: Boolean, default: false },
    items:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Product'
        },
        variant:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Variant'
        },
       quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number
        }
    }],
    coupon:{
    code: String,
    appliedAt: Date,
  },
  discountAmount: {
  type: Number,
  default: 0
},

finalTotal: {
  type: Number,
  default: 0
},
grandTotal:{
        type:Number,
        default:0
    }
},{timestamps:true})
export default mongoose.model('Cart',cartSchema)