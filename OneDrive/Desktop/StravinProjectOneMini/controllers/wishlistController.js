import mongoose from "mongoose";
import Wishlist from '../models/wishlistModel.js'
import Product from '../models/productModel.js'
import Variant from '../models/variantModel.js'
import Cart from '../models/cartModel.js'


export const addToWishlist=async(req,res)=>{
    try{
        const userId=req.session.userId;
        const {productId}=req.body
        if(!req.session.userId){
            return res.status(401).json({success:false,message:"Please login first!"})
        }
        if(!productId){
            return res.status(400).json({success:false,message:"Product ID is required!"})
        }
        let wishlist = await Wishlist.findOne({userId})
        if(!wishlist){
            wishlist = new Wishlist({
                userId,
                products:[]
            })
        }
    const exist = wishlist.products.find(p=>p.toString()===productId)
    if (exist) {
      // not add product to wishlist,if its already there.
     wishlist.products = wishlist.products.filter(p => p.toString() !== productId);
      await wishlist.save();
      return res.json({success:true,added:false});
    }

    // add product to wishlist if not exists
    wishlist.products.push(productId);
    await wishlist.save();
    res.json({ success: true,added:true});
    }catch(error){
        res.status(500).json({success:false,message:"Server error while wishlist!"})
    }
}


export const getWishlistPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    const wishlist = await Wishlist.findOne({userId }).populate("products");

    if (!wishlist) {
      return res.render("user/wishlist",{wishlistItems:[]});
    }
    const wishlistItems = await Promise.all(
      wishlist.products.map(async (product) => {
        const variants = await Variant.find({
          product: product._id,
          isListedVariant: true
        })

        return {product,variants}
      })
     )
    
    res.render("user/wishlist",{wishlistItems})
  } catch (error) {
    console.error("wishlist error", error);
    res.status(500).send("Server Error");
  }
}

export const moveToCartFromWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId, variantId } = req.body;
    const quantity = 1
    let grandTotal = 0
    const MAX_PER_USER=3

    if (!userId) {
      return res.json({success:false,message:"LOGIN_REQUIRED" });
    }

    if (!variantId) {
      return res.json({success:false,message:"Please select a variant" });
    }

    const variant = await Variant.findById(variantId);
    if (!variant) {
      return res.json({success:false,message:"Variant not found!" });
    }

    const product = await Product.findById(variant.product);
    if (!product) {
      return res.json({success:false,message:"Product not found!" });
    }

    if (quantity > variant.stockQuantity) {
      return res.json({success:false,message:"OUT_OF_STOCK" });
    }

    let cart = await Cart.findOne({userId});

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        grandTotal: 0
      });
    }

    const existsVariant = cart.items.find(
      item => item.variant.toString() === variantId
    );

    if (quantity > MAX_PER_USER) {
      return res.json({
        success: false,
        message: `Only ${MAX_PER_USER} items allowed per user`
      });
    }

    const basePrice = Number(product.price) + Number(variant.additionalPrice || 0);
    const finalPrice =
      basePrice - (basePrice*(product.offerPercentage||0)/100);

    if (existsVariant) {
      if (existsVariant.quantity + quantity > variant.stockQuantity) {
        return res.json({
          success: false,
          message: "Not enough stock available!"
        });
      } else if (existsVariant.quantity + quantity > MAX_PER_USER) {
        return res.json({success: false,
        message: `Only ${MAX_PER_USER} items allowed per user!`
        })
      }

      existsVariant.quantity += quantity;
      existsVariant.price = Math.round(finalPrice);
    } else {
      cart.items.push({
        product: variant.product,
        variant: variantId,
        quantity: quantity,
        price: Math.round(finalPrice)
      });
    }

    for (const item of cart.items) {
      const v = await Variant.findById(item.variant);
      if (!v) continue;

      const p = await Product.findById(v.product);
      if (!p) continue;

      const itemBasePrice = Number(p.price) + Number(v.additionalPrice || 0);
      const itemFinalPrice =itemBasePrice - (itemBasePrice * (p.offerPercentage || 0) / 100);

      grandTotal += itemFinalPrice * item.quantity;
    }

    cart.grandTotal = Math.round(grandTotal);
    await cart.save();

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: productId } }
    )

    return res.json({success: true,message:"Item moved to cart successfully",grandTotal});

  } catch (error) {
    console.log("moveToCartFromWishlist error:", error);
    return res.status(500).json({success:false,message:"Server Error" });
  }
}

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.body;

    if (!userId) {
      return res.json({success:false,message:"Login required" })
    }

    if (!productId) {
      return res.json({success:false,message:"Product ID is required" })
    }

    const result = await Wishlist.updateOne(
      { userId },
      { $pull: { products:new mongoose.Types.ObjectId(productId) } }
    );

    if (result.modifiedCount === 0) {
      return res.json({success:false,message:"Item not found in wishlist"})
    }

    return res.json({ success: true, message:"Item removed from wishlist"})
  } catch (error) {
    console.log("removeFromWishlist error:",error);
    return res.status(500).json({success:false,message:"Server error"})
  }
}