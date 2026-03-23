import User from '../models/userModel.js'
import Address from '../models/addressModel.js'
import { sendOtpEmail } from '../utils/sendOtp.js';
import bcrypt from 'bcrypt'
export const getUserProfile=async(req,res)=>{
    try{
    const userId = req.session.userId;
    const user = await User.findById(userId)
    const address=await Address.findOne({userId:req.session.userId,isDefault:true})
    
    if(!user){
        return res.status(401).json({success:false,message:"Please Login first!"})
    }
    res.render('user/profile',{user,address})
}catch(error){
    res.status(500).json({success:false,message:"Server crashed"})
}
}


export const getEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('user/editProfile', { user });
  } catch (err) {
    console.error(err);
    res.redirect('/profile')
  }
};
export const editprofile = async (req, res) => {
  try {
    const { name, mobile, removePic } = req.body;
    const user = await User.findById(req.session.userId);

    user.name = name;
    user.mobile = mobile;

    // update profile image
    if (req.file) {
      user.profileImage = '/uploads/profilePics/' + req.file.filename;
    }

    // If removePic flag set
    if (removePic === 'true') {
      user.profileImage = '';
    }

    await user.save();

    // Send JSON for frontend
    res.json({ success: true, message: 'Profile updated successfully', profileImage: user.profileImage });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error updating profile' });
  }
};
// POST send OTP -changeemail
export const sendEmailOtp=async(req,res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('OTP to change Email: ', otp);

  const user = await User.findById(req.session.userId);
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min
  await user.save();

  await sendOtpEmail(email, `Your OTP is ${otp}`);
  
  res.json({success:true,message:'OTP sent to new email'});
}

// verify OTP-update email
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Enter a valid email!" });
    }
    if (!otp) {
      return res.status(400).json({ success: false, message: "Enter the OTP!" });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }
    if (String(user.otp) !== String(otp) || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    user.email = email;
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ success: true, message: "Email updated successfully" });

  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
}
export const getChangePassword=async(req,res)=>{
 try {
    const user = await User.findById(req.session.userId);
    res.render('user/changePassword',{user});
  } catch (err) {
    console.error(err);
    res.redirect('/profile')
  }}

//pwd change
export const changePassword = async (req, res) => {
  try {
    const { currentPassword,newPassword } = req.body;
    const user = await User.findById(req.session.userId);

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to update password' });
  }
};
