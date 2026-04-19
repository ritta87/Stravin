import {getAllCustomersService,
  blockCustomerService,
  unblockCustomerService
} from "../services/customerService.js";

export const getAllCustomers = async (req, res) => {
  try {
    const result = await getAllCustomersService(req);
    return res.render("admin/customers", result.data);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
}

export const blockCustomer = async (req, res) => {
  try {
    const result = await blockCustomerService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "server error"})
  }
}

export const unblockcustomer = async (req, res) => {
  try {
    const result = await unblockCustomerService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,message: "Server error.."})
  }
}