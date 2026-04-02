import Address from '../models/addressModel.js'
import Cart from '../models/cartModel.js'
import Coupon from '../models/couponModel.js'
export const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    // fetch cart
    const cart = await Cart.findOne({ userId })
      .populate("items.product")
      .populate("items.variant");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/user/cart");
    }

    // fetch addresses
    const addresses = await Address.find({ userId });

   // subtotal
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
  });

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

// save safely
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
  addresses,
  subTotal,
  tax,
  shipping,
  discount,           // discount applied
  finalTotal,         // total after discount
  totalAmount: cartTotal, // original total before discount
  appliedCoupon,      // coupon code
  razorpayKey: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error at checkout" });
  }
}