import User from "../models/userModel.js";
import Address from "../models/addressModel.js";
import Coupon from "../models/couponModel.js";
import { sendOtpEmail } from "../utils/sendOtp.js";
import bcrypt from "bcrypt";

export const getUserProfileService = async (req) => {
  const userId = req.session.userId;

  if (!userId) {
    return {
      success: false,
      statusCode: 401,
      message: "Please Login first!"
    }
  }

  const user = await User.findById(userId);
  if (!user) {
    return {
      success: false,
      statusCode: 401,
      message: "Please Login first!"
    };
  }

  const address = await Address.findOne({
    userId,
    isDefault: true
  })

  const referralRewards = await Coupon.find({
    assignedTo: userId,
    couponType: "referral"
  })

  return {
    success: true,
    data: { user, address, referralRewards }
  }
}

export const getEditProfileService = async (req) => {
  const user = await User.findById(req.session.userId);

  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found"
    }
  }

  return {
    success: true,
    data: { user }
  }
}

export const editProfileService = async (req) => {
  const { name, mobile, removePic } = req.body;
  const user = await User.findById(req.session.userId);

  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found"
    }
  }

  user.name = name;
  user.mobile = mobile;

  if (req.file) {
    user.profileImage = "/uploads/profilePics/" + req.file.filename;
  }

  if (removePic === "true") {
    user.profileImage = "";
  }

  await user.save();

  return {
    success: true,
    statusCode: 200,
    message: "Profile updated successfully",
    profileImage: user.profileImage
  }
}

export const sendEmailOtpService = async (req) => {
  const { email } = req.body;

  if (!email) {
    return {
      success: false,
      statusCode: 400,
      message: "Email required"
    }
  }

  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser._id.toString() !== req.session.userId) {
    return {
      success: false,
      statusCode: 400,
      message: "Email already in use"
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("OTP to change Email : ", otp);

  req.session.emailOTP = otp;
  req.session.newEmail = email;
  req.session.otpExpiry = Date.now() + 5 * 60 * 1000;

  await sendOtpEmail(email, otp);

  return {
    success: true,
    statusCode: 200,
    message: "OTP sent successfully"
  };
};

export const verifyEmailOtpService = async (req) => {
  const { otp } = req.body;
  const userId = req.session.userId;

  if (!otp) {
    return {
      success: false,
      statusCode: 400,
      message: "OTP required"
    }
  }

  if (!req.session.emailOTP || !req.session.newEmail || !req.session.otpExpiry) {
    return {
      success: false,
      statusCode: 400,
      message: "No OTP session found"
    }
  }

  if (Date.now() > req.session.otpExpiry) {
    return {
      success: false,
      statusCode: 400,
      message: "OTP expired"
    }
  }

  if (otp !== req.session.emailOTP) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid OTP"
    }
  }

  await User.findByIdAndUpdate(userId, {
    email: req.session.newEmail
})

  req.session.emailOTP = null;
  req.session.newEmail = null;
  req.session.otpExpiry = null;

  return {
    success: true,
    statusCode: 200,
    message: "Email updated successfully"
  }
}

export const getChangePasswordService = async (req) => {
  const user = await User.findById(req.session.userId);

  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found"
    };
  }

  return {
    success: true,
    data: { user }
  }
}

export const changePasswordService = async (req) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.session.userId);

  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found"
    }
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return {
      success: false,
      statusCode: 400,
      message: "Current password is incorrect"
    }
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  await user.save();

  return {
    success: true,
    statusCode: 200,
    message: "Password updated successfully"
  }
}