import mongoose from "mongoose";
import Category from "./categoryModel.js";

const productSchema = new mongoose.Schema({
    category:
    {
        type:mongoose.Schema.Types.ObjectId,
            ref:Category,
            required:true
        },
    productname:
    {
        type:String,
        required:true
    },
    description:String,
    images:[String],
    price:
    {
        type:Number,
        required:true
    },
  
    offerPercentage:{
        type:Number,
        default:0,
        min:0,
        max:100
    },
    offerPrice:{
        type:Number,
        min:0
        
    },
    isDeleted:{
        type:Boolean,
        default:false

    },
    createdAt:{type:Date,default:Date.now}

})
export default mongoose.model('Product',productSchema)