import mongoose from "mongoose";
import Cart from '../models/cartModel.js'
import Address from '../models/addressModel.js'

const orderSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"UserModel",
        required:true
    },
    orderId: {type: String,required: true,unique: true },
    items:[
      {
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product"
        },
        variant:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Variant"
        },
        name:String,
        image:String,
        color:String,
        quantity: Number,
        price: Number,
        itemStatus:{
          type:String,
          enum:[ "Placed","Shipped","Out for Delivery","Delivered","Cancelled","Returned"],
          default:"Placed"
        },

    return:
    {
    isRequested: { type:Boolean,default:false 
    },
    reason: { 
      type:String,default: "" 
    },
    requestDate:Date,
    status: { 
      type:String,
     default:"Pending"
     } 
  },
 } 
],
address: {
    name: String,
    mobile: String,
    address: String,
    area:String,
    house:String,
    city: String,
    state: String,
    pincode: String,
    landmark:String
  },
paymentMethod: {
    type: String,
    default: "COD"
  },
  subTotal: Number,
  tax: Number,
  shipping: Number,
  totalAmount: Number,
status: {
  type: String,
  enum: ["Placed","Shipped", "Out for Delivery","Delivered","Cancelled","Returned"
    , "Partially Returned"],
  default:"Placed"
},
paymentStatus: {
  type: String,
  enum: ["Pending", "Paid", "Refunded"],
  default: "Pending"
}  ,
createdAt:{
    type:Date,
    default:Date.now
}
})
export default mongoose.model("Order",orderSchema)