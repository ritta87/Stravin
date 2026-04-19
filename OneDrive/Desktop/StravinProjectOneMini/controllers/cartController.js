import {
  addToCartService, getCartItemsService, getCartCountService, updateCartQtyService,
  removeCartItemService} from "../services/cartService.js";

export const addToCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { variantId } = req.body;
    const quantity = Number(req.body.quantity) || 1;

    const result = await addToCartService(userId, variantId, quantity);

    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Server Error"})
  }
};

export const getCartItems = async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await getCartItemsService(userId);

    return res.render("user/cart", {
      items: result.items,
      outOfStockExist: result.outOfStockExist
    });
  } catch (error) {
    console.log(error);
    return res.render("user/cart", {
      items: [],
      outOfStockExist: false
    });
  }
};

export const getCartCount = async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await getCartCountService(userId);

    return res.json(result);
  } catch (error) {
    return res.status(500).json({success: false,message: "Error fetching cart count!!"})
  }
};

export const updateCartQty = async (req, res) => {
  try {
    const { variantId, change } = req.body;
    const userId = req.session.userId;

    const result = await updateCartQtyService(userId, variantId, change);

    return res
      .status(result.success ? 200 : 400)
      .json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Server error"})
  }
}

export const removeCartItem = async (req, res) => {
  try {
    const { variantId } = req.body;
    const userId = req.session.userId;

    const result = await removeCartItemService(userId, variantId);

    return res
      .status(result.success ? 200 : 400)
      .json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Server error"})
  }
}