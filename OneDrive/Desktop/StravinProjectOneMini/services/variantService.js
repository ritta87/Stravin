import Variant from "../models/variantModel.js";
import Product from "../models/productModel.js";

export const getVariantByProductService = async (req) => {
  const { productId } = req.params;
  const product = await Product.findById(productId).populate("category");
  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "Product not found"
    }
  }
 const variants = await Variant.find({ product: productId }).sort({ createdAt: -1 });

  return {
    success: true,
    data: { product, variants }
  }
}
export const addVariantService = async (req) => {
  const { productId } = req.params;
  const { color, additionalPrice, stockQuantity } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "Product not found"
    }
  }

  const price = Number(additionalPrice) || 0;
  const stock = Number(stockQuantity) || 0;

  const imagePaths = (req.files || []).map((file) => `/uploads/${file.filename}`);

  if (!color || !color.trim()) {
    return {
      success: false,
      statusCode: 400,
      message: "Color is required"
    }
  }

  if (price < 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Additional price cannot be negative"
    };
  }

  if (stock < 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Stock quantity cannot be negative"
    };
  }

  if (imagePaths.length === 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Images required"
    }
  }

  if (imagePaths.length > 4) {
    return {
      success: false,
      statusCode: 400,
      message: "Maximum 4 images allowed"
    }
  }

  await Variant.create({
    product: product._id,
    category: product.category,
    color: color.trim(),
    additionalPrice: price,
    stockQuantity: stock,
    images: imagePaths
  });

  return {
    success: true,
    statusCode: 200,
    message: "Variant added successfully"
  }
}

export const updateVariantService = async (req) => {
  const { variantId } = req.params;
  const { color, additionalPrice, stockQuantity, existingImages } = req.body;

  const variant = await Variant.findById(variantId);
  if (!variant) {
    return {
      success: false,
      statusCode: 404,
      message: "Variant not found"
    };
  }

  const product = await Product.findById(variant.product);
  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "Product not found"
    }
  }

  const price = Number(additionalPrice) || 0;
  const stock = Number(stockQuantity) || 0;

  if (!color || !color.trim()) {
    return {
      success: false,
      statusCode: 400,
      message: "Color is required"
    }
  }

  if (price < 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Additional price cannot be negative"
    }
  }

  if (stock < 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Stock quantity cannot be negative"
    }
  }

  variant.color = color.trim();
  variant.additionalPrice = price;
  variant.stockQuantity = stock;
  variant.category = product.category;

  let finalImages = [];

  if (existingImages) {
    try {
      finalImages = JSON.parse(existingImages);
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid existing images data"
      }
    }
  }

  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((file) => `/uploads/${file.filename}`);
    finalImages = [...finalImages, ...newImages];
  }

  if (finalImages.length === 0) {
    return {
      success: false,
      statusCode: 400,
      message: "At least one image is required"
    }
  }

  if (finalImages.length > 4) {
    return {
      success: false,
      statusCode: 400,
      message: "Maximum 4 images allowed"
    }
  }

  variant.images = finalImages;

  await variant.save();

  return {
    success: true,
    statusCode: 200,
    message: "Variant updated successfully"
  }
}

export const unlistVariantService = async (req) => {
  const { variantId } = req.params;

  const variant = await Variant.findByIdAndUpdate(variantId,
    { isListedVariant: false },
    { new: true }
  );

  if (!variant) {
    return {
      success: false,
      statusCode: 404,
      message: "Variant not found"
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: "Selected Variant unlisted successfully!!"
  }
}

export const restoreVariantService = async (req) => {
  const { variantId } = req.params;

  const variant = await Variant.findByIdAndUpdate(variantId,
    { isListedVariant: true },
    { new: true }
  )

  if (!variant) {
    return {
      success: false,
      statusCode: 404,
      message: "Variant not found"
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: "variant Restored back!"
  }
}