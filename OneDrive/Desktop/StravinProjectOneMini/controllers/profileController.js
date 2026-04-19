
import {
  getUserProfileService,getEditProfileService,editProfileService,sendEmailOtpService,
  verifyEmailOtpService,getChangePasswordService,changePasswordService} from "../services/profileService.js";

export const getUserProfile = async (req, res) => {
  try {
    const result = await getUserProfileService(req);

    if (!result.success) {
      return res.status(result.statusCode || 401).json(result);
    }

    return res.render("user/profile", result.data);
  } catch (error) {
    return res.status(500).json({success: false,message: "Server crashed"})
  }
}

export const getEditProfile = async (req, res) => {
  try {
    const result = await getEditProfileService(req);

    if (!result.success) {
      return res.redirect("/profile");
    }

    return res.render("user/editProfile", result.data);
  } catch (err) {
    console.error(err);
    return res.redirect("/profile");
  }
}

export const editprofile = async (req, res) => {
  try {
    const result = await editProfileService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (err) {
    console.error(err);
    return res.json({success: false,message: "Error updating profile"})
  }
}

export const sendEmailOtp = async (req, res) => {
  try {
    const result = await sendEmailOtpService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.json({success: false,message: "Error sending OTP"})
  }
}

export const verifyEmailOtp = async (req, res) => {
  try {
    const result = await verifyEmailOtpService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.json({success: false,message: "Error verifying OTP"})
  }
}

export const getChangePassword = async (req, res) => {
  try {
    const result = await getChangePasswordService(req);

    if (!result.success) {
      return res.redirect("/profile");
    }

    return res.render("user/changePassword", result.data);
  } catch (err) {
    console.error(err);
    return res.redirect("/profile");
  }
}

export const changePassword = async (req, res) => {
  try {
    const result = await changePasswordService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (err) {
    console.error(err);
    return res.json({success: false,message: "Failed to update password"
    })
  }
}