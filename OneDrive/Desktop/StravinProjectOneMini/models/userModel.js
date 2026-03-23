import mongoose from "mongoose";
const userSchema=new mongoose.Schema({
  name:{
    type:String,
    required:[true,'Name is required']
  },
  email:{
    type:String,
    required:[true,'Email is required'],
    unique:true
  },
  mobile:{
    type:String,
    unique:true,
    match: [/^\d{10}$/, "Mobile number must be 10 digits"],
    sparse:true
  },
  password:{
    type:String
  },
  //google SSO 
 googleId: {
  type:String,
  sparse:true,
  unique:true
  },
   otp: String,
    otpExpires: Date,

    isVerified: {
    type: Boolean,
    default: false,
    },

    resetOtp: String,
    resetOtpExpires: Date,
    resetOtpVerified: {
      type: Boolean,
      default: false,
    },
    resetToken: String,
    resetTokenExpires: Date,

    isBlocked: {
    type: Boolean,
    default: false,
    },
    profileImage:{
      type:String,
      default:''
    },

},
  { timestamps: true }
)
const User = mongoose.model('UserModel',userSchema)
export default User;