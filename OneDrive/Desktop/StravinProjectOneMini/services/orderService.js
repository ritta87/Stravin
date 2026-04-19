import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import PDFDocument from "pdfkit";
import Razorpay from "razorpay";

import Cart from "../models/cartModel.js";
import Address from "../models/addressModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Variant from "../models/variantModel.js";
import User from "../models/userModel.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

function generateOrderId() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD${y}${m}${d}-${random}`;
}

function calculateCartTotals(cart) {
  const subTotal = cart.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const tax = Math.round(subTotal * 0.05);
  const shipping = 50;
  const discount = cart.discountAmount || 0;
  const totalAmount = subTotal + tax + shipping;
  const finalTotal = Math.max(0, totalAmount - discount);

  return { subTotal, tax, shipping, discount, totalAmount, finalTotal };
}

async function buildOrderItems(cart) {
  const orderItems = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    const variant = await Variant.findById(item.variant);

    if (!product || !variant) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid item in cart"
      };
    }

    if (variant.stockQuantity < item.quantity) {
      return {
        success: false,
        statusCode: 400,
        message: `${product.productname} has insufficient stock`
      };
    }

    orderItems.push({
      product: product._id,
      variant: variant._id,
      name: product.productname,
      color: variant.color,
      image: variant.images?.[0] || "",
      price: item.price,
      quantity: item.quantity,
      itemStatus: "Placed",
      statusHistory: [{ status: "Placed", date: new Date() }]
    });
  }

  return { success: true, orderItems };
}

async function reduceStockFromCart(cart) {
  for (const item of cart.items) {
    const variant = await Variant.findById(item.variant);
    if (variant) {
      variant.stockQuantity -= item.quantity;
      await variant.save();
    }
  }
}

async function restoreStockForItem(item) {
  const variant = await Variant.findById(item.variant);
  if (variant) {
    variant.stockQuantity += item.quantity;
    await variant.save();
  }
}

async function clearCart(cart) {
  cart.items = [];
  cart.grandTotal = 0;
  cart.finalTotal = 0;
  cart.discountAmount = 0;
  cart.coupon = undefined;
  cart.isLocked = false;
  await cart.save();
}

function verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return generatedSignature === razorpay_signature;
}

function isCancelableStatus(status) {
  return !["Delivered", "Cancelled", "Returned"].includes(status);
}

export const placeOrderService = async (req) => {
  const userId = req.session.userId;
  const { addressId, paymentMethod } = req.body;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  if (!addressId) {
    return { success: false, statusCode: 400, message: "Address not selected" };
  }

  if (!["COD", "ONLINE", "WALLET"].includes(paymentMethod)) {
    return { success: false, statusCode: 400, message: "Invalid payment method" };
  }

  const address = await Address.findById(addressId);
  if (!address) {
    return { success: false, statusCode: 400, message: "Address not found" };
  }

  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    return { success: false, statusCode: 400, message: "Cart is empty" };
  }

  const totals = calculateCartTotals(cart);
  const builtItems = await buildOrderItems(cart);
  if (!builtItems.success) return builtItems;

  const baseOrderData = {
    orderId: generateOrderId(),
    userId,
    items: builtItems.orderItems,
    subTotal: totals.subTotal,
    tax: totals.tax,
    shipping: totals.shipping,
    discount: totals.discount,
    totalAmount: totals.totalAmount,
    finalTotal: totals.finalTotal,
    address: {
      name: address.name,
      mobile: address.mobile,
      address: address.address,
      area: address.area,
      house: address.house,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark
    },
    coupon: cart.coupon?.code ? { code: cart.coupon.code } : undefined,
    statusHistory: [{ status: "Placed", date: new Date() }]
  };

  if (paymentMethod === "COD") {
    const order = await Order.create({
      ...baseOrderData,
      paymentMethod: "COD",
      paymentStatus: "Pending",
      status: "Placed"
    });

    await reduceStockFromCart(cart);
    await clearCart(cart);

    return {
      success: true,
      statusCode: 200,
      payment: "COD",
      orderId: order.orderId
    };
  }

  if (paymentMethod === "WALLET") {
    const user = await User.findById(userId);
    if (!user || user.wallet < totals.finalTotal) {
      return {
        success: false,
        statusCode: 400,
        message: "Insufficient wallet balance"
      };
    }

    const order = await Order.create({
      ...baseOrderData,
      paymentMethod: "WALLET",
      paymentStatus: "Success",
      status: "Placed"
    });

    user.wallet -= totals.finalTotal;
    user.walletHistory.push({
      amount: totals.finalTotal,
      type: "debit",
      reason: `Order Payment - ${order.orderId}`,
      date: new Date()
    });
    await user.save();

    await reduceStockFromCart(cart);
    await clearCart(cart);

    return {
      success: true,
      statusCode: 200,
      payment: "WALLET",
      orderId: order.orderId
    };
  }

  if (paymentMethod === "ONLINE") {
    const order = await Order.create({
      ...baseOrderData,
      paymentMethod: "ONLINE",
      paymentStatus: "Pending",
      status: "Pending"
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: totals.finalTotal * 100,
      currency: "INR",
      receipt: order.orderId
    });

    return {
      success: true,
      statusCode: 200,
      payment: "ONLINE",
      orderId: order.orderId,
      razorpay: razorpayOrder,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    };
  }

  return {
    success: false,
    statusCode: 400,
    message: "Unable to place order"
  };
};

export const getOrderSuccessService = async (req) => {
  const userId = req.session.userId;
  const { orderId } = req.params;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  const order = await Order.findOne({ orderId, userId }).populate("items.product");
  if (!order) {
    return { success: false, statusCode: 404, message: "Order not found" };
  }

  return {
    success: true,
    order
  };
};

export const getUserOrdersService = async (req) => {
  const userId = req.session.userId;
  const search = req.query.search?.trim() || "";

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  const query = { userId };

  if (search) {
    query.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { "items.name": { $regex: search, $options: "i" } }
    ];
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .populate("items.product")
    .populate("items.variant");

  return {
    success: true,
    orders,
    search
  };
};

export const getOrderDetailsService = async (req) => {
  const userId = req.session.userId;
  const orderId = req.params.orderId || req.params.id;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  const order = await Order.findOne({ orderId, userId })
    .populate("items.product")
    .populate("items.variant");

  if (!order) {
    return { success: false, statusCode: 404, message: "Order not found" };
  }

  return {
    success: true,
    order
  };
};

export const cancelItemService = async (req) => {
  const userId = req.session.userId;
  const { orderId, itemId } = req.body;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  const order = await Order.findOne({ orderId, userId });
  if (!order) {
    return { success: false, statusCode: 404, message: "Order not found" };
  }

  const item = order.items.id(itemId);
  if (!item) {
    return { success: false, statusCode: 404, message: "Item not found" };
  }

  if (!isCancelableStatus(item.itemStatus)) {
    return {
      success: false,
      statusCode: 400,
      message: "This item cannot be cancelled"
    };
  }

  item.itemStatus = "Cancelled";
  item.statusHistory.push({
    status: "Cancelled",
    date: new Date()
  });

  await restoreStockForItem(item);

  if (["ONLINE", "WALLET"].includes(order.paymentMethod)) {
    item.isRefunded = true;
    item.refundDetails = {
      amount: item.price * item.quantity,
      method: "Wallet",
      date: new Date()
    };

    const user = await User.findById(userId);
    if (user) {
      user.wallet += item.price * item.quantity;
      user.walletHistory.push({
        amount: item.price * item.quantity,
        type: "credit",
        reason: `Refund for cancelled item - ${order.orderId}`,
        date: new Date()
      });
      await user.save();
    }
  }

  const activeItems = order.items.filter(
    (product) => !["Cancelled", "Returned"].includes(product.itemStatus)
  );

  if (activeItems.length === 0) {
    order.status = "Cancelled";
    if (["ONLINE", "WALLET"].includes(order.paymentMethod)) {
      order.paymentStatus = "Refunded";
    }
    order.statusHistory.push({
      status: "Cancelled",
      date: new Date()
    });
  }

  await order.save();

  return {
    success: true,
    statusCode: 200,
    message: "Item cancelled successfully"
  };
};

export const returnRequestService = async (req) => {
  const userId = req.session.userId;
  const { orderId, itemId, reason } = req.body;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  if (!reason || !reason.trim()) {
    return {
      success: false,
      statusCode: 400,
      message: "Return reason is required"
    };
  }

  const order = await Order.findOne({ orderId, userId });
  if (!order) {
    return { success: false, statusCode: 404, message: "Order not found" };
  }

  const item = order.items.id(itemId);
  if (!item) {
    return { success: false, statusCode: 404, message: "Item not found" };
  }

  if (item.itemStatus !== "Delivered") {
    return {
      success: false,
      statusCode: 400,
      message: "Return can be requested only for delivered items"
    };
  }

  if (item.return?.isRequested) {
    return {
      success: false,
      statusCode: 400,
      message: "Return already requested for this item"
    };
  }

  item.return = {
    isRequested: true,
    reason: reason.trim(),
    requestDate: new Date(),
    status: "Requested"
  };

  await order.save();

  return {
    success: true,
    statusCode: 200,
    message: "Return request submitted successfully"
  };
};

export const downloadInvoiceService = async (req, res) => {
  const userId = req.session.userId;
  const { orderId } = req.params;

  if (!userId) {
    return res.status(401).send("Login required");
  }

  const order = await Order.findOne({ orderId, userId })
    .populate("userId", "name email")
    .populate("items.product", "productname");

  if (!order) {
    return res.status(404).send("Order not found");
  }

  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${order.orderId}.pdf`
  );

  doc.pipe(res);

  doc.fontSize(20).text("Stravin Invoice", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Order ID: ${order.orderId}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`);
  doc.text(`Customer: ${order.userId?.name || "User"}`);
  doc.text(`Email: ${order.userId?.email || "-"}`);
  doc.moveDown();

  doc.fontSize(13).text("Shipping Address", { underline: true });
  doc.fontSize(11).text(`${order.address?.name || ""}`);
  doc.text(`${order.address?.house || ""}, ${order.address?.address || ""}`);
  doc.text(`${order.address?.area || ""}, ${order.address?.city || ""}`);
  doc.text(`${order.address?.state || ""} - ${order.address?.pincode || ""}`);
  doc.text(`Mobile: ${order.address?.mobile || "-"}`);
  if (order.address?.landmark) {
    doc.text(`Landmark: ${order.address.landmark}`);
  }

  doc.moveDown();
  doc.fontSize(13).text("Items", { underline: true });
  doc.moveDown(0.5);

  order.items.forEach((item, index) => {
    const lastStatusDate =
      item.statusHistory?.length > 0
        ? item.statusHistory[item.statusHistory.length - 1]?.date
        : null;

    doc.fontSize(11).text(
      `${index + 1}. ${item.name || item.product?.productname || "Product"}`
    );
    doc.text(`Color: ${item.color || "-"}`);
    doc.text(`Quantity: ${item.quantity}`);
    doc.text(`Price: ₹${item.price}`);
    doc.text(`Status: ${item.itemStatus}`);

    if (lastStatusDate) {
      doc.text(
        `Last Updated: ${new Date(lastStatusDate).toLocaleDateString("en-IN")}`
      );
    }

    if (item.isRefunded && item.refundDetails && order.paymentMethod !== "COD") {
      doc.text(`Refund Amount: ₹${item.refundDetails.amount || 0}`);
      doc.text(`Refund Method: ${item.refundDetails.method || "Wallet"}`);
      if (item.refundDetails.date) {
        doc.text(
          `Refund Date: ${new Date(item.refundDetails.date).toLocaleDateString("en-IN")}`
        );
      }
    }

    doc.moveDown();
  });

  doc.moveDown();
  doc.fontSize(13).text("Payment Summary", { underline: true });
  doc.fontSize(11).text(`Subtotal: ₹${order.subTotal || 0}`);
  doc.text(`Tax: ₹${order.tax || 0}`);
  doc.text(`Shipping: ₹${order.shipping || 0}`);
  doc.text(`Discount: ₹${order.discount || 0}`);
  if (order.coupon?.code) {
    doc.text(`Coupon Code: ${order.coupon.code}`);
  }
  doc.text(`Final Total: ₹${order.finalTotal || 0}`);
  doc.text(`Payment Method: ${order.paymentMethod}`);
  doc.text(`Payment Status: ${order.paymentStatus}`);

  doc.end();
};

export const verifyPaymentService = async (req) => {
  const userId = req.session.userId;
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId
  } = req.body;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return {
      success: false,
      statusCode: 400,
      message: "Missing payment details"
    };
  }

  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    return {
      success: false,
      statusCode: 400,
      message: "Payment verification failed"
    };
  }

  const order = await Order.findOne({ orderId, userId });
  if (!order) {
    return { success: false, statusCode: 404, message: "Order not found" };
  }

  if (order.paymentStatus === "Success") {
    return {
      success: true,
      statusCode: 200,
      message: "Payment already verified",
      orderId: order.orderId
    };
  }

  order.paymentStatus = "Success";
  order.status = "Placed";
  order.statusHistory.push({
    status: "Placed",
    date: new Date()
  });

  order.items.forEach((item) => {
    item.itemStatus = "Placed";
    item.statusHistory.push({
      status: "Placed",
      date: new Date()
    });
  });

  await order.save();

  const cart = await Cart.findOne({ userId });
  if (cart && cart.items.length > 0) {
    await reduceStockFromCart(cart);
    await clearCart(cart);
  }

  return {
    success: true,
    statusCode: 200,
    message: "Payment verified successfully",
    orderId: order.orderId
  };
};

export const getOrderFailureService = async (req) => {
  const orderId = req.query.orderId || req.params.orderId || "";

  return {
    success: true,
    orderId,
    razorpayKey: process.env.RAZORPAY_KEY_ID
  };
};

export const paymentFailedService = async (req) => {
  const userId = req.session.userId;
  const { orderId, error } = req.body;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  const order = await Order.findOne({ orderId, userId });
  if (!order) {
    return { success: false, statusCode: 404, message: "Order not found" };
  }

  order.paymentStatus = "Failed";
  order.status = "Pending";
  order.failureReason =
    error?.description ||
    error?.reason ||
    error?.message ||
    "Payment failed";

  await order.save();

  return {
    success: true,
    statusCode: 200,
    message: "Payment failure recorded",
    orderId: order.orderId
  };
};

export const retryPaymentService = async (req) => {
  const userId = req.session.userId;
  const orderId = req.params.orderId || req.body.orderId;

  if (!userId) {
    return { success: false, statusCode: 401, message: "Login required" };
  }

  const order = await Order.findOne({ orderId, userId });
  if (!order) {
    return { success: false, statusCode: 404, message: "Order not found" };
  }

  if (order.paymentMethod !== "ONLINE") {
    return {
      success: false,
      statusCode: 400,
      message: "Retry is allowed only for online payment"
    };
  }

  if (order.paymentStatus === "Success") {
    return {
      success: false,
      statusCode: 400,
      message: "Order is already paid"
    };
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: order.finalTotal * 100,
    currency: "INR",
    receipt: `${order.orderId}-retry-${Date.now()}`
  });

  return {
    success: true,
    statusCode: 200,
    message: "Retry payment order created",
    orderId: order.orderId,
    razorpay: razorpayOrder,
    razorpayKey: process.env.RAZORPAY_KEY_ID
  }
}