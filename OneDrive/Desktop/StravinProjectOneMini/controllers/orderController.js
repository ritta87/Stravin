import dotenv from 'dotenv'
dotenv.config(); 
import Cart from '../models/cartModel.js'
import Address from '../models/addressModel.js'
import Order from '../models/orderModel.js'
import Product from '../models/productModel.js'
import Variant from '../models/variantModel.js'
import User from '../models/userModel.js'
import PDFDocument from 'pdfkit'
import Razorpay from 'razorpay'
import crypto from 'crypto'
function generateOrderId() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD${y}${m}${d}-${random}`;
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

//plac order..------------------------------------
export const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login" });
    }

const { addressId, paymentMethod } = req.body;
const selectedAddress = await Address.findById(req.body.addressId)
    if (!selectedAddress) {
      return res.json({ success: false, message: "Address not selected" })
    }

    if (!["COD", "ONLINE","WALLET"].includes(paymentMethod)) {
      return res.status(400).json({ success: false,message:"Invalid payment method"})
    }

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty or being Processed" });
    }
    const existsPendingOrder = await Order.findOne({userId,
      paymentStatus:"Pending",
      paymentMethod:"ONLINE",
      createdAt:{ $gte: new Date(Date.now() - 1 * 60 * 1000) } // last 1min.

    })
    if (existsPendingOrder && paymentMethod === "COD") {
    return res.json({success:false,message:"You already have pending Online Order!"})
  }
    let discount=0
    let appliedCoupon=null
    if(cart.coupon&&cart.coupon.code){
      discount = cart.discountAmount||0
      appliedCoupon = cart.coupon.code

    }
    
    const subTotal = cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const tax = Math.round(subTotal * 0.05)
    const shipping = 50
    const totalAmount = subTotal + tax + shipping
    const finalTotal = Math.max(0, totalAmount - discount);


    
    const orderItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      const variant = await Variant.findById(item.variant);

      if (!product || !variant) {
        return res.status(400).json({
          success: false,
          message: "Product or variant not found"
        });
      }

      orderItems.push({
        product: product._id,
        variant: variant._id,
        name: product.name,
        color: variant.color,
        image: variant.images?.[0] || '',
        price: item.price,
        quantity: item.quantity,
        itemStatus: paymentMethod === "COD" ? "Placed" : "Pending",
        return: {
          isRequested: false,
          reason: "",
          requestDate: null,
          status: "Pending"
        }
      })
    }
let couponData = {
  code:null,discountAmount:0
}
if(cart.coupon && cart.coupon.code){
  couponData.code = cart.coupon.code
  couponData.discountAmount=cart.discountAmount||0
}
    // order creation
    const order = await Order.create({
      orderId: generateOrderId(),
      userId,
      items: orderItems,
      subTotal,
      tax,
      shipping,
      coupon:couponData,
      discount,
      totalAmount,
      finalTotal,
      paymentMethod,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending",
      status: paymentMethod === "COD" ? "Placed" : "Pending",
      address:selectedAddress
    });

  
    if (paymentMethod === "COD") {
      // reduce stock
      for (const item of cart.items) {
        const variant = await Variant.findById(item.variant);
        variant.stockQuantity -= item.quantity;
        await variant.save();
      }
      // clear cart
      cart.items = [];
      cart.isLocked=false
      cart.coupon=undefined
      appliedCoupon=null
      cart.discountAmount=0
      cart.finalTotal=0
      cart.grandTotal = 0;
      await cart.save();
      return res.json({success: true,payment: "COD",orderId: order.orderId})
    }
//wallet payment..
// Wallet Payment Flow
if (paymentMethod === "WALLET") {
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    let discount = 0;
    let appliedCoupon = null;
    if (cart.coupon && cart.coupon.code) {
      discount = cart.discountAmount || 0;
      appliedCoupon = cart.coupon.code;
    }
    const finalTotal = Math.max(0, totalAmount - discount);

    if (user.wallet < finalTotal) {
      return res.json({success:false,message:"Insufficient wallet balance"});
    }

    const order = await Order.create({
      orderId: generateOrderId(),
      userId,
      items: orderItems,
      subTotal,
      tax,
      shipping,
      coupon: {
        code: appliedCoupon,
        discountAmount: discount
      },
      discount,
      totalAmount,
      finalTotal,
      paymentMethod: "WALLET",
      paymentStatus: "Paid",
      status: "Paid",
      address: selectedAddress
    });

    // wallet money reduce
    user.wallet -= finalTotal;
    user.walletHistory.push({
      amount: finalTotal,
      type: "Debit",
      reason: `Order Payment - ${order.orderId}`,
      date: new Date()
    });
    await user.save();

    // reduce stock
    for (const item of cart.items) {
      const variant = await Variant.findById(item.variant);
      variant.stockQuantity -= item.quantity;
      await variant.save();
    }

    // clear cart
    cart.items = [];
    cart.isLocked = false;
    cart.coupon = undefined;
    cart.discountAmount = 0;
    cart.finalTotal = 0;
    cart.grandTotal = 0;
    await cart.save();

    return res.json({success: true,
      payment: "WALLET",
      orderId: order.orderId,
      walletUsed: finalTotal,
      remainingWallet: user.wallet
    });

  } catch (error) {
    console.log("PlaceOrder Wallet Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Server error at wallet payment" });
    }
  }
}

  


if (paymentMethod === "ONLINE") {
  cart.isLocked = true;
  await cart.save();
}
    const razorpayOrder = await razorpay.orders.create({
      amount: finalTotal * 100,
      currency: "INR",
      receipt: order.orderId   
    });

    return res.json({success: true,payment: "ONLINE",
      razorpay: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount
      },
      orderId: order.orderId,addressId})

  } catch (err) {
    console.error("PlaceOrder Error:", err);
    return res.status(500).json({ success: false });
  }
}
//success page-------------------------------------------
export const getOrderSuccess=async(req,res)=>{
    try {  
    const orderId = req.params.orderId;
    const order = await Order.findOne({orderId}).populate('items.product')

    if(!order){
      return res.status(404).json({success:false,message:"Order not found!"})
    }
    res.render('user/orderSuccess',{order})
  } catch (error) {
    console.log(error);
   return  res.redirect('/');
  }
}
//get users order page.............................
export const getUserOrder=async(req,res)=>{
    try{
        const userId=req.session.userId;
        const search=req.query.search;
        const filter = {userId:req.session.userId}
        if(!userId){
            return res.redirect('/login')
        }
        if(search){
          filter.orderId={$regex:search,$options:"i"}
        }
        const orders=await Order.find(filter).sort({createdAt:-1}).populate("items.product").populate("items.variant")
        res.render('user/orders',{orders,search});
    }catch(error){
        console.log(error)
        res.redirect('/')
    }
}

//view order tracking-details-------------------
export const getOrderDetails=async(req,res)=>{
  const userId=req.session.userId;
  const orderId=req.params.orderId;
  const order=await Order.findOne({orderId,userId})
  .populate("items.product").populate("items.variant")
  if(!order){
    return res.status(404).json({success:false,message:"Order not found!!"})

  }
  res.render('user/viewOrderDetails',{order})
}
//cancel order---------------------------------------------
export const cancelItem = async (req, res) => {
  try {
    const {orderId,itemId} = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.json({ success: false, message: "Item not found" })
    }
    const user = await User.findById(order.userId);
  if (!user) {
  return res.status(404).json({success: false,message: "User not found"})
}
    //cancel after delivery,not possible
    if (item.itemStatus === "Delivered" ||item.itemStatus === "Cancelled" ||
      item.itemStatus === "Returned") {
      return res.status(400).json({success: false,message: "Cannot cancel this item"})
    }

    // item status updated
    item.itemStatus = "Cancelled";
      // status history
    if (!item.statusHistory) item.statusHistory = [];
    item.statusHistory.push({
      status: "Cancelled",
      date: new Date()
    })

    //Restore stock
    if (item.variant) {
      const variant = await Variant.findById(item.variant)
      if (variant) {
        variant.stockQuantity += item.quantity
        await variant.save()
      }
    }
//refund amount ,not to cod..online/wallet------
const isPaid = order.paymentMethod !== "COD";

if (isPaid && !item.isRefunded) {
  const user = await User.findById(order.userId);
  const refundAmount = item.price * item.quantity;

  user.wallet += refundAmount;
  user.walletHistory.push({
    amount:refundAmount,
    type:"credit",
    reason:`Refund for cancelled item - Order ${order.orderId}`,
    date:new Date()
  })

  await user.save()
  item.isRefunded = true;
  item.refundDetails = {
    amount: refundAmount,
    method: "Wallet",
    date: new Date()
  }
}
  

    //Update order status
  const prevStatus = order.status;

  const statuses = order.items.map(i => i.itemStatus);
  if (statuses.every(s => s === "Cancelled")) {
  order.status = "Cancelled";
}else if(statuses.every(s => s === "Returned")) {
  order.status = "Returned";
}else if(statuses.every(s => s === "Delivered")) {
  order.status = "Delivered";
}else if(statuses.some(s => s === "Out for Delivery")) {
  order.status = "Out for Delivery";
}else if(statuses.some(s => s === "Shipped")) {
  order.status = "Shipped";
}else{
  order.status = "Placed";
}
// payment staus update 
  const allCancelled = statuses.every((s) => s === "Cancelled");
    const allReturned = statuses.every((s) => s === "Returned");
    const anyRefunded = order.items.some((i) => i.isRefunded);

    if(allCancelled || allReturned){
      order.paymentStatus =
        order.paymentMethod !== "COD" ? "Refunded" : "Cancelled";
    }else if(order.paymentMethod !== "COD" && anyRefunded) {
      order.paymentStatus = "Partially Refunded";
    }
// cod
if(order.paymentMethod === "COD" && order.status === "Delivered"&&!allCancelled) {
  order.paymentStatus = "Paid";
}

// status-history
if (prevStatus !== order.status) {
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    status: order.status,
    date: new Date()
  });
}


await order.save(); 
   return res.json({success: true,message:"Item cancelled successfully"})

  } catch (err) {
    console.error(err);
    res.status(500).json({success:false,message:"Server error"})
  }
}
//item return req raising, if delivered.----------------------------------------
export const returnRequest = async (req, res) => {
  try {
    const {orderId, itemId} = req.params;
    const {reason} = req.body;
    const order = await Order.findOne({orderId});
    if (!order) return res.status(404).json({success:false,message:"Order not found"})

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({success:false,message:"Item not found"})

    if (item.itemStatus !== "Delivered") {
      return res.status(400).json({success:false,message:"Return allowed only after delivery"});
    }

    if (item.return?.isRequested) {
      return res.status(400).json({success:false,message:"Return already requested"})
    }

    // Set return request
    item.return = {
      isRequested: true,
      reason,
      requestDate: new Date(),
      status: "Pending",
      adminNote: "",
      approvalDate: null
    };

    await order.save();
    return res.json({success:true,message:"Return requested successfully"})

  } catch (err) {
    console.error(err);
    res.status(500).json({success:false,message:"Server error" })
  }
}

//invoice download.---------------------------------------------------
export const downloadInvoice = async (req, res) => {
  try {
    const {orderId} = req.params;

    const order = await Order.findOne({orderId:orderId}).populate('userId').populate("items.product")

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${order.orderId}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);
    doc.fontSize(20).text("INVOICE", { align: "center" });

    doc.moveDown();

    doc.fontSize(12).text(`Order ID: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.createdAt).toDateString()}`);
    doc.text(`Customer: ${order.userId?.name}`);
    doc.text(`Email: ${order.userId?.email}`);

    doc.moveDown();

    // Address
    doc.text("Shipping Address:");
    doc.text(`${order.address.name}`);
    doc.text(`${order.address.house}, ${order.address.area}`);
    doc.text(`${order.address.city}, ${order.address.state}`);
    doc.text(`Pincode: ${order.address.pincode}`);

    doc.moveDown();
    doc.text("Items:", { underline: true });

    order.items.forEach((item, i) => {
      doc.moveDown(0.5);
      doc.text(`${i + 1}. ${item.product?.productname}`);
      doc.text(`Qty: ${item.quantity}`);
      doc.text(`Price: ₹${item.price}`);
      doc.text(`Status: ${item.itemStatus}`);
    if (item.statusHistory && item.statusHistory.length > 0) {
    const latestStatus = item.statusHistory[item.statusHistory.length - 1];
    doc.text(`Last Update: ${latestStatus.status} on ${new Date(latestStatus.date).toDateString()}`);
    }
  if(item.itemStatus === "Returned") {
  if(item.isRefunded && order.paymentMethod !== "COD") {
    doc.text(`Refunded: ₹${(item.refundDetails?.amount || 0).toFixed(2)}`);
    doc.text(`Refund Method: ${item.refundDetails?.method || "Wallet"}`);

    if(item.refundDetails?.date){
      doc.text(`Refund Date: ${new Date(item.refundDetails.date).toDateString()}`);
    }
  }else{
    doc.text(`Refund Status: Pending`);
  }
}
})
doc.moveDown()
    doc.text(`Subtotal: ₹${order.subTotal}`);
    doc.text(`Tax: ₹${order.tax}`);
    doc.text(`Shipping: ₹${order.shipping}`);
    // Coupon applied
    if (order.coupon && order.coupon.code) {
    doc.text(`Coupon Applied: ${order.coupon.code}`);
    doc.text(`Discount: -₹${order.coupon.discountAmount || order.discount || 0}`);
    }
    doc.text(`Order Status: ${order.status}`);
    doc.fontSize(14).text(`Total: ₹${order.totalAmount}`, { bold: true });
    doc.text(`Payment Method: ${order.paymentMethod}`);


    doc.moveDown();
    doc.text("Thank you for shopping with us",{ align: "center" });
    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating invoice");
  }
}
//paynment verify-razorpay signature.-------------------------------------------
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId, addressId } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                                    .update(body.toString())
                                    .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Payment verification failed" });
    }

    // Update order status
    const order = await Order.findOne({ orderId });
    if (!order) return res.json({ success: false, message: "Order not found" });

    order.paymentStatus = "Paid";
    order.status = "Placed";
    await order.save();

    // Reduce stock
    for (const item of order.items) {
      const variant = await Variant.findById(item.variant);
      if (variant) {
        variant.stockQuantity -= item.quantity;
        await variant.save();
      }
    }

    // Clear cart
    const cart = await Cart.findOne({ userId: order.userId });
    if (cart) {
      cart.items = [];
      cart.grandTotal = 0;
      cart.coupon = undefined;
      cart.discountAmount = 0;
      cart.finalTotal = 0;
      cart.isLocked=true
      await cart.save();
    }

    return res.json({ success: true, orderId: order.orderId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error in payment verification" });
  }
}

//failure page-order---------------------------------------------
export const getOrderFailure = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findOne({orderId: orderId });

    res.render("user/orderFailure", {
      orderId: order?.orderId || null,
      razorpayKey: process.env.razorpay_key_id
})

  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
}
export const paymentFailed=async(req,res)=>{
  const {orderId, error} = req.body;

  await Order.findOneAndUpdate({orderId:orderId}, {status:"failed",
    failureReason: error.description
  })

  res.json({success:true})
}
//Retry payment again-razorpay----------------------
export const retryPayment = async(req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findOne({orderId})

    if (!order) {
      return res.status(404).json({success: false,message: "Order not found"});
    }

    //prevent retry if already paid
    if (order.status === "placed") {
      return res.json({success: false,message: "Order already paid"});
    }

    //create new Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: order.totalAmount * 100, // paise
      currency: "INR",
      receipt: order.orderId
    });

    res.json({success: true,
      orderId: order.orderId,
      razorpay: razorpayOrder
    })
  } catch (error) {
    console.log("Retry Payment Error:", error);
    res.status(500).json({success: false,message:"Retry payment failed"})
  }
}