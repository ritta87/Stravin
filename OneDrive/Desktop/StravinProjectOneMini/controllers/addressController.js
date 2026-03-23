import User from '../models/userModel.js'
import Address from '../models/addressModel.js'

export const getUserAddress = async(req,res)=>{
    const userId = req.session.userId;
    const user = await User.findById(userId)
    const addresses = await Address.find({userId})
    if(!user){
        return res.status(401).json({success:false,message:"Please Login first!"})
    }
    res.render('user/address',{addresses})

}
export const getAddAddress = async(req,res)=>{
    res.render('user/addAddress')
}
export const addUserAddress=async(req,res)=>{
try {
 const userId = req.session.userId;
 const {name,mobile,house, area, city, state,landmark,pincode,addressType}= req.body;

    await Address.create({userId,name,mobile,house,landmark,area, city, state, pincode,addressType})

    res.redirect('/profile/address');//back to address page

  } catch (error) {
    console.log("Add address error:", error);
    res.status(500).send("Server Error");
  }

}
//edit nd delete user address.
//get edit page by id
export const getEditAddress=async(req,res)=>{
  try{
    const addressId=req.params.id;
    const address = await Address.findById(addressId)
    res.render('user/editAddress',{address})
  }catch(error){
    res.status(500).json({success:false,message:"Server error!"})
  }
}
//edit
export const postEditAddress=async(req,res)=>{
  try{
  const addressId=req.params.id;
  const {name,mobile,address,house,city,area,state,pincode,addressType}=req.body;
  await Address.findByIdAndUpdate(addressId,req.body,{new:true})
  res.redirect('/profile/address?success=updated')
  }catch(error){
    console.log(error)
    res.status(500).json({success:false,message:"Error while editing address"})
  }
}

//delete address
export const deleteAddress=async(req,res)=>{
  try{
    const addressId=req.params.id;
    await Address.findByIdAndDelete(addressId)
    res.json({success:true,message:"Address deleted"})

  }catch(error){
    console.log(error)
    res.status(500).json({success:false,message:"error while deleting address"})
  }
}
//address default
export const setDefaultAddress=async(req,res)=>{
  try{
    const addressId=req.params.id;
    const userId = req.session.userId;
    const user=await User.findById(userId)
    if(!user){
      return res.status(401).json({success:false,message:"Please Login first"})
    }
    await Address.updateMany({userId},{$set:{isDefault:false}})
    await Address.findByIdAndUpdate(addressId,{isDefault:true});
    res.json({success:true});
  }catch(error){
    res.json({success:false,message:"Error!"})
  }
}
