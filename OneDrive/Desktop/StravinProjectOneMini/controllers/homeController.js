import Category from "../models/categoryModel.js"
import Variant from '../models/variantModel.js'
import Product from '../models/productModel.js'
import Wishlist from '../models/wishlistModel.js'


//home page 

export const loadHome = async (req, res) => {
 try {
  const search = req.query.search || "";
  const category = req.query.category || "";
  const sort = req.query.sort || "";
  const page = parseInt(req.query.page) || 1;

  const limit = 10;

  const listedCategories = await Category.find({ isListed: true }).select("_id");
  const listedCategoryIds = listedCategories.map(cat => cat._id.toString());

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

  products = products.filter(p => p.category);

  let wishlistProducts = [];
  if (req.session.userId) {
    const wishlist = await Wishlist.findOne({ userId: req.session.userId });
    if (wishlist) {
      wishlistProducts = wishlist.products.map(p => p.toString());
    }
  }

  let updatedProducts = products.map(p => {
    const productOffer = p.offerPercentage || 0;
    const categoryOffer = p.category?.catOfferPercentage || 0;

    const finalOffer = Math.max(productOffer, categoryOffer);

    const finalPrice = Math.round(
      p.price - (p.price * finalOffer / 100)
    );

    return {
      ...p._doc,
      category: p.category,
      finalPrice,
      finalOffer
    };
  });

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

  res.render("user/home", {
    products: paginatedProducts,
    wishlistProducts,
    search,
    category,
    sort,
    currentPage: page,
    totalPages
  });

} catch (err) {
  console.log(err);
  res.redirect("/pageNotFound");
}
  
}
//load shop 
export const loadShop = async (req, res) => {
  try {

    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || '';
    const page = parseInt(req.query.page) || 1;

    const limit = 10;
    const skip = (page - 1) * limit;

    let filter = { isDeleted: false };

    if (category) {
      const categoryArray = category.split(",");
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

    const validProducts = products.filter(p => p.category);
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);
  let wishlistProducts = [];
  if (req.session.userId) 
  {
  let wishlist = await Wishlist.findOne({userId:req.session.userId});
  if (wishlist) {
    wishlistProducts = wishlist.products.map(p =>p.toString())
  }
  }
    res.render("user/shop", {
      products: validProducts,
      wishlistProducts,
      search,
      category,
      sort,
      currentPage: page,
      totalPages
    });

  } catch (error) {
    console.error("Load Home Error:", error);
    res.status(500).send("Server Error");
  }
};

//load a single product  with variant..review/rating static

export const loadSingleProduct = async (req, res) => {
  try {
     const product = await Product.findById(req.params.id).populate("category")
 if (!product) {
      return res.status(404).send("Product not found")
    }
const variants = await Variant.find({ product: product._id,isListedVariant:true})
.sort({ createdAt: -1 })


//total stock for mmultiple variants..
const totalStock=variants.reduce((sum,v)=>{
  return sum+v.stockQuantity
},0)

//static revw data.
const staticReviews={
  rating:4.5,
  totalReviews:120,
  reviews:[
    {name:"Vijay",comment:"Amazing product!",stars:5},
    {name:"Balu",comment:"Good quality.",stars:4}
  ]
}


// calculated price - product offer/cat offer-  V-additionalprice.
const updatedVariants = variants.map(v => {
  const basePrice = Number(product.price) + Number(v.additionalPrice || 0);

  const productOffer = product.offerPercentage 
  const categoryOffer = product.category?.catOfferPercentage 

  const finalOffer = Math.max(productOffer, categoryOffer)

  const finalPrice = basePrice - (basePrice * finalOffer / 100)

  return {
    ...v._doc,
    basePrice: Math.round(basePrice),
    finalPrice: Math.round(finalPrice),
    finalOffer
  }
})

    res.render("user/singleProduct", {
      product,
      variants: updatedVariants,
      totalStock,
      staticReviews
    })

  } catch (error) {
    console.error(error)
    res.status(500).render("user/500");
  }
}

// user logout
export const userLogout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid')
    res.redirect('/login')
  })
}

export const getAllProductsForHome = async (req, res) => {
  try {
    

    const products = await Product.find({isDeleted: false}).sort({ createdAt: -1 })
       res.json({success:true,products})
      
  } catch (error) {
    console.error("Fetch products error:",error);
    res.status(500).json({success: false,message:"Failed to fetch products"})
  }
}

//listed categories at left-checkbox
export const listedCategories=async (req,res)=>{
  try{

  const categories = await Category.find({isListed:true});
  res.status(200).json({categories})
  }catch(error){
    res.status(500).json({success:false,message:"Server error!"})
  }
}

