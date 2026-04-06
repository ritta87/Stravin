import Address from '../models/addressModel.js'
import Cart from '../models/cartModel.js'
import Coupon from '../models/couponModel.js'
import Variant from '../models/variantModel.js';
export const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    // fetch cart
    const cart = await Cart.findOne({userId})
      .populate("items.product")
      .populate("items.variant");

    if(!cart || cart.items.length === 0) {
      return res.redirect("/user/cart");
    }
  let outOfStockExists=false
  const cartItems = cart.items.map(item => {
  const cartQty = item.quantity;
  const variantStock = item.variant?.stockQuantity || 0;

  const itemIsOutOfStock = cartQty > variantStock;

  if (itemIsOutOfStock) outOfStockExists = true;

  return {
    ...item._doc,
    productName: item.product.productname,
    variantName: item.variant?.color || null,
    price: item.variant?.additionalPrice || item.product.price,
    quantity: cartQty,
    stockQuantity: variantStock,
    isOutOfStock: itemIsOutOfStock,
  }
})
    // fetch addresses
    const addresses = await Address.find({userId});

   // subTotal
let appliedCoupon=null
let subTotal = 0;
cart.items.forEach((item) => {
  const price = Number(item.price) || 0;
  const qty = Number(item.quantity) || 0;
  subTotal += price * qty;
});

const tax = Math.round(subTotal * 0.05) || 0;
const shipping = 50;
const cartTotal = subTotal + tax + shipping;

// discount
let discount = 0;

if (cart.coupon && cart.coupon.code) {
  const coupon = await Coupon.findOne({
    code: cart.coupon.code.toUpperCase(),
    isActive: true,
  })

  if (coupon) {
    appliedCoupon=coupon.code
    if (coupon.discountType === "percentage") {
        
      const percent = Number(coupon.discountValue) || 0;
      const max = Number(coupon.maxDiscount) || Infinity;
      discount = Math.min((cartTotal * percent) / 100, max);
    } else {
      discount = Number(coupon.discountValue) || 0;
    }
  } else {
    cart.coupon = undefined;
  }
}

// final total
discount = isNaN(discount) ? 0 : discount;
const finalTotal = Math.max(0, cartTotal - discount);
cart.discountAmount = discount;
cart.finalTotal = finalTotal

if (!cart.coupon && !cart.coupon.code) {
  cart.coupon = undefined;
  cart.discountAmount = 0;
  cart.finalTotal = cartTotal;
  appliedCoupon=null
}

await cart.save();



res.render("user/checkout", {
  cart,
  cartItems,
  outOfStockExists,
  addresses,
  subTotal,
  tax,
  shipping,
  discount,           
  finalTotal,         
  totalAmount: cartTotal, 
  appliedCoupon,      
  razorpayKey: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error at checkout" });
  }
}