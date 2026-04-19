import Coupon from "../models/couponModel.js";

const validateCouponData = ({
  code,discountType,discountValue,minPurchase,maxDiscount,expiryDate}) => {
  const discount = Number(discountValue);
  const min = Number(minPurchase) || 0;
  const max = Number(maxDiscount) || 0;

  if (!code || !discountType || !discountValue || !expiryDate) {
    return { success: false, statusCode: 400, message: "All fields are required" };
  }

  if (isNaN(discount) || discount <= 0) {
    return { success: false, statusCode: 400, message: "Discount must be positive" };
  }

  if (discountType === "percentage" && discount > 90) {
    return { success: false, statusCode: 400, message: "Maximum 90% allowed" };
  }

  if (discountType === "fixed" && discount > 10000) {
    return { success: false, statusCode: 400, message: "Maximum fixed discount exceeded" };
  }

  if (min < 0) {
    return { success: false, statusCode: 400, message: "Minimum purchase cannot be negative" };
  }

  if (max < 0) {
    return { success: false, statusCode: 400, message: "Max discount cannot be negative" };
  }

  if (new Date(expiryDate) < new Date()) {
    return { success: false, statusCode: 400, message: "Expiry must be a future date" };
  }

  return {
    success: true,
    data: {
      code: code.toUpperCase(),
      discountType,
      discountValue: discount,
      minPurchase: min,
      maxDiscount: max,
      expiryDate: new Date(expiryDate)
    }
  }
}

export const getCouponPageService = async () => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });

  return {
    success: true,
    data: { coupons }
  }
}

export const addCouponPageService = async () => {
  return {
    success: true
  }
}

export const addCouponService = async (req) => {
  const validation = validateCouponData(req.body);
  if (!validation.success) return validation;

  const existing = await Coupon.findOne({ code: validation.data.code });
  if (existing) {
    return {
      success: false,
      statusCode: 400,
      message: "Coupon already exists"
    }
  }

  const coupon = new Coupon(validation.data);
  await coupon.save();

  return {
    success: true,
    statusCode: 200,
    message: "Coupon added successfully!"
  }
}

export const getEditCouponService = async (req) => {
  const { id } = req.params;

  const coupon = await Coupon.findById(id);
  if (!coupon) {
    return {
      success: false,
      statusCode: 404,
      message: "Coupon not found"
    };
  }

  return {
    success: true,
    data: { coupon }
  }
}

export const editCouponService = async (req) => {
  const { id } = req.params;

  if (!id) {
    return {
      success: false,
      statusCode: 400,
      message: "Coupon ID missing"
    }
  }

  const coupon = await Coupon.findById(id);
  if (!coupon) {
    return {
      success: false,
      statusCode: 404,
      message: "Coupon not found"
    }
  }

  const validation = validateCouponData(req.body);
  if (!validation.success) return validation;

  const existingCoupon = await Coupon.findOne({
    code: validation.data.code,
    _id: { $ne: id }
  });

  if (existingCoupon) {
    return {
      success: false,
      statusCode: 400,
      message: "Coupon code already exists"
    }
  }

  coupon.code = validation.data.code;
  coupon.discountType = validation.data.discountType;
  coupon.discountValue = validation.data.discountValue;
  coupon.minPurchase = validation.data.minPurchase;
  coupon.maxDiscount = validation.data.maxDiscount;
  coupon.expiryDate = validation.data.expiryDate;

  await coupon.save();

  return {
    success: true,
    statusCode: 200,
    message: "Coupon updated successfully"
  }
}

export const deleteCouponService = async (req) => {
  const { id } = req.params;

  const coupon = await Coupon.findByIdAndDelete(id);

  if (!coupon) {
    return {
      success: false,
      statusCode: 404,
      message: "Coupon not found"
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: "Coupon deleted successfully"
  }
}