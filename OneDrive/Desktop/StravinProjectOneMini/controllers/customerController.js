import mongoose from "mongoose"
import User from "../models/userModel.js"



//get Customer Page
export const getAllCustomers = async (req, res) => {
  try {
       const search = req.query.search || "";
       const status=req.query.status||"";
       const page=parseInt(req.query.page)
       const limit=10
       const skip=(page-1)*limit
        let filter = {}
    if (search) { 
      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }
    
if(status==='active'){
    filter.isBlocked=false
}else if(status==='blocked'){
    filter.isBlocked=true
}
const totalUsers=await User.countDocuments(filter)

 const customers = await User.find(filter).sort({createdAt:-1}).skip(skip).limit(limit)

 const totalPages=Math.ceil(totalUsers/limit)

 res.render("customers", { customers, search,status,currentPage:page,totalPages })

  } catch (error) {
    console.error(error)
    res.status(500).send("Server error")
  }
}
//block customer
export const blockCustomer=async(req,res)=>{
    try{
    await User.findByIdAndUpdate(req.params.id,{isBlocked:true})
    return res.json({success:true,message:'User Blocked'})
}catch(error){
console.log(error)
 res.status(500).json({success:false,message:"server error"})
}
}
//unblock customer
export const unblockcustomer=async(req,res)=>{
    try{
    await User.findByIdAndUpdate(req.params.id,{isBlocked:false})
    return res.json({success:true,message:'User Unblocked!'})
    }catch(error){
        console.log(error)
        res.status(500).json({success:false,message:"Server error.."})
    }
}

