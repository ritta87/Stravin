import User from "../models/userModel.js";
import Coupon from '../models/couponModel.js'
import { sendOtpEmail } from "../utils/sendOtp.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Cart from '../models/cartModel.js'

// get signup page..
export const getSignupPage = (req, res) => {
  res.render("user/signup")
}

export const getVerifyOtp = (req,res)=>{
  if(!req.session.userId){
 return  res.redirect('/signup')
}
res.render('user/verifyOtp')
}
//post input , user signup..to otp verification
export const userSignup = async(req,res)=>{
  try{
    const {name,email,mobile,password,confirmpassword} = req.body
    if(!name||!email||!mobile||!password||!confirmpassword){
      return  res.status(400).json({success: false,
        message: "All fields are required!",
      })
    }
    if(password !== confirmpassword){
      return  res.status(400).json({success: false,message: "Password do not match!",})
    }
    const existingUser = await User.findOne({email})
    if(existingUser){
      return  res.status(400).json({
        success: false,
        message: "EmailId alredy exists!",
      });
    }
    const existingMobile = await User.findOne({mobile})
    if(existingMobile){
      return  res.status(400).json({
        success: false,
        message: "Mobile number already exists!",
      });
    }
const hashedPassword = await bcrypt.hash(password,10);

    const user = await User.create({
      name,email,mobile,password:hashedPassword
    })
    // create otp..
    const otp = Math.floor(100000+Math.random()*900000).toString()  // 6 digit otp
    user.otp = otp
    user.otpExpires = Date.now()+1*60*1000
    
    await user.save()
    await sendOtpEmail(user.email,user.otp)

    //store userId in session,
    req.session.userId=user._id;
    req.session.cookie.maxAge=5*60*10000
    res.status(200).json({
      success: true,
      message: "Signup successful! OTP sent to your Email!",
      redirect:"/verifyOtp"
    });
   
    console.log("OTP sent : ",otp)
  }
  catch(error){
    console.log('signup error',error)
    return res.status(500).json({ success: false,
      message: "Oops!!Server failure!",
    });
  }
}
// verifu user otp
export const verifyOtp = async(req,res)=>{
  try{
    const userId = req.session.userId
    const user = await User.findById(userId)
    if(!userId){
      return res.json({success:false,message:"Session Expired!!"})
    }
    if(!user){
      return res.json({success:false,message:"User not found!"})
    }
    const {otp}=req.body;
    if(user.otp!==otp){
      return res.json({success:false,message:"Invalid OTP"})
    }
    if(user.otpExpires<Date.now()){
      return res.json({success:false,message:"OTP expired!"})
    }
    user.isVerified = true
    user.otp = null
    user.otpExpires = null
    await user.save()
    req.session.userId=null //user saved, clear session.
    res.json({success:true,message:"OTP verified successfully!"})


  }catch(error){
    console.log(error)
    res.json({success:false,message:"Oops!Server failure!"})
  }
}
//otp resending after 60 sec.
export const resendOtp = async(req,res)=>{
  try{
  const userId = req.session.userId
  //console.log(userId)
  if(!userId){
    return res.json({success:false,message:"Session expired!"})
  }
  const user = await User.findById(userId)
  if(!user){
    return res.status(400).json({success:false,message:"No such User exists!"})
  }
//generate new otp..
const newOtp = Math.floor(100000+Math.random()*900000).toString()
const otpExpires = Date.now()+1*60*1000 // 1min.

user.otp=newOtp
user.otpExpires=otpExpires
await user.save()
//send otp email
await sendOtpEmail(user.email,newOtp)
 res.status(200).json({
  success:true,
  message:"OTP Resent successfully"})
console.log('Otp Resent :',newOtp)
  }
  
  catch(error){
    console.log(error)
    return res.status(500).json({success:false,message:"Server Error while resenting OTP!"})
  }
}

//get login page
export const getLoginPage = async (req, res) => {
  const error=req.query.error
  res.render('user/login',{error});
}

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({success:false,message:"All fields are required!!" });
    }

    // find user by email from DB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({success:false, message:"No such user found!" });
    }

    //Block check
    if (user.isBlocked) {
      return res.status(403).json({success: false,blocked:true, 
      message:"Your account has been blocked by admin" });
    }

    if (!user.isVerified) {
      return res.status(400).json({success:false,message:"Please verify your Email" });
    }

    const isMatching = await bcrypt.compare(password, user.password);
    if (!isMatching) {
      return res.status(400).json({success: false,message:"Invalid Credentials!" });
    }

    // session storing of user
    req.session.userId = user._id;

    req.session.isLoggedIn = true;


    return res.status(200).json({ success: true, message: "Login Successful!", redirect: '/' });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error during logIn!" });
  }
}


