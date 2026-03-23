import Variant from '../models/variantModel.js'
import Product from '../models/productModel.js'
import fs from "fs";
import path from "path";

export const getVariantByProduct = async (req, res) => {
  try {
    const { productId } = req.params

    const product = await Product.findById(productId).populate('category')
    if (!product) return res.status(404).send("Product not found")

    const variants = await Variant.find({ product: productId }).sort({createdAt:-1})
  
    res.render('variants',{product,variants});

  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
}

export const addVariant = async (req,res)=>{
  try{

    const {productId} = req.params
    const {color,additionalPrice,stockQuantity} = req.body

    const product = await Product.findById(productId)

    if(!product){
      return res.json({success:false,message:"Product not found"})
    }

    const price = Number(additionalPrice) || 0
    const stock = Number(stockQuantity) || 0

    const imagePaths = (req.files || []).map(file=>`/uploads/${file.filename}`)

    if(imagePaths.length===0){
      return res.json({success:false,message:"Images required"})
    }

    await Variant.create({
      product:product._id,
      category:product.category,
      color,
      additionalPrice:price,
      stockQuantity:stock,
      images:imagePaths
    })

    res.json({
      success:true,
      message:"Variant added successfully"
    })

  }catch(error){
    console.error("VARIANT ERROR:",error)
    res.status(500).json({
      success:false,
      message:error.message
    })
  }
}
export const updateVariant = async (req, res) => {
  try {

    const { variantId } = req.params
    const { color, additionalPrice, stockQuantity } = req.body
  const variant = await Variant.findById(variantId)
if (!variant) {
      return res.json({
        success: false,
        message: "Variant not found"
      })
    }
    const product = await Product.findById(variant.product)
    variant.color = color
    variant.additionalPrice = Number(additionalPrice) || 0
    variant.stockQuantity = Number(stockQuantity) || 0
    variant.category = product.category
 if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`)
      variant.images = newImages
    }
await variant.save()
 res.json({
      success: true,
      message: "Variant updated successfully"
    })

  } catch (err) {
    res.json({
      success: false,
      message: err.message
    })
  }
}
export const  unlistVariant=async(req,res)=>{
  try{
    const {variantId}=req.params;
    await Variant.findByIdAndUpdate(variantId,{isListedVariant:false})
    res.json({success:true,message:'Selected Variant unlisted successfully!!'})
  }catch(error){
    res.status(500).json({success:false,message:"Server crashed"})
  }
}
export const restoreVariant = async(req,res)=>{
  try{
    const {variantId}=req.params;
    await Variant.findByIdAndUpdate(variantId,{isListedVariant:true})
    res.json({success:true,message:"variant Restored back!"})
  }catch(error){
res.status(500).json({success:false,message:"Server issue!"})
  }
}




