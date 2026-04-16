import mongoose  from "mongoose";
import User from '../models/userModel.js'
import Razorpay from "razorpay";
import crypto from "crypto"


export const getWallet=async(req,res)=>{
    try{
    const userId=req.session.userId;
     const wallet = await User.findById(userId)

    if(!wallet){
        res.status(400).json({success:false,message:"No wallet found !"})
    }
   
    res.render('user/wallet')
}catch(error){
    res.status(500).json({success:false,message:"Server error at wallet loading.."})
}
}


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createWalletPayment = async (req, res) => {
  try {
    const amount = Number(req.body.amount)
    if (!amount || amount < 1) {
  return res.json({success: false,message:"Minimum amount is ₹1"})
}
    const options = {
      amount: amount * 100, // paise
      currency: "INR",
      receipt: "wallet_" + Date.now()
    }
    const order = await razorpay.orders.create(options);
    res.json({success:true,order})

  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
}



export const verifyWalletPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      const user = await User.findById(req.session.userId);
     const order = await razorpay.orders.fetch(razorpay_order_id);

      const topupAmount = Number(order.amount)/100

      // add money
      user.wallet = (user.wallet||0)+topupAmount

      // add history
      user.walletHistory.push({
        amount:topupAmount,
        type: "credit",
        reason: "Wallet Top-up"
      })

      await user.save();
      return res.json({success:true,balance:user.wallet})
    }
    res.json({success:false})

  } catch (error) {
    console.log(error);
    res.json({success:false})
  }
}

export const getWalletNetBalance=async(req,res)=>{
  try{
  const userId=req.session.userId
  const user = await User.findById(userId).select("wallet walletHistory")
  if(!user){
    return res.status(404).json({success:false,message:"User not found!"})
  }
 res.json({success:true,balance: user.wallet,
  history:user.walletHistory
 })
}catch(error){
  console.log(error)
  res.status(500).json({success:false,message:"Error at loading Wallet balance!"})
}
}