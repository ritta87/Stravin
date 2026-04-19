import Category from "../models/categoryModel.js";
import Variant from "../models/variantModel.js";
import Product from "../models/productModel.js";
import Wishlist from "../models/wishlistModel.js";

const getWishlistProductIds = async (userId) => {
  if (!userId) return [];

  const wishlist = await Wishlist.findOne({ userId });
  if (!wishlist) return [];

  return wishlist.products.map((p) => p.toString());
}

const getFinalPriceDetails = (product, category, basePrice) => {
  const productOffer = product?.offerPercentage || 0;
  const categoryOffer = category?.catOfferPercentage || 0;
  const finalOffer = Math.max(productOffer, categoryOffer);
  const finalPrice = Math.round(basePrice - (basePrice * finalOffer) / 100);

  return { finalOffer, finalPrice };
}

export const loadHomeService = async (req) => {
  const search = req.query.search || "";
  const category = req.query.category || "";
  const sort = req.query.sort || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  const listedCategories = await Category.find({ isListed: true }).select("_id");
  const listedCategoryIds = listedCategories.map((cat) => cat._id.toString());

  let filter = {
    isDeleted: false,
    category: { $in: listedCategoryIds }
  };

  if (category && category.trim() !== "") {
    const categoryArray = category.split(",").filter(Boolean);
    filter.category = { $in: categoryArray };
  }

  if (search && search.trim() !== "") {
    filter.productname = { $regex: search.trim(), $options: "i" };
  }

  let products = await Product.find(filter).populate("category");
  products = products.filter((p) => p.category);

  const wishlistProducts = await getWishlistProductIds(req.session.userId);

  let updatedProducts = products.map((p) => {
    const { finalOffer, finalPrice } = getFinalPriceDetails(
      p,
      p.category,
      Number(p.price)
    )

    return {
      ...p._doc,
      category: p.category,
      finalPrice,
      finalOffer
    }
  })

  if (sort === "priceLow") {
    updatedProducts.sort((a, b) => a.finalPrice - b.finalPrice);
  } else if (sort === "priceHigh") {
    updatedProducts.sort((a, b) => b.finalPrice - a.finalPrice);
  } else if (sort === "name") {
    updatedProducts.sort((a, b) => a.productname.localeCompare(b.productname));
  } else {
    updatedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const totalProducts = updatedProducts.length;
  const totalPages = Math.ceil(totalProducts / limit);
  const startIndex = (page - 1) * limit;
  const paginatedProducts = updatedProducts.slice(startIndex, startIndex + limit);

  return {
    success: true,
    data: {
      products: paginatedProducts,
      wishlistProducts,
      search,
      category,
      sort,
      currentPage: page,
      totalPages
    }
  }
}

export const loadShopService = async (req) => {
  const search = req.query.search || "";
  const category = req.query.category || "";
  const sort = req.query.sort || "";
  const page = parseInt(req.query.page) || 1;

  const limit = 10;
  const skip = (page - 1) * limit;

  let filter = { isDeleted: false };

  if (category) {
    const categoryArray = category.split(",").filter(Boolean);
    filter.category = { $in: categoryArray };
  }

  if (search) {
    filter.productname = { $regex: search, $options: "i" };
  }

  let sortOption = { createdAt: -1 };
  if (sort === "priceLow") sortOption = { price: 1 };
  if (sort === "priceHigh") sortOption = { price: -1 };
  if (sort === "name") sortOption = { productname: 1 };

  const products = await Product.find(filter)
    .populate({
      path: "category",
      match: { isListed: true }
    })
    .sort(sortOption)
    .skip(skip)
    .limit(limit);

  const validProducts = products.filter((p) => p.category);
  const totalProducts = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalProducts / limit);

  const wishlistProducts = await getWishlistProductIds(req.session.userId);

  return {
    success: true,
    data: {
      products: validProducts,
      wishlistProducts,
      search,
      category,
      sort,
      currentPage: page,
      totalPages
    }
  }
}

export const loadSingleProductService = async (req) => {
  const product = await Product.findById(req.params.id).populate("category");

  if (!product) {
    return {
      success: false,
      statusCode: 404,
      message: "Product not found"
    }
  }

  const variants = await Variant.find({
    product: product._id,
    isListedVariant: true
  }).sort({ createdAt: -1 });

  const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);

  const staticReviews = {
    rating: 4.5,
    totalReviews: 120,
    reviews: [
      { name: "Vijay", comment: "Amazing product!", stars: 5 },
      { name: "Balu", comment: "Good quality.", stars: 4 }
    ]
  }

  const updatedVariants = variants.map((v) => {
    const basePrice = Number(product.price) + Number(v.additionalPrice || 0);
    const { finalOffer, finalPrice } = getFinalPriceDetails(
      product,
      product.category,
      basePrice
    )

    return {
      ...v._doc,
      basePrice: Math.round(basePrice),
      finalPrice: Math.round(finalPrice),
      finalOffer
    }
  })

  return {
    success: true,
    data: {
      product,
      variants: updatedVariants,
      totalStock,
      staticReviews
    }
  }
}

export const userLogoutService = async (req) => {
  return new Promise((resolve) => {
    req.session.destroy((err) => {
      if (err) {
        return resolve({
          success: false,
          redirectUrl: "/"
        })
      }

      return resolve({
        success: true,
        clearCookie: "connect.sid",
        redirectUrl: "/login"
      });
    })
  })
}

export const getAllProductsForHomeService = async () => {
  const products = await Product.find({ isDeleted: false }).sort({ createdAt: -1 });

  return {
    success: true,
    statusCode: 200,
    data: { products }
  }
}

export const listedCategoriesService = async () => {
  const categories = await Category.find({ isListed: true });

  return {
    success: true,
    statusCode: 200,
    data: { categories }
  }
}