import mongoose from "mongoose";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";

export const getAllProductsService = async (query) => {
  const { search, page = 1, category: selectedCategory } = query;

  const limit = 15;
  const currentPage = Number(page) || 1;
  const skip = (currentPage - 1) * limit;

  let searchObj = {};

  if (search && search.trim() !== "") {
    searchObj.productname = { $regex: search.trim(), $options: "i" };
  }

  if (selectedCategory && selectedCategory.trim() !== "") {
    searchObj.category = new mongoose.Types.ObjectId(selectedCategory);
  }

  const categories = await Category.find({ isListed: true }).sort({ name: 1 });

  const products = await Product.aggregate([
    { $match: searchObj },
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
      $addFields: {
        totalStock: { $sum: "$variants.stockQuantity" },
        variantCount: { $size: "$variants" }
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);

  const totalFilteredProducts = await Product.aggregate([
    { $match: searchObj },
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
    { $count: "total" }
  ]);

  const totalProducts = totalFilteredProducts[0]?.total || 0;

  return {
    success: true,
    data: {
      search,
      category: categories,
      selectedCategory,
      product: products,
      currentPage,
      totalPages: Math.ceil(totalProducts / limit)
    }
  };
};

export const getAddProductPageService = async () => {
  const category = await Category.find({ isListed: true });

  return {
    success: true,
    data: { category }
  };
};

export const getAllActiveProductsService = async () => {
  const products = await Product.find().sort({ createdAt: -1 });

  return {
    success: true,
    data: products
  };
};

export const addProductService = async (body, files) => {
  const { productname, description, category, price } = body;
  const offerPercentage = parseInt(body.offerPercentage) || 0;

  const activeCategory = await Category.findOne({
    _id: category,
    isListed: true
  });

  if (!activeCategory) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid or inactive category selected!"
    };
  }

  if (!productname || !Number(price)) {
    return {
      success: false,
      statusCode: 400,
      message: "Required fields Productname or valid price are missing"
    };
  }

  if (!files || files.length === 0) {
    return {
      success: false,
      statusCode: 400,
      message: "At least one product image is required"
    };
  }

  if (files.length > 4) {
    return {
      success: false,
      statusCode: 400,
      message: "Maximum image upload is limited to 4"
    };
  }

  if (Number(price) <= 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Price must be a positive value!"
    };
  }

  if (offerPercentage < 0 || offerPercentage > 100) {
    return {
      success: false,
      statusCode: 400,
      message: "OfferPercentage must be between 0 and 100!"
    };
  }

  const imageUrls = files.map((file) => `/uploads/${file.filename}`);

  const product = new Product({
    productname,
    description,
    category: activeCategory._id,
    price: Number(price),
    offerPercentage,
    images: imageUrls
  });

  await product.save();

  return {
    success: true,
    statusCode: 201,
    message: "Product added successfully! Add variant to make it Available",
    redirectUrl: `/admin/products/${product._id}/variants`
  };
};

export const updateProductService = async (productId, body, files) => {
  const { productname, description, price, category } = body;
  const offerPercentage = parseInt(body.offerPercentage) || 0;
  const numericPrice = Number(price);

  if (numericPrice <= 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Price must be positive!"
    };
  }

  if (offerPercentage < 0 || offerPercentage > 100) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid offer percentage"
    };
  }

  let updateData = {
    productname,
    description,
    price: numericPrice,
    offerPercentage
  };

  if (category && category.trim() !== "") {
    const activeCategory = await Category.findOne({
      _id: category,
      isListed: true
    });

    if (!activeCategory) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid category selected"
      };
    }

    updateData.category = activeCategory._id;
  }

  let images = [];

  if (body.existingImages) {
    images = Array.isArray(body.existingImages)
      ? body.existingImages
      : [body.existingImages];
  }

  images = [...new Set(images)];

  if (files && files.length > 0) {
    const newImages = files.map((file) => `/uploads/${file.filename}`);
    images.push(...newImages);
  }

  if (images.length > 4) {
    return {
      success: false,
      statusCode: 400,
      message: "Maximum 4 images are allowed"
    };
  }

  if (images.length > 0) {
    updateData.images = images;
  }

  const product = await Product.findByIdAndUpdate(productId, updateData, {
    new: true
  });

  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "Product not found"
    };
  }

  return {
    success: true,
    statusCode: 200,
    message: "Product updated successfully"
  };
};

export const getEditProductService = async (productId) => {
  const category = await Category.find();
  const product = await Product.findById(productId).populate("category");

  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "No product found!"
    }
  }

  return {
    success: true, data: { product, category }
  }
}

export const deleteProductService = async (productId) => {
  const product = await Product.findByIdAndUpdate(productId,
    { isDeleted: true },
    { new: true })

  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "Product not found"
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: "Product Unlisted successfully!"
  };
}

export const restoreProductService = async (productId) => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { isDeleted: false },
    { new: true }
  )

  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "Product not found"
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: "Product Restored!"
  }
}