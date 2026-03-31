import dotenv from 'dotenv'
dotenv.config(); 
import Cart from '../models/cartModel.js'
import Address from '../models/addressModel.js'
import Order from '../models/orderModel.js'
import Product from '../models/productModel.js'
import Variant from '../models/variantModel.js'
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

//plac order..
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

    if (!["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Invalid payment method" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    
    const subTotal = cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const tax = Math.round(subTotal * 0.05);
    const shipping = 50;
    const totalAmount = subTotal + tax + shipping;

    
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
      });
    }

    // order creation
    const order = await Order.create({
      orderId: generateOrderId(),
      userId,
      items: orderItems,
      subTotal,
      tax,
      shipping,
      totalAmount,
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
      cart.grandTotal = 0;
      await cart.save();

      return res.json({
        success: true,
        payment: "COD",
        orderId: order.orderId
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: order.orderId   
    });

    return res.json({
      success: true,
      payment: "ONLINE",
      razorpay: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount
      },
      orderId: order.orderId,   
      addressId
    });

  } catch (err) {
    console.error("PlaceOrder Error:", err);
    return res.status(500).json({ success: false });
  }
};
//success page
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
//get users order page..
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
        const orders=await Order.find(filter).sort({createdAt:-1}).populate("items.product")
        res.render('user/orders',{orders,search});
    }catch(error){
        console.log(error)
        res.redirect('/')
    }
}

//view order tracking-details.
export const getOrderDetails=async(req,res)=>{
  const userId=req.session.userId;
  const orderId=req.params.orderId;
  const order=await Order.findOne({orderId,userId})
  .populate("items.product").populate("items.variant")
  if(!order){
    return res.status(404).json({success:false,message:"Order not found!!"});

  }
  res.render('user/viewOrderDetails',{order})
}
//cancel order
export const cancelOrder = async(req,res)=>{
  try {
    const orderId = req.params.orderId;
    const {index} = req.body;

    const order = await Order.findOne({orderId});
    if (!order) {
      return res.status(404).json({ success:false, message:"Order not found" });
    }
 const idx = Number(index);
    if (isNaN(idx) || idx < 0 || idx >= order.items.length) {
      return res.status(400).json({success:false,message:"Invalid item index" });
    }

    const item = order.items[idx];

    if (!item) {
      return res.status(400).json({success:false,message:"Invalid item index" });
    }

    if (order.status === "Delivered") {
      return res.status(400).json({success:false,message:"Cannot cancel after delivery" });
    }

    item.itemStatus = "Cancelled";
    
    //restore item qty at product area
   if(item.variant){
      const variant = await Variant.findById(item.variant);
      if(variant){
        variant.stockQuantity += item.quantity;
        await variant.save();
      }
    }

    const allCancelled = order.items.every(i=>i.itemStatus === "Cancelled")
    if (allCancelled)
   {
      order.status = "Cancelled"
    }

    await order.save();
    return res.json({success:true})

  } catch (err) {
    console.error(err);
    res.status(500).json({success:false,message:"Server error"})
  }
};
//item return req raising, if delivered.
export const returnItem=async (req, res) => {
  const {reason } = req.body;
  const {orderId,itemId} = req.params;

  if (!reason || reason.trim() === "")
    return res.status(400).json({ success: false, message: "Return reason is required." });

  const order = await Order.findOne({_id:orderId,userId:req.session.userId });
 
  if (!order){ 
    return res.status(404).json({success:false,message:"Order not found."});
  }
  const item = order.items.id(itemId);

  if (item.itemStatus !== "Delivered"){
  return res.status(400).json({success:false,message:"Order must be delivered to request a return." })
  }
  const deliveryDate = new Date(item.deliveryDate)
  const now = new Date()
  const diffDays = Math.floor((now - deliveryDate)/(1000 * 60 * 60 * 24));
  if (diffDays > 10){ 
    return res.status(400).json({success:false,message:"Return period expired(10 days only)."})
  }
  if (!item) {
    return res.status(404).json({success:false,message:"Item not found in order."})
  }
  if (item.return?.isRequested){
     return res.status(400).json({success:false,message:"Return already requested for this item."})
  }

  item.return = {
    isRequested:true,
    reason,
    requestDate:now,
    status:"Pending"
  }
const allReturned = order.items.every(i => i.return?.status === "Approved");
const someReturned = order.items.some(i => i.return?.isRequested);

if (allReturned) {
  order.status = "Returned";
} else if (someReturned) {
  order.status = "Partially Returned";
}
  await order.save();
  return res.json({success:true,message:"Return request submitted for this item."})
}
//invoice download.
export const downloadInvoice = async (req, res) => {
  try {
    const {orderId} = req.params;

    const order = await Order.findOne({ orderId }).populate('userId');

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
      doc.text(`${i + 1}. ${item.name}`);
      doc.text(`Qty: ${item.quantity}`);
      doc.text(`Price: ₹${item.price}`);
      doc.text(`Status: ${item.itemStatus}`);
    });

    doc.moveDown();

    doc.text(`Subtotal: ₹${order.subTotal}`);
    doc.text(`Tax: ₹${order.tax}`);
    doc.text(`Shipping: ₹${order.shipping}`);
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
//paynment verify-razorpay signature.
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    if (!orderId) {
      return res.status(400).json({success: false,
        message: "Order ID missing"
      });
    }

    // signature verification.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false });
    }

    
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({success: false,
        message: "Order not found"
      });
    }

    //update order
    order.paymentStatus = "Paid";
    order.status = "Placed";
    await order.save();

    //stock reduce-online
    for (const item of order.items) {
      const variant = await Variant.findById(item.variant);
      if (variant) {
        variant.stockQuantity -= item.quantity;
        await variant.save();
      }
    }

    //  CLEAR CART
    await Cart.findOneAndUpdate(
      { userId: req.session.userId },
      { items: [], grandTotal: 0 }
    );

    
    return res.json({
      success: true,
      orderId: order.orderId
    });

  } catch (err) {
    console.error("VerifyPayment Error:", err);
    return res.status(500).json({ success: false });
  }
};