import { placeOrderService, getOrderSuccessService, getUserOrdersService,
  getOrderDetailsService,cancelItemService,returnRequestService,downloadInvoiceService,
  verifyPaymentService,getOrderFailureService,paymentFailedService,retryPaymentService
} from "../services/orderService.js";

export const placeOrder = async (req, res) => {
  try {
    const result = await placeOrderService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.error("placeOrder controller error:", error);
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

export const getOrderSuccess = async (req, res) => {
  try {
    const result = await getOrderSuccessService(req);
    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }
    return res.render("user/orderSuccess", { order: result.order });
  } catch (error) {
    console.error("getOrderSuccess controller error:", error);
    return res.redirect("/");
  }
}

export const getUserOrder = async (req, res) => {
  try {
    const result = await getUserOrdersService(req);
    if (!result.success) {
      return res.redirect("/login");
    }
    return res.render("user/orders", {
      orders: result.orders,
      search: result.search
    });
  } catch (error) {
    console.error("getUserOrder controller error:", error)
    return res.redirect("/");
  }
}

export const getOrderDetails = async (req, res) => {
  try {
    const result = await getOrderDetailsService(req);
    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }
    return res.render("user/viewOrderDetails", { order: result.order });
  } catch (error) {
    console.error("getOrderDetails controller error:", error);
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

export const cancelItem = async (req, res) => {
  try {
    const result = await cancelItemService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.error("cancelItem controller error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export const returnRequest = async (req, res) => {
  try {
    const result = await returnRequestService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.error("returnRequest controller error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export const downloadInvoice = async (req, res) => {
  try {
    await downloadInvoiceService(req, res);
  } catch (error) {
    console.error("downloadInvoice controller error:", error);
    return res.status(500).send("Error generating invoice");
  }
}

export const verifyPayment = async (req, res) => {
  try {
    const result = await verifyPaymentService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.error("verifyPayment controller error:", error);
    return res.status(500).json({success: false,message: "Server error in payment verification"});
  }
}

export const getOrderFailure = async (req, res) => {
  try {
    const result = await getOrderFailureService(req);
    return res.render("user/orderFailure", {
      orderId: result.orderId,
      razorpayKey: result.razorpayKey
    });
  } catch (error) {
    console.error("getOrderFailure controller error:", error);
    return res.status(500).send("Server error");
  }
}

export const paymentFailed = async (req, res) => {
  try {
    const result = await paymentFailedService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.error("paymentFailed controller error:", error);
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

export const retryPayment = async (req, res) => {
  try {
    const result = await retryPaymentService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.error("retryPayment controller error:", error);
    return res.status(500).json({success: false,message: "Retry payment failed"})
  }
}