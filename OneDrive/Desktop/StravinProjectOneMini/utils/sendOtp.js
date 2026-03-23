import dotenv from 'dotenv'
import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp) => {
  try{
  const transporter = nodemailer.createTransport({
    service: "gmail",
    port:587,
    secure:false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })


  const info = await transporter.sendMail({
    from:process.env.EMAIL_USER,
    to:email,
    subject:"Verify Your Account",
    text:`Your OTP is ${otp}`,
    html:`<p>Your OTP is : <b> ${otp}</b></p>`
  })
  return info.accepted.length>0
}catch(error){
  console.log("Error while sending Email",error)
}
  
}
