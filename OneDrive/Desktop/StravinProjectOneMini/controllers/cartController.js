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
  const product = await Product.findById(productId);

const basePrice = Number(product.price) + Number(variant.additionalPrice || 0);
const finalPrice = basePrice - (basePrice * (product.offerPercentage || 0) / 100);

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
for (const item of cart.items) {
 const v = await Variant.findById(item.variant);
  if (!v) continue;
 const product = await Product.findById(v.product);
 const basePrice = Number(product.price) + Number(v.additionalPrice || 0);
const finalPrice =
    basePrice - (basePrice * (product.offerPercentage || 0) / 100);
grandTotal += finalPrice * item.quantity;
}

cart.grandTotal = grandTotal
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
  let cart = await Cart.findOne({userId}).populate("items.product").populate("items.variant")
  if(!cart){
    cart = {items:[]}
  }
  
  res.render("user/cart",{cart})

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
export const updateCartQty = async (req,res)=>{
  const {variantId, change} = req.body
  const userId = req.session.userId;
let variant = await Variant.findById(variantId)
  const cart = await Cart.findOne({userId})
  if (!cart) {
    return res.json({ success: false, message: "Cart not found" });
}
  const item = cart.items.find(
    i => i.variant.toString() === variantId)

  if(!item){
    return res.json({success:false})
  }

  //prevent user enters exceeding minm stock vailable.
  let newQty = item.quantity+change
  if(newQty>variant.stockQuantity){
    return res.json({success:false,message:`Only ${variant.stockQuantity} is Available!`})
  }
  if(newQty>MAX_PER_USER){
    return res.json({success:false,message:`Maximum ${MAX_PER_USER} items allowed!`})
  }
  

  //if quantity of item = 0,remove from cart.
if(newQty<=0)    {
cart.items=cart.items.filter(i=>i.variant.toString()!==variantId)
await cart.save()
  return res.json({success:true,message:"Item removed from cart"})
  }

 //else just update qty
item.quantity = newQty
await cart.save()

return res.json({success:true,message:"Quantity updated"})
}

//remove cart item-Remove btn
export const removeCartItem = async (req,res)=>{
  const {variantId} = req.body
  const userId = req.session.userId

  const cart = await Cart.findOne({userId})
  if(!cart){
    return res.json({success:false})
  }
cart.items = cart.items.filter(i => i.variant.toString() !== variantId)
  await cart.save()
res.json({success:true,message:"Item removed from cart"})
}