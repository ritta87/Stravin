import Cart from '../models/cartModel.js'
import Product from '../models/productModel.js'
import Variant from '../models/variantModel.js'
import User from '../models/userModel.js'

const MAX_PER_USER = 3
export const addToCart = async (req, res) => {
  try{
  const userId = req.session.userId;
  const {variantId} = req.body;
  const quantity=Number(req.body.quantity)||1
  let grandTotal=0;
  const variant = await Variant.findById(variantId)
  const productId= variant.product
  const product = await Product.findById(productId).populate("category")


const basePrice = product.price + (variant.additionalPrice || 0);

const productOffer = product.offerPercentage 
const categoryOffer = product.category?.catOfferPercentage;

const finalOffer = Math.max(productOffer, categoryOffer);

const finalPrice = Math.round(basePrice - (basePrice * finalOffer / 100))

   if(!userId){
    return res.json({success:false,message:"LOGIN_REQUIRED"})
  }
  if(!variant){
    return res.status(404).json({success:false,message:"Variant not found!"})
  }
  if(quantity > variant.stockQuantity){
   return res.json({success:false,message:"OUT_OF_STOCK"})
  }
  //find a user-cart
  let cart = await Cart.findOne({userId})
  //if no,create new cart
  if(!cart){
    cart = new Cart({
      userId,
      items:[],grandTotal:0
    })
  }
const existsVariant = cart.items.find(item=>item.variant.toString()===variantId)
if(quantity > MAX_PER_USER){
  return res.json({success:false, message:`Only ${MAX_PER_USER} items allowed per user`})
}
 if(existsVariant){
    if(existsVariant.quantity+quantity > variant.stockQuantity)
      {
      return res.json({success:false,message:"Not enough stock available!"})
    }
    else if(existsVariant.quantity+quantity > MAX_PER_USER ){
      return res.json({success:false,message:`Only ${MAX_PER_USER} items available per user!`})
    }
  existsVariant.quantity += quantity;
  }else{
   cart.items.push({
        product: productId,
        variant: variantId,
        quantity: quantity,
        price:Math.round(finalPrice)
      })
  }
grandTotal = 0;
for(const item of cart.items) {
  grandTotal += item.price * item.quantity;
}

cart.grandTotal = grandTotal
cart.coupon=undefined
cart.discountAmount=undefined
cart.finalTotal=grandTotal
  await cart.save()
  
  res.json({success:true,message:"Selected product added to cart",grandTotal})
}catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }

}


//cart page-cart items loading
export const getCartItems=async(req,res)=>{
  try{
  const userId=req.session.userId;
  let cart = await Cart.findOne({userId}).populate("items.product")
                                          .populate("items.variant")
  if(!cart||cart.length===0){
   return res.render('user/cart',{items:[],outOfStockExist:false})
  }
  let outOfStockExist=false
  const items = cart.items.map(item=>{
    let cartQty=item.quantity
    let variantQuantity=item.variant?.stockQuantity||0;
    let itemIsOutOfStock=cartQty>variantQuantity
    if(itemIsOutOfStock) outOfStockExist=true;
  let basePrice =
  item.product.price + (item.variant?.additionalPrice || 0);
      return {
        ...item._doc,
        productName: item.product.productname,
        variantName: item.variant?.color || null,
        price: item.price,
        basePrice:basePrice,
        quantity: cartQty,
        stockQuantity: variantQuantity,
        isOutOfStock: itemIsOutOfStock,
      }
  })
  res.render("user/cart",{items,outOfStockExist})

  }catch(error){
    console.log(error)
  }
}
//cart count
export const getCartCount=async(req,res)=>{
  try{
    const userId=req.session.userId;
    const cart = await Cart.findOne({userId})
    let count=0
    if(cart){
      cart.items.forEach(item=>{
      count += item.quantity
      })
    }
    res.json({count})

  }catch(error){
    res.status(500).json({success:false,message:"Error fetching at cart count!!"})
  }
}


//update + - quantity
export const updateCartQty = async (req, res) => {
  try {
    const { variantId, change } = req.body;
    const userId = req.session.userId;

    const variant = await Variant.findById(variantId);
    if (!variant) {
      return res.json({ success: false, message: "Variant not found" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(i => i.variant.toString() === variantId);

    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

    const newQty = item.quantity + Number(change);

    if (newQty > variant.stockQuantity) {
      return res.json({
        success: false,
        message: `Only ${variant.stockQuantity} is Available!`
      })
    }

    if (newQty > MAX_PER_USER) {
      return res.json({
        success: false,
        message: `Maximum ${MAX_PER_USER} items allowed!`
      });
    }

    if (newQty <= 0) {
      cart.items = cart.items.filter(i => i.variant.toString() !== variantId);

      let grandTotal = 0;
      cart.items.forEach(i => {
        grandTotal += i.price * i.quantity;
      });

      cart.grandTotal = grandTotal;
      cart.finalTotal = grandTotal;
      cart.discountAmount = 0;
      cart.coupon = undefined;

      await cart.save();

      return res.json({
        success: true,
        removed: true,
        quantity: 0,
        itemTotal: 0,
        grandTotal: cart.grandTotal,
        message: "Item removed from cart"
      });
    }

    item.quantity = newQty;

    let grandTotal = 0;
    cart.items.forEach(i => {
      grandTotal += i.price * i.quantity;
    });

    cart.grandTotal = grandTotal;
    cart.finalTotal = grandTotal;
    cart.discountAmount = 0;
    cart.coupon = undefined;

    await cart.save();

    return res.json({
      success: true,
      removed: false,
      quantity: item.quantity,
      itemTotal: item.price * item.quantity,
      grandTotal: cart.grandTotal,
      message: "Quantity updated"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export const removeCartItem = async (req, res) => {
  try {
    const { variantId } = req.body;
    const userId = req.session.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    cart.items = cart.items.filter(i => i.variant.toString() !== variantId);

    let grandTotal = 0;
    cart.items.forEach(i => {
      grandTotal += i.price * i.quantity;
    })

    cart.grandTotal = grandTotal;
    cart.finalTotal = grandTotal;
    cart.discountAmount = 0;
    cart.coupon = undefined;

    await cart.save();

    return res.json({
      success: true,
      grandTotal: cart.grandTotal,
      message: "Item removed from cart"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" })
  }
}