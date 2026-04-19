import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Coupon from "../models/couponModel.js";
import Cart from "../models/cartModel.js";
import { sendOtpEmail } from "../utils/sendOtp.js";
import {generatereferralCoupon, generatereferralCode} from "../helper/referralHelper.js";

// helper
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const calculateCartSummary = (cart) => {
  let subTotal = 0;

  cart.items.forEach((item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    subTotal += price * qty;
  });

  const tax = Math.round(subTotal * 0.05) || 0;
  const shipping = 50;
  const cartTotal = subTotal + tax + shipping;

  return { subTotal, tax, shipping, cartTotal };
};

// ---------------- services ----------------
export const userSignupService = async (data) => {
  let { name, email, mobile, password, confirmpassword, refferalCode } = data || {};

  if (!name || !email || !mobile || !password || !confirmpassword) {
    return {
      success: false,
      statusCode: 400,
      message: "All fields are required!"
    };
  }

  if (password !== confirmpassword) {
    return {
      success: false,
      statusCode: 400,
      message: "Password do not match!"
    };
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return {
      success: false,
      statusCode: 400,
      message: "EmailId alredy exists!"
    };
  }

  const existingMobile = await User.findOne({ mobile });
  if (existingMobile) {
    return {
      success: false,
      statusCode: 400,
      message: "Mobile number already exists!"
    };
  }

  let referrer = null;
  refferalCode = typeof refferalCode === "string" ? refferalCode.trim() : "";

  if (refferalCode !== "") {
    referrer = await User.findOne({
      refferalCode: refferalCode.toUpperCase()
    });

    if (!referrer) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid referral Code!"
      };
    }
  }

  const myReferralCode = generatereferralCode(name);
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    mobile,
    password: hashedPassword,
    refferalCode: myReferralCode,
    refferedBy: referrer ? referrer._id : null,
    createdByReferral: !!referrer,
    referralRewardGiven: false
  });

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpires = Date.now() + 1 * 60 * 1000;

  await user.save();
  await sendOtpEmail(user.email, otp);

  return {
    success: true,
    statusCode: 200,
    message: "Signup successful! OTP sent to your Email!",
    redirect: "/verifyOtp",
    pendingUserId: user._id,
    otp
  };
};

export const verifyOtpService = async (pendingUserId, otp) => {
  if (!pendingUserId) {
    return {
      success: false,
      message: "Session Expired!!"
    };
  }

  const user = await User.findById(pendingUserId);

  if (!user) {
    return {
      success: false,
      message: "User not found!"
    };
  }

  if (user.otp !== otp) {
    return {
      success: false,
      message: "Invalid OTP"
    };
  }

  if (user.otpExpires < Date.now()) {
    return {
      success: false,
      message: "OTP expired!"
    };
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;

  if (user.refferedBy && !user.referralRewardGiven) {
    await generatereferralCoupon(user.refferedBy);
    user.referralRewardGiven = true;
  }

  await user.save();

  return {
    success: true,
    message: "OTP verified successfully!",
    userId: user._id.toString()
  };
};

export const resendOtpService = async (pendingUserId) => {
  if (!pendingUserId) {
    return {
      success: false,
      statusCode: 400,
      message: "Session expired!"
    };
  }

  const user = await User.findById(pendingUserId);

  if (!user) {
    return {
      success: false,
      statusCode: 400,
      message: "No such User exists!"
    };
  }

  const newOtp = generateOtp();
  user.otp = newOtp;
  user.otpExpires = Date.now() + 1 * 60 * 1000;

  await user.save();
  await sendOtpEmail(user.email, newOtp);

  return {
    success: true,
    statusCode: 200,
    message: "OTP Resent successfully",
    otp: newOtp
  };
};

export const userLoginService = async (email, password) => {
  if (!email || !password) {
    return {
      success: false,
      statusCode: 400,
      message: "All fields are required!!"
    };
  }

  const user = await User.findOne({ email });
  if (!user) {
    return {
      success: false,
      statusCode: 400,
      message: "No such user found!"
    };
  }

  if (user.isBlocked) {
    return {
      success: false,
      statusCode: 403,
      blocked: true,
      message: "Your account has been blocked by admin"
    };
  }

  if (!user.isVerified) {
    return {
      success: false,
      statusCode: 400,
      message: "Please verify your Email"
    };
  }

  const isMatching = await bcrypt.compare(password, user.password);
  if (!isMatching) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid Credentials!"
    };
  }

  return {
    success: true,
    statusCode: 200,
    message: "Login Successful!",
    redirect: "/",
    userId: user._id
  };
};

