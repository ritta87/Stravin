import {
  addToWishlistService,getWishlistPageService,moveToCartFromWishlistService,
  removeFromWishlistService
} from "../services/wishlistService.js";

export const addToWishlist = async (req, res) => {
  try {
    const result = await addToWishlistService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    return res.status(500).json({success: false,message: "Server error while wishlist!"})
  }
}

export const getWishlistPage = async (req, res) => {
  try {
    const result = await getWishlistPageService(req);

    if (!result.success) {
      return res.status(result.statusCode || 401).json({success: false,message: result.message})
    }

    return res.render("user/wishlist", result.data);
  } catch (error) {
    console.error("wishlist error", error);
    return res.status(500).send("Server Error");
  }
}

export const moveToCartFromWishlist = async (req, res) => {
  try {
    const result = await moveToCartFromWishlistService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log("moveToCartFromWishlist error:", error);
    return res.status(500).json({success: false,message: "Server Error"})
  }
}

export const removeFromWishlist = async (req, res) => {
  try {
    const result = await removeFromWishlistService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log("removeFromWishlist error:", error);
    return res.status(500).json({success: false,message: "Server error"});
  }
}