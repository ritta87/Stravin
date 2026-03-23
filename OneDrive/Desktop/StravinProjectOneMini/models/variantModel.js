import mongoose from "mongoose";
import Category from "./categoryModel.js";
import Product from './productModel.js';
const variantSchema  = new mongoose.Schema({
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
        required:true
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required:true
    },
    color:{
        type:String
    },
    additionalPrice:{
        type:Number,
        default:0,
        min:0
    },
    stockQuantity:{
        type:Number,
        default:0,
        min:0,
        max:100
   
    },
    isListedVariant:{
        type:Boolean,
        default:true
     },
    images:{
        type:[String],
        required:true,
        default:[]
    },
    createdAt:{
        type:Date,
        default:Date.now()
    }
})
export default mongoose.model('Variant',variantSchema)