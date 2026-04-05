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
  statusHistory:[{
      status:String,
      date:{ type: Date, default: Date.now }
      }],
isRefunded:{
  type:Boolean,
  default:false
},
refundDetails: {
  amount:{ type: Number, default: 0 },
  method:{ type: String,default: "Wallet" },
  date:{ type: Date }
},
        name:String,
        image:String,
        color:String,
        quantity: Number,
        price: Number,

        itemStatus:{
          type:String,
          enum:[ "Pending","Placed","Shipped","Out for Delivery","Delivered","Cancelled","Returned"],
          default:"Pending"
        },

  return: {
  isRequested: { type: Boolean, default: false },
  reason: { type: String, default: "" },           
    requestDate: { type: Date, default: null },      
  status: { type: String, default: "Pending" },   
  adminNote: { type: String, default: "" },       
  approvalDate: { type: Date, default: null }     
}
 } 
],
failureReason:{type:String},
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
    type:String,
    enum:["COD","ONLINE","WALLET"],
    required:true
  },
 
  subTotal: Number,
  tax: Number,
  shipping: Number,
  totalAmount: Number,
  finalTotal:Number,
  coupon:{
    code:{type:String},
    discountAmount:{type:Number,default:0}
  },
  discount: {
  type: Number,
  default: 0
},
razorpayOrderId: {type: String, default: null },
razorpayPaymentId: {type: String, default: null },
razorpaySignature: {type: String, default: null },

status: {
  type: String,
  enum: ["Pending","Placed","Shipped", "Out for Delivery","Delivered","Cancelled","Returned","Partially Returned","Paid"],
  default:"Pending"
},
 statusHistory: [
{
  status: String,
  date: { type: Date, default: Date.now }
}
  ],
paymentStatus: {
  type: String,
  enum: ["Pending","Success","Paid","Failed","Cancelled","Refunded"],
  default: "Pending"
},
walletUsed:{
  type:Number, default:0
},


createdAt:{
    type:Date,
    default:Date.now
}
})
export default mongoose.model("Order",orderSchema)