//user forgot password..
export const getForgotPassword=async(req,res)=>{
  res.render('user/forgotPassword')
}
export const forgotPassword = async(req,res)=>{
  try{
      const {email} =req.body
      const user = await User.findOne({email})
      if(!user){
        return res.status(400).json({success:false,message:"No such user found!"})
      }
      
    //reset otp generate...
    const otp = Math.floor(100000+Math.random()*900000).toString()
    const expires = Date.now()+60*1000//1 min.
    user.resetOtp=otp
    user.resetOtpExpires=expires
    user.resetOtpVerified=false
    await user.save()
    await sendOtpEmail(user.email,otp)
    console.log('Reset OTP is :',otp)
      res.json({success:true,message:"OTP sent to your Email"})

  }catch(error){
    console.log(error)
    res.status(500).json({message:"Server error cant sent otp!"})
  }

}
//otp verify and generating temp reset token(10min)
export const verifyResetOtp = async(req,res)=>{
  try{
    const {email,otp}=req.body
    const user = await User.findOne({email})
    if(!user){
      return res.status(400).json({success:false,message:"No user Found!"})
    }
    if(user.resetOtp!==otp){
     return res.status(400).json({success:false,message:"Invalid OTP"})
    }
    if(user.resetOtpExpires<Date.now()){
      return res.status(400).json({success:false,message:"Oops! OTP Expired!"})
    }
    
    const resetToken = jwt.sign(
      {id:user._id},
      process.env.RESET_TOKEN_SECRET,
      {expiresIn:'10m'}
    )

    user.resetOtpVerified=true
    user.resetToken=resetToken
    user.resetTokenExpires=Date.now()+10*60*1000 // 10 min.
    
    await user.save()
    res.json({success:true,message:"OTP Verified!",token:resetToken})

  }
  catch(error){
    res.status(500).json({success:false,message:"Server Issue!"})
  }
}
//reset password..
export const resetPassword = async(req,res)=>{
  try{
    const {email,otp,newPassword,confirmNewPassword} = req.body
    if(!email||!otp||!newPassword||!confirmNewPassword){
       return res.status(400).json({success: false,message: "All fields are required"})
    }
    if(newPassword!==confirmNewPassword){
     return res.status(400).json({success: false,message: "Passwords do not match"}) 
    }
    const user = await User.findOne({email})
    if(!user){
       return res.status(404).json({success: false,message: "User not found"})
    }
    
    if(user.resetOtpExpires<Date.now()){
       return res.status(400).json({success: false,message: "OTP has expired"})
    }
    const hashedPassword = await bcrypt.hash(newPassword,10)
    user.password=hashedPassword //hashing at schema
    //clear otp after resetting pwd
    user.resetOtp=null
    user.resetOtpExpires=null

    await user.save()
    return res.status(200).json({success: true,message: "Password reset successful"})

  }
  catch(error)
  {
    console.log("Reset password error!:", error);
    return res.status(500).json({success: false,message: "Server error"})
  }
}
//password reset 
export const getResetPassword = async(req,res)=>{
  const email = req.query.email
  res.render('user/resetPassword',{resetEmail:email})
}

//apply coupon------------------------------------------------
export const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { couponCode } = req.body;

      const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({success: false,message: "Cart not found"})
    }

    const newCode = couponCode.toUpperCase()

    if (cart.coupon && cart.coupon.code === newCode) {
  return res.status(400).json({success: false,message: "This coupon is already applied"})
}
  
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true
    })

    if (!coupon) {
      return res.status(400).json({success: false,message: "Invalid coupon"});
    }

  
    let subTotal = 0;
    cart.items.forEach((item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      subTotal += price * qty;
    });

    const tax = Math.round(subTotal * 0.05) || 0;
    const shipping = 50;

    const cartTotal = subTotal + tax + shipping;

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

    await cart.save();

    return res.json({success: true,discount: discount,
      finalTotal: finalTotal,
      couponCode: coupon.code
    })

  } catch (err) {
    console.error(err);
    return res.status(500).json({success: false,message: "Server error"})
  }
}


export const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({success: false,message: "Cart not found"});
    }

    // remove coupon
    cart.coupon = undefined;
    cart.discountAmount = 0;

    await cart.save();

    // recalculate total-without discount)
    let subTotal = 0;
    cart.items.forEach((item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      subTotal += price * qty;
    });

    const tax = Math.round(subTotal * 0.05) || 0;
    const shipping = 50;

    const finalTotal = subTotal + tax + shipping;

    return res.json({success: true,finalTotal})

  } catch (err) {
    console.error(err);
    res.status(500).json({success: false,message: "Error removing coupon"})
  }
}