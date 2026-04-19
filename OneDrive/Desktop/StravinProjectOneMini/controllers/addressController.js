import {getUserAddressService,addUserAddressService,getEditAddressService,
  postEditAddressService,deleteAddressService,setDefaultAddressService} from "../services/addressService.js";

export const getUserAddress = async (req, res) => {
  try {
    const result = await getUserAddressService(req);

    if (!result.success) {
      return res.status(result.statusCode || 401).json(result);
    }

    return res.render("user/address", { addresses: result.addresses });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export const getAddAddress = async (req, res) => {
  return res.render("user/addAddress");
}

export const addUserAddress = async (req, res) => {
  try {
    const result = await addUserAddressService(req);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    return res.redirect("/profile/address");
  } catch (error) {
    console.log("Add address error:", error);
    return res.status(500).send("Server Error");
  }
}

export const getEditAddress = async (req, res) => {
  try {
    const result = await getEditAddressService(req);

    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }

    return res.render("user/editAddress", { address: result.address });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error!" });
  }
}

export const postEditAddress = async (req, res) => {
  try {
    const result = await postEditAddressService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Error while editing address" });
  }
}

export const deleteAddress = async (req, res) => {
  try {
    const result = await deleteAddressService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Error while deleting address" });
  }
}

export const setDefaultAddress = async (req, res) => {
  try {
    const result = await setDefaultAddressService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error!" });
  }
}