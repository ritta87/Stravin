import { getCheckoutPageService } from "../services/checkoutService.js";

export const getCheckoutPage = async (req, res) => {
  try {
    const result = await getCheckoutPageService(req);

    if (!result.success) {
      if (result.redirectUrl) {
        return res.redirect(result.redirectUrl);
      }

      return res.status(result.statusCode || 400).json({success: false,message: result.message})
    }

    return res.render("user/checkout", result.data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Server error at checkout"})
  }
}