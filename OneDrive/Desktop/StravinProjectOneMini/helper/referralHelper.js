import Coupon from '../models/couponModel.js'
export const generatereferralCode =(name) => {
  return name.slice(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
}


export const generatereferralCoupon = async(referrerId) => {
  try {
    console.log(referrerId)
    const code = "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();

const coupon=await Coupon.create({
  code,
  discountType: "fixed",
  discountValue: 100,
  minPurchase: 500,
  expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  isActive: true,
  assignedTo: referrerId,
  couponType:"referral"
})
console.log(coupon)
}catch(error) {
  console.log("Referral coupon error:",error)
  }
}