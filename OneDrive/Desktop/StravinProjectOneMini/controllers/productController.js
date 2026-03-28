import mongoose from "mongoose"
import Category from "../models/categoryModel.js"
import Product from '../models/productModel.js'

//getallproduct / search /pagination
export const getAllProducts = async (req, res) => {
  try {
    const { search, page = 1, category: selectedCategory } = req.query;
    const limit = 15;
    const skip = (page - 1) * limit;

    let searchObj = {};

    if (search && search.trim() !== '') {
      searchObj.productname = { $regex: search.trim(), $options: "i" };
    }
   if (selectedCategory && selectedCategory.trim() !== '') {
  searchObj.category = new mongoose.Types.ObjectId(selectedCategory);
    }
    const categories = await Category.find({ isListed: true }).sort({ name: 1 });
    const totalProducts = await Product.countDocuments(searchObj)
    const products = await Product.aggregate([{ $match: searchObj },
  {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
{ $unwind: "$category" },
{ $match: { "category.isListed": true } },
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "product",
          as: "variants"
        }
      },
      {
        $addFields:{
          totalStock:{$sum: "$variants.stockQuantity" },
           variantCount:{ $size:"$variants" }
        }
      },
{ $sort:{createdAt: -1}},
{ $skip:skip},
{ $limit:limit }

    ]);
res.render('admin/products', {
      search,
      category: categories,
      selectedCategory,
      product: products,
      currentPage: Number(page),
      totalPages: Math.ceil(totalProducts / limit),
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching products");
  }
}



export const getAllActiveProducts= async () => {
  return await Product.find().sort({createdAt:-1})
}



//Add product
export const addProduct = async (req, res) => {
  try {
    const { productname, description, category, price } = req.body;
    const offerPercentage = Number(req.body.offerPercentage) || 0;

    const activeCategory = await Category.findOne({_id: category, isListed: true});
    if(!activeCategory){
      return res.status(400).json({success:false, message:"Invalid or inactive category selected!"});
    }

    if (!productname || !Number(price)) {
      return res.json({success:false, message:"Required fields Productname or valid price are missing"});
    }

    if (!req.files || req.files.length === 0) {
      return res.json({success: false, message:"At least one product image is required"});
    }

    if(req.files.length > 4){
      return res.json({success:false, message:"Maximum image upload is limited to 4"});
    }

    if(Number(price) <= 0){
      return res.json({success:false, message:"Price must be a positive value!"});
    }

    if(offerPercentage < 0 || offerPercentage > 100){
      return res.status(400).json({success:false, message:"OfferPercentage must be between 0 and 100!"});
    }

    const imageUrls = req.files.map(f => `/uploads/${f.filename}`);

    // offer price calculation
    let offerPrice = Number(price);
    if(offerPercentage > 0){
      offerPrice = price - (price * offerPercentage / 100);
    }

    const product = new Product({
      productname,
      description,
      category: activeCategory._id,
      price: Number(price),
      offerPercentage,
      offerPrice,
      images: imageUrls
    });

    await product.save();
    res.status(201).json({
      success: true,
      message: "Product added successfully!Add variant to make it Available",
      redirectUrl: `/admin/products/${product._id}/variants`
    })

  } catch (error) {
    console.log(error);
    res.status(500).json({success:false,message:error.message || "Failed to add product"})
  }
}
//edit product
export const updateProduct = async (req, res) => {
  try {
    const { productname, description, price, category } = req.body;
    const offerPercentage=Number(req.body.offerPercentage)||0
     let calculatedOfferPrice = Number(price)

if (offerPercentage > 0) {
  calculatedOfferPrice = price-(price * offerPercentage/100)
}
    let updateData = {
      productname,
      description,
      price,
      offerPercentage,
      offerPrice:calculatedOfferPrice
    };

     if (category && category.trim() !== "") {
      const activeCategory = await Category.findOne({
        _id: category,
        isListed: true
      });

      if (!activeCategory) {
        return res.status(400).json({success: false,
          message: "Inactive category selected!!!"})
      }
      if(price&&Number(price)<=0){
        return res.json({success:false,message:"Price must be a positive value!"})
      }
      if(offerPercentage<0 || offerPercentage>100){
        res.status(400).json({success:false,message:"OfferPercentage must be a positive value!"})
      }
    
      updateData.category = activeCategory._id;
    }
    
    let images = [];

    if (req.body.existingImages) {
      images = Array.isArray(req.body.existingImages)
        ? req.body.existingImages
        : [req.body.existingImages];
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(
        (file) => "/uploads/" + file.filename
      );
      images.push(...newImages);
    }

    if (images.length > 0) {
      updateData.images = images.slice(0, 4);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!product) {
      return res.json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      message: "Product updated successfully"
    });

  } catch (error) {
    res.json({success:false,message:"Unable to update product"})
  }
}



export const getEditProduct=async(req,res)=>{
  try{
    const category=await Category.find()
    const product=await Product.findById(req.params.id).populate('category')
    if(!product){
        return res.status(400).send("No product found!")
    }
    res.render('admin/editProduct',{product,category})

  }catch(error){
    console.log(error)
    res.status(500).send("Server Issue!Wont able to get Product Info!")
  }
}

export const deleteProduct = async (req, res) => {
     try {
      
      
    await Product.findByIdAndUpdate(req.params.id,{isDeleted: true });
    res.json({success: true, message:"Product Unlisted successfully!" });
  } catch (error) {
    console.log(error);
    res.json({success: false, message:"Failed to Unlists product" });
  }
}
export const restoreProduct = async(req,res)=>{
  try{
await Product.findByIdAndUpdate(req.params.id,{isDeleted:false});
res.json({success:true,message:"Product Restored!"})
  }catch(error){
res.status(500).json({success:false,message:"Server Error!"})
  }

}