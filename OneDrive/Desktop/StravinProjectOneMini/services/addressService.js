import User from "../models/userModel.js";
import Address from "../models/addressModel.js";

const validateAddressFields = ({
  name, mobile, house,area,city,state,pincode,address,landmark,addressType}) => {
  if (!name || !mobile || !pincode || !city || !state || !area || !addressType) {
    return { success: false, statusCode: 400, message: "All required fields must be filled" };
  }

  if (!/^[0-9]{10}$/.test(mobile)) {
    return { success: false, statusCode: 400, message: "Invalid mobile number" };
  }

  if (!/^[0-9]{6}$/.test(pincode)) {
    return { success: false, statusCode: 400, message: "Invalid pincode" };
  }

  return { success: true };
}

export const getUserAddressService = async (req) => {
  const userId = req.session.userId;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Please login first!" };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, statusCode: 401, message: "Please login first!" };
  }

  const addresses = await Address.find({ userId });
  return { success: true, addresses };
}

export const addUserAddressService = async (req) => {
  const userId = req.session.userId;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Please login first!" };
  }

  const {
    name, mobile,house,area,city,state,landmark,pincode,addressType,address} = req.body;

  const validation = validateAddressFields({
    name,mobile,house,area,city,state,pincode,address,landmark,addressType
  });

  if (!validation.success) return validation;

  await Address.create({
    userId,name,mobile,house,area,city,state,landmark,pincode,address,addressType
  })

  return { success: true, statusCode: 201, message: "Address added successfully" };
}

export const getEditAddressService = async (req) => {
  const userId = req.session.userId;
  const addressId = req.params.id;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Please login first!" };
  }

  const address = await Address.findOne({ _id: addressId, userId });

  if (!address) {
    return { success: false, statusCode: 404, message: "Address not found" };
  }

  return { success: true, address };
}

export const postEditAddressService = async (req) => {
  const userId = req.session.userId;
  const addressId = req.params.id;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Please login first!" };
  }

  const {name,mobile,address,house,city,area,state,pincode,landmark,addressType} = req.body;

  if (!name || !mobile || !pincode || !city || !state || !address || !area || !landmark || !addressType) {
    return { success: false, statusCode: 400, message: "All fields required" };
  }

  if (!/^[0-9]{10}$/.test(mobile)) {
    return { success: false, statusCode: 400, message: "Invalid mobile number" };
  }

  if (!/^[0-9]{6}$/.test(pincode)) {
    return { success: false, statusCode: 400, message: "Invalid pincode" };
  }

  const updatedAddress = await Address.findOneAndUpdate(
    { _id: addressId, userId },
    {
      name,mobile,address,house,city,area,state,pincode,landmark,addressType
    },
    { new: true }
  )

  if (!updatedAddress) {
    return { success: false, statusCode: 404, message: "Address not found" };
  }

  return { success: true, statusCode: 200, message: "Address updated successfully" };
}

export const deleteAddressService = async (req) => {
  const userId = req.session.userId;
  const addressId = req.params.id;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Please login first!" };
  }

  const deletedAddress = await Address.findOneAndDelete({ _id: addressId, userId });

  if (!deletedAddress) {
    return { success: false, statusCode: 404, message: "Address not found" };
  }

  return { success: true, statusCode: 200, message: "Address deleted" };
}

export const setDefaultAddressService = async (req) => {
  const addressId = req.params.id;
  const userId = req.session.userId;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Please login first" };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, statusCode: 401, message: "Please login first" };
  }

  const address = await Address.findOne({ _id: addressId, userId });
  if (!address) {
    return { success: false, statusCode: 404, message: "Address not found" };
  }

  await Address.updateMany({ userId }, { $set: { isDefault: false } });
  await Address.findByIdAndUpdate(addressId, { isDefault: true });

  return { success: true, statusCode: 200, message: "Default address updated" };
}