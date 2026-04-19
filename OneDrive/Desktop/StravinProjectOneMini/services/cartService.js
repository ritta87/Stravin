import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import Variant from "../models/variantModel.js";

const MAX_PER_USER = 3;
// helpers 
const calculateFinalPrice = (product, variant) => {
  const basePrice = product.price + (variant.additionalPrice || 0);

  const productOffer = product.offerPercentage || 0;
  const categoryOffer = product.category?.catOfferPercentage || 0;

  const finalOffer = Math.max(productOffer, categoryOffer);

  return Math.round(basePrice - (basePrice * finalOffer) / 100);
}

const recalculateCartTotals = (cart) => {
  let grandTotal = 0;

  for (const item of cart.items) {
    grandTotal += item.price * item.quantity;
  }

  cart.grandTotal = grandTotal;
  cart.coupon = undefined;
  cart.discountAmount = 0;
  cart.finalTotal = grandTotal;

  return grandTotal;
}

const getCartOrCreate = async (userId) => {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({
      userId,
      items: [],
      grandTotal: 0,
      finalTotal: 0,
      discountAmount: 0
    })
  }

  return cart;
}
// services ----------
export const addToCartService = async (userId, variantId, quantity = 1) => {
  if (!userId) {
    return { success: false, message: "LOGIN_REQUIRED" };
  }
  const variant = await Variant.findById(variantId);
  if (!variant) {
    return { success: false, statusCode: 404, message: "Variant not found!" };
  }

  const product = await Product.findById(variant.product).populate("category");
  if (!product) {
    return { success: false, statusCode: 404, message: "Product not found!" };
  }

  quantity = Number(quantity) || 1;

  if (quantity > variant.stockQuantity) {
    return { success: false, message: "OUT_OF_STOCK" };
  }

  if (quantity > MAX_PER_USER) {
    return {
      success: false,
      message: `Only ${MAX_PER_USER} items allowed per user`
    };
  }

  const finalPrice = calculateFinalPrice(product, variant);

  const cart = await getCartOrCreate(userId);

  const existingItem = cart.items.find(
    (item) => item.variant.toString() === variantId)

  if (existingItem) {
    if (existingItem.quantity + quantity > variant.stockQuantity) {
      return {success: false,
        message: "Not enough stock available!"
      }
    }

    if (existingItem.quantity + quantity > MAX_PER_USER) {
      return {success: false,
        message: `Only ${MAX_PER_USER} items available per user!`
      }
    }

    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      product: product._id,
      variant: variantId,
      quantity,
      price: finalPrice
    });
  }

  const grandTotal = recalculateCartTotals(cart);
  await cart.save();

  return {
    success: true,
    message: "Selected product added to cart",
    grandTotal
  };
};

export const getCartItemsService = async (userId) => {
  const cart = await Cart.findOne({ userId })
    .populate("items.product")
    .populate("items.variant");

  if (!cart || cart.items.length === 0) {
    return {
      items: [],
      outOfStockExist: false
    };
  }

  let outOfStockExist = false;

  const items = cart.items.map((item) => {
    const cartQty = item.quantity;
    const variantQuantity = item.variant?.stockQuantity || 0;
    const itemIsOutOfStock = cartQty > variantQuantity;

    if (itemIsOutOfStock) outOfStockExist = true;

    const basePrice =
      item.product.price + (item.variant?.additionalPrice || 0);

    return {
      ...item._doc,
      productName: item.product.productname,
      variantName: item.variant?.color || null,
      price: item.price,
      basePrice,
      quantity: cartQty,
      stockQuantity: variantQuantity,
      isOutOfStock: itemIsOutOfStock
    };
  });

  return {
    items,
    outOfStockExist
  };
};

export const getCartCountService = async (userId) => {
  const cart = await Cart.findOne({ userId });

  let count = 0;

  if (cart) {
    cart.items.forEach((item) => {
      count += item.quantity;
    });
  }

  return { count };
};

export const updateCartQtyService = async (userId, variantId, change) => {
  const variant = await Variant.findById(variantId);
  if (!variant) {
    return { success: false, message: "Variant not found" };
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { success: false, message: "Cart not found" };
  }

  const item = cart.items.find((i) => i.variant.toString() === variantId);
  if (!item) {
    return { success: false, message: "Item not found" };
  }

  const newQty = item.quantity + Number(change);

  if (newQty > variant.stockQuantity) {
    return {
      success: false,
      message: `Only ${variant.stockQuantity} is Available!`
    };
  }

  if (newQty > MAX_PER_USER) {
    return {
      success: false,
      message: `Maximum ${MAX_PER_USER} items allowed!`
    };
  }

  if (newQty <= 0) {
    cart.items = cart.items.filter((i) => i.variant.toString() !== variantId);

    const grandTotal = recalculateCartTotals(cart);
    await cart.save();

    return {
      success: true,
      removed: true,
      quantity: 0,
      itemTotal: 0,
      grandTotal,
      message: "Item removed from cart"
    }
  }
  item.quantity = newQty;
  const grandTotal = recalculateCartTotals(cart);
  await cart.save();
  return {
    success: true,
    removed: false,
    quantity: item.quantity,
    itemTotal: item.price * item.quantity,
    grandTotal,
    message: "Quantity updated"
  };
};

export const removeCartItemService = async (userId, variantId) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { success: false, message: "Cart not found" };
  }

  cart.items = cart.items.filter((i) => i.variant.toString() !== variantId);

  const grandTotal = recalculateCartTotals(cart);
  await cart.save();

  return {success: true,
    grandTotal,
    message: "Item removed from cart"
  }
}