import {getCouponPageService,addCouponPageService,addCouponService,getEditCouponService,
  editCouponService,deleteCouponService} from "../services/couponService.js";

export const getCouponPage = async (req, res) => {
  try {
    const result = await getCouponPageService();
    return res.render("admin/coupons", result.data);
  } catch (error) {
    return res.status(500).json({success: false,message: "Server at coupon page loading"})
  }
}

export const addCouponPage = async (req, res) => {
  try {
    await addCouponPageService();
    return res.render("admin/addCoupon");
  } catch (error) {
    return res.status(500).json({success: false,message: "Server error at loading coupon page"})
  }
}

export const addCoupon = async (req, res) => {
  try {
    const result = await addCouponService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.json({success: false,message: "Server error"})
  }
}

export const getEditCoupon = async (req, res) => {
  try {
    const result = await getEditCouponService(req);

    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }
return res.render("admin/editCoupn", result.data);
  } catch (error) {
    console.log(error);
    return res.json({success: false,message: "Server error at edit coupon"})
  }
}

export const editCoupon = async (req, res) => {
  try {
    const result = await editCouponService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (err) {
    console.log(err);
    return res.json({success: false,message: "Server error while updating coupon"})
  }
}

export const deleteCoupon = async (req, res) => {
  try {
    const result = await deleteCouponService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.json({success: false,message: "Server error"})
  }
}