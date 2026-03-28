import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    description:{
        type:String,
        required:true,
    },
      catOfferPercentage:{
        type:Number,
        default:0,
        min:0,
        max:90
    },
  isListed:{
    type:Boolean,
    default:true
  }
},{timestamps:true})

const Category = mongoose.model('Category',categorySchema)
export default Category
