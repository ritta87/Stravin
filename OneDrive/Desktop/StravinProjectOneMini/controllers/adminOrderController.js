import {getAllOrdersService,viewOrderDetailsService,
  updateStatusService,handleReturnRequestService} from "../services/adminOrderService.js";

export const getAllOrders = async (req, res) => {
  try {
    const result = await getAllOrdersService(req);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    return res.render("admin/usersOrders", result.data);
  } catch (error) {
    console.log(error);
    return res.json({success: false,message: "Server error!"})
  }
}

export const viewOrderDetails = async (req, res) => {
  try {
    const result = await viewOrderDetailsService(req);

    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }

    return res.render("admin/adminViewOrder", result.data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Server error at order fetching"})
  }
}

export const updateStatus = async (req, res) => {
  try {
    const result = await updateStatusService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({success: false,message: "Server error at order"})
  }
}

export const handleReturnRequest = async (req, res) => {
  try {
    const result = await handleReturnRequestService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({success: false,message: "Server error"})
  }
}