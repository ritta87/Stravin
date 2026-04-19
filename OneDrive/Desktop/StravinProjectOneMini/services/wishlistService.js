import mongoose from "mongoose";
import Wishlist from "../models/wishlistModel.js";
import Product from "../models/productModel.js";
import Variant from "../models/variantModel.js";
import Cart from "../models/cartModel.js";
const MAX_PER_USER = 3;
export const addToWishlistService = async (req) => {
  const userId = req.session.userId;
  const { productId } = req.body;

  if (!userId) {
    return {
      success: false,
      statusCode: 401,
      message: "Please login first!"
    };
  }

  if (!productId) {
    return {
      success: false,
      statusCode: 400,
      message: "Product ID is required!"
    };
  }

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = new Wishlist({
      userId,
      products: []
    });
  }

  const exist = wishlist.products.find((p) => p.toString() === productId);

  if (exist) {
    wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
    await wishlist.save();

    return {
      success: true,
      statusCode: 200,
      added: false
    };
  }

  wishlist.products.push(productId);
  await wishlist.save();

  return {
    success: true,
    statusCode: 200,
    added: true
  }
}

export const getWishlistPageService = async (req) => {
  const userId = req.session.userId;

  if (!userId) {
    return {
      success: false,
      statusCode: 401,
      message: "Please login first!"
    }
  }

  const wishlist = await Wishlist.findOne({ userId }).populate("products");

  if (!wishlist) {
    return {
      success: true,
      data: {
        wishlistItems: []
      }
    }
  }

  const wishlistItems = await Promise.all(
    wishlist.products.map(async (product) => {
      const variants = await Variant.find({
        product: product._id,
        isListedVariant: true
      });

      return { product, variants };
    })
  )

  return {
    success: true,
    data: {
      wishlistItems
    }
  };
};

export const moveToCartFromWishlistService = async (req) => {
  const userId = req.session.userId;
  const { productId, variantId } = req.body;
  const quantity = 1;
  let grandTotal = 0;

  if (!userId) {
    return {
      success: false,
      statusCode: 401,
      message: "LOGIN_REQUIRED"
    };
  }

  if (!variantId) {
    return {
      success: false,
      statusCode: 400,
      message: "Please select a variant"
    };
  }

  const variant = await Variant.findById(variantId);
  if (!variant) {
    return {
      success: false,
      statusCode: 404,
      message: "Variant not found!"
    };
  }

  const product = await Product.findById(variant.product);
  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "Product not found!"
    };
  }

  if (quantity > variant.stockQuantity) {
    return {
      success: false,
      statusCode: 400,
      message: "OUT_OF_STOCK"
    };
  }

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({
      userId,
      items: [],
      grandTotal: 0
    });
  }

  const existsVariant = cart.items.find(
    (item) => item.variant.toString() === variantId
  );

  if (quantity > MAX_PER_USER) {
    return {
      success: false,statusCode: 400,
      message: `Only ${MAX_PER_USER} items allowed per user`
    }
  }

  const basePrice = Number(product.price) + Number(variant.additionalPrice || 0);
  const finalPrice =
    basePrice - (basePrice * (product.offerPercentage || 0) / 100);

  if (existsVariant) {
    if (existsVariant.quantity + quantity > variant.stockQuantity) {
      return {
        success: false,statusCode: 400,message: "Not enough stock available!"
      }
    }

    if (existsVariant.quantity + quantity > MAX_PER_USER) {
      return {success: false,statusCode: 400,
        message: `Only ${MAX_PER_USER} items allowed per user!`
      }
    }

    existsVariant.quantity += quantity;
    existsVariant.price = Math.round(finalPrice);
  } else {
    cart.items.push({
      product: variant.product,
      variant: variantId,
      quantity,
      price: Math.round(finalPrice)
    })
  }

  for (const item of cart.items) {
    const v = await Variant.findById(item.variant);
    if (!v) continue;

    const p = await Product.findById(v.product);
    if (!p) continue;

    const itemBasePrice = Number(p.price) + Number(v.additionalPrice || 0);
    const itemFinalPrice =
      itemBasePrice - (itemBasePrice * (p.offerPercentage || 0) / 100);

    grandTotal += itemFinalPrice * item.quantity;
  }
  cart.grandTotal = Math.round(grandTotal);
  await cart.save();

  await Wishlist.updateOne({ userId },
    { $pull: { products: productId } }
  )

  return {
    success: true,
    statusCode: 200,
    message: "Item moved to cart successfully",
    grandTotal
  }
}

export const removeFromWishlistService = async (req) => {
  const userId = req.session.userId;
  const { productId } = req.body;

  if (!userId) {
    return {
      success: false,
      statusCode: 401,
      message: "Login required"
    }
  }

  if (!productId) {
    return {
      success: false,
      statusCode: 400,
      message: "Product ID is required"
    }
  }

  const result = await Wishlist.updateOne(
    { userId },
    { $pull: { products: new mongoose.Types.ObjectId(productId) } })

  if (result.modifiedCount === 0) {
    return {
      success: false,
      statusCode: 404,
      message: "Item not found in wishlist"
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: "Item removed from wishlist"
  }
}