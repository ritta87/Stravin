import Order from "../models/orderModel.js";
import User from "../models/userModel.js";

const allowedTransitions = {
  Placed: ["Shipped", "Cancelled"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: ["Returned"],
  Cancelled: [],
  Returned: []
}

function normalizeCurrentStatus(status) {
  let currentStatus = status?.trim();

  if (currentStatus === "Paid" || currentStatus === "Pending") {
    currentStatus = "Placed";
  }

  return currentStatus;
}

function calculateOverallOrderStatus(items) {
  const statuses = items.map((i) => i.itemStatus);

  if (statuses.every((s) => s === "Cancelled")) return "Cancelled";
  if (statuses.every((s) => s === "Returned")) return "Returned";
  if (statuses.every((s) => s === "Delivered")) return "Delivered";
  if (statuses.some((s) => s === "Out for Delivery")) return "Out for Delivery";
  if (statuses.some((s) => s === "Shipped")) return "Shipped";

  return "Placed";
}

export const getAllOrdersService = async (req) => {
  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const search = req.query.search;
  const status = req.query.status;

  let filter = {};

  if (search && search.trim() !== "") {
    filter.$or = [
      { orderId: search.trim() },
      { orderId: { $regex: search.trim(), $options: "i" } }
    ];
  }

  if (status && status.trim() !== "") {
    filter.status = status;
  }

  const totalOrders = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId");

  return {
    success: true,
    data: {
      orders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      search: search || "",
      statusFilter: status || ""
    }
  }
}

export const viewOrderDetailsService = async (req) => {
  const orderId = req.params.orderId;

  const order = await Order.findOne({ orderId }).populate("userId");

  if (!order) {
    return {
      success: false,
      statusCode: 404,
      message: "Order not found!"
    };
  }

  return {
    success: true,
    data: { order }
  }
}

export const updateStatusService = async (req) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body;

  const order = await Order.findOne({ orderId });
  if (!order) {
    return {
      success: false,
      statusCode: 404,
      message: "Order not found"
    }
  }

  const item = order.items.id(itemId);
  if (!item) {
    return {
      success: false,
      statusCode: 404,
      message: "Item not found"
    }
  }

  const currentStatus = normalizeCurrentStatus(item.itemStatus);
  const nextStatus = status?.trim();

  if (!nextStatus) {
    return {
      success: false,
      statusCode: 400,
      message: "Next status is required"
    }
  }

  if (currentStatus === nextStatus) {
    return {
      success: false,
      statusCode: 400,
      message: "Status is already the same"
    }
  }

  if (
    !allowedTransitions[currentStatus] ||
    !allowedTransitions[currentStatus].includes(nextStatus)
  ) {
    return {
      success: false,
      statusCode: 400,
      message: `Cannot change from ${currentStatus} to ${nextStatus}`
    };
  }

  item.itemStatus = nextStatus;

  if (!item.statusHistory) {
    item.statusHistory = [];
  }

  item.statusHistory.push({
    status: nextStatus,
    date: new Date()
  });

  if (nextStatus === "Delivered") {
    order.paymentStatus = "Paid";

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: "Payment Completed",
      date: new Date()
    });
  }

  const isPaidOrder = order.paymentMethod !== "COD";

  if ((nextStatus === "Cancelled" || nextStatus === "Returned") && isPaidOrder) {
    if (!item.isRefunded) {
      const user = await User.findById(order.userId);
      const refundAmount = item.price * item.quantity;

      if (user) {
        user.wallet += refundAmount;
        user.walletHistory.push({
          amount: refundAmount,
          type: "credit",
          reason: `Refund for ${nextStatus} - Order ${order.orderId}`,
          date: new Date()
        });
        await user.save();
      }

      item.isRefunded = true;
      item.refundDetails = {
        amount: refundAmount,
        method: "Wallet",
        date: new Date()
      };
    }
  }

  if (
    order.items.every((i) => i.itemStatus === "Cancelled") ||
    order.items.every((i) => i.itemStatus === "Returned")
  ) {
    if (order.paymentMethod !== "COD") {
      order.paymentStatus = "Refunded";
    }
  }

  const previousOrderStatus = order.status;
  order.status = calculateOverallOrderStatus(order.items);

  if (previousOrderStatus !== order.status) {
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: order.status,
      date: new Date()
    });
  }

  order.markModified("items");
  await order.save();

  return {
    success: true,
    statusCode: 200,
    message: "Status updated successfully"
  };
};

export const handleReturnRequestService = async (req) => {
  const { orderId, itemId } = req.params;
  const { action, adminNote } = req.body;

  const order = await Order.findOne({ orderId });
  if (!order) {
    return {
      success: false,
      statusCode: 404,
      message: "Order not found"
    };
  }

  const item = order.items.id(itemId);
  if (!item || !item.return?.isRequested) {
    return {
      success: false,
      statusCode: 400,
      message: "No return request found"
    }
  }

  if (item.return.status !== "Pending") {
    return {
      success: false,
      statusCode: 400,
      message: "Return already processed"
    }
  }

  item.return.status = action;
  item.return.adminNote = adminNote || "";
  item.return.approvalDate = new Date();

  if (action === "Approved" && !item.isRefunded) {
    const user = await User.findById(order.userId);
    const refundAmount = item.price * item.quantity;

    if (user) {
      user.wallet += refundAmount;
      user.walletHistory.push({
        amount: refundAmount,
        type: "credit",
        reason: `Refund for returned item - Order ${order.orderId}`,
        date: new Date()
      });
      await user.save();
    }

    item.isRefunded = true;
    item.refundDetails = {
      amount: refundAmount,
      method: "Wallet",
      date: new Date()
    }
  }

  await order.save();

  return {
    success: true,
    statusCode: 200,
    message: `Return ${action.toLowerCase()} successfully`
  }
}