import {getWalletService,createWalletPaymentService,verifyWalletPaymentService,getWalletNetBalanceService
} from "../services/walletService.js";

export const getWallet = async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await getWalletService(userId);

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ success: false, message: result.message })
    }

    return res.render("user/wallet");
  } catch (error) {
    return res.status(500).json({success: false,message: "Server error at wallet loading.."})
  }
}

export const createWalletPayment = async (req, res) => {
  try {
    const result = await createWalletPaymentService(req.body.amount);

    return res.status(result.statusCode || (result.success ? 200 : 400)).json(result);
  } catch (error) {
    console.log(error);
    return res.json({ success: false });
  }
}

export const verifyWalletPayment = async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await verifyWalletPaymentService(userId, req.body);

    return res.status(result.statusCode || (result.success ? 200 : 400)).json(result);
  } catch (error) {
    console.log(error);
    return res.json({ success: false });
  }
}

export const getWalletNetBalance = async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await getWalletNetBalanceService(userId);

    return res.status(result.statusCode || (result.success ? 200 : 400)).json(result)
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Error at loading Wallet balance!"})
  }
}