export const forgotPasswordService = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return {
      success: false,
      statusCode: 400,
      message: "No such user found!"
    };
  }

  const otp = generateOtp();
  user.resetOtp = otp;
  user.resetOtpExpires = Date.now() + 60 * 1000;
  user.resetOtpVerified = false;

  await user.save();
  await sendOtpEmail(user.email, otp);

  return {
    success: true,
    statusCode: 200,
    message: "OTP sent to your Email",
    otp
  }
}

export const verifyResetOtpService = async (email, otp) => {
  const user = await User.findOne({ email });

  if (!user) {
    return {
      success: false,
      statusCode: 400,
      message: "No user Found!"
    };
  }

  if (user.resetOtp !== otp) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid OTP"
    };
  }

  if (user.resetOtpExpires < Date.now()) {
    return {
      success: false,
      statusCode: 400,
      message: "Oops! OTP Expired!"
    };
  }

  const resetToken = jwt.sign(
    { id: user._id },
    process.env.RESET_TOKEN_SECRET,
    { expiresIn: "10m" }
  );

  user.resetOtpVerified = true;
  user.resetToken = resetToken;
  user.resetTokenExpires = Date.now() + 10 * 60 * 1000;

  await user.save();

  return {
    success: true,
    statusCode: 200,
    message: "OTP Verified!",
    token: resetToken
  };
};

export const resetPasswordService = async ({
  email,
  otp,
  newPassword,
  confirmNewPassword
}) => {
  if (!email || !otp || !newPassword || !confirmNewPassword) {
    return {
      success: false,
      statusCode: 400,
      message: "All fields are required"
    };
  }

  if (newPassword !== confirmNewPassword) {
    return {
      success: false,
      statusCode: 400,
      message: "Passwords do not match"
    };
  }

  const user = await User.findOne({ email });

  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found"
    };
  }

  if (user.resetOtp !== otp) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid OTP"
    };
  }

  if (user.resetOtpExpires < Date.now()) {
    return {
      success: false,
      statusCode: 400,
      message: "OTP has expired"
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.resetOtp = null;
  user.resetOtpExpires = null;
  user.resetOtpVerified = false;
  user.resetToken = null;
  user.resetTokenExpires = null;

  await user.save();

  return {
    success: true,
    statusCode: 200,
    message: "Password reset successful"
  }
}

export const applyCouponService = async (userId, couponCode) => {
  const cart = await Cart.findOne({ userId })

  if (!cart) {
    return {
      success: false,
      statusCode: 404,
      message: "Cart not found"
    };
  }

  const newCode = couponCode.toUpperCase();

  if (cart.coupon && cart.coupon.code === newCode) {
    return {success: false,
      statusCode: 400,
      message: "This coupon is already applied"
    }
  }

  const coupon = await Coupon.findOne({
    code: newCode,
    isActive: true
  });

  if (!coupon) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid coupon"
    };
  }

  if (coupon.expiryDate && coupon.expiryDate < Date.now()) {
    return {
      success: false,
      statusCode: 400,
      message: "This coupon has expired!!"
    };
  }

  const { cartTotal } = calculateCartSummary(cart);

  let discount = 0;

  if (coupon.discountType === "percentage") {
    const percent = Number(coupon.discountValue) || 0;
    const max = Number(coupon.maxDiscount) || Infinity;
    discount = Math.min((cartTotal * percent) / 100, max);
  } else {
    discount = Number(coupon.discountValue) || 0;
  }

  const finalTotal = Math.max(0, cartTotal - discount);

  cart.coupon = {
    code: coupon.code,
    appliedAt: new Date()
  };

  cart.discountAmount = discount;
  cart.finalTotal = finalTotal;

  await cart.save();

  return {
    success: true,
    statusCode: 200,
    discount,
    finalTotal,
    couponCode: coupon.code
  };
};

export const removeCouponService = async (userId) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    return {
      success: false,
      statusCode: 404,
      message: "Cart not found"
    };
  }

  cart.coupon = undefined;
  cart.discountAmount = 0;

  const { cartTotal } = calculateCartSummary(cart);
  cart.finalTotal = cartTotal;

  await cart.save();

  return {
    success: true,
    statusCode: 200,
    finalTotal: cartTotal
  }
}