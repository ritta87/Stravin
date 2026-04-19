import {loadHomeService,loadShopService,loadSingleProductService,
  userLogoutService,getAllProductsForHomeService,listedCategoriesService
} from "../services/homeService.js";

export const loadHome = async (req, res) => {
  try {
    const result = await loadHomeService(req);

    if (!result.success) {
      return res.redirect("/pageNotFound");
    }

    return res.render("user/home", result.data);
  } catch (err) {
    console.log(err);
    return res.redirect("/pageNotFound");
  }
}

export const loadShop = async (req, res) => {
  try {
    const result = await loadShopService(req);

    if (!result.success) {
      return res.status(result.statusCode || 400).send(result.message || "Server Error");
    }

    return res.render("user/shop", result.data);
  } catch (error) {
    console.error("Load Home Error:", error);
    return res.status(500).send("Server Error");
  }
}

export const loadSingleProduct = async (req, res) => {
  try {
    const result = await loadSingleProductService(req);

    if (!result.success) {
      return res.status(result.statusCode || 404).send(result.message);
    }

    return res.render("user/singleProduct", result.data);
  } catch (error) {
    console.error(error);
    return res.status(500).render("user/500");
  }
}

export const userLogout = async (req, res) => {
  const result = await userLogoutService(req);

  if (!result.success) {
    return res.redirect(result.redirectUrl);
  }

  res.clearCookie(result.clearCookie);
  return res.redirect(result.redirectUrl);
}

export const getAllProductsForHome = async (req, res) => {
  try {
    const result = await getAllProductsForHomeService();
    return res.status(result.statusCode || 200).json({
      success: true,
      products: result.data.products
    });
  } catch (error) {
    console.error("Fetch products error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products"
    });
  }
}

export const listedCategories = async (req, res) => {
  try {
    const result = await listedCategoriesService();
    return res.status(result.statusCode || 200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error!"
    });
  }
}