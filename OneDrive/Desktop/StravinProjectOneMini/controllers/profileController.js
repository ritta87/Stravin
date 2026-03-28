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
  


export const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, message: "Email required" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
console.log('OTP to change Email : ',otp)
    req.session.emailOTP = otp;
    req.session.newEmail = email;
    req.session.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 mins

  await sendOtpEmail(email,otp)  
    res.json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error sending OTP" });
  }
};


export const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.session.userId;

    if (!otp) {
      return res.json({ success: false, message: "OTP required" });
    }

   
    if (Date.now() > req.session.otpExpiry) {
      return res.json({ success: false, message: "OTP expired" });
    }
    if (otp !== req.session.emailOTP) {
      return res.json({ success: false, message: "Invalid OTP" });
    }
    await User.findByIdAndUpdate(userId, {
      email: req.session.newEmail
    })
    req.session.emailOTP = null;
    req.session.newEmail = null;
    req.session.otpExpiry = null;

    res.json({success:true,message:"Email updated successfully" });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error verifying OTP" });
  }
};


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
