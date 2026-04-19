import User from "../models/userModel.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const getWalletService = async (userId) => {
  const wallet = await User.findById(userId);

  if (!wallet) {
    return {
      success: false,
      statusCode: 400,
      message: "No wallet found !"
    };
  }

  return {
    success: true,
    wallet
  };
};

export const createWalletPaymentService = async (amount) => {
  amount = Number(amount);

  if (!amount || amount < 1) {
    return {
      success: false,
      statusCode: 400,
      message: "Minimum amount is ₹1"
    };
  }

  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: "wallet_" + Date.now()
  }

  const order = await razorpay.orders.create(options);

  return {
    success: true,
    statusCode: 200,
    order
  }
}

export const verifyWalletPaymentService = async (userId, paymentData) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = paymentData;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid payment signature"
    }
  }

  const user = await User.findById(userId);
  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found!"
    }
  }

  const order = await razorpay.orders.fetch(razorpay_order_id);
  const topupAmount = Number(order.amount) / 100;

  user.wallet = (user.wallet || 0) + topupAmount;

  user.walletHistory.push({
    amount: topupAmount,
    type: "credit",
    reason: "Wallet Top-up"
  });

  await user.save();

  return {
    success: true,
    statusCode: 200,
    balance: user.wallet
  }
}

export const getWalletNetBalanceService = async (userId) => {
  const user = await User.findById(userId).select("wallet walletHistory");

  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found!"
    }
  }

  return {
    success: true,
    statusCode: 200,
    balance: user.wallet,
    history: user.walletHistory
  }
}