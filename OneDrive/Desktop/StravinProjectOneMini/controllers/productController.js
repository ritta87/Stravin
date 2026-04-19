import {getAllProductsService,getAddProductPageService,getAllActiveProductsService,
  addProductService,updateProductService,getEditProductService,deleteProductService,
  restoreProductService} from "../services/productService.js";

//get all products/search/pagination
export const getAllProducts = async (req, res) => {
  try {
    const result = await getAllProductsService(req.query);

    return res.render("admin/products", result.data);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Error fetching products")
  }
}

export const GetAddProduct = async (req, res) => {
  try {
    const result = await getAddProductPageService();

    return res.render("admin/GetAddProduct", result.data);
  } catch (error) {
    return res.status(500).json({success: false,message: "Server error at loading page."})
  }
}

export const getAllActiveProducts = async () => {
  const result = await getAllActiveProductsService();
  return result.data;
};

// add product
export const addProduct = async (req, res) => {
  try {
    const result = await addProductService(req.body, req.files);

    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: error.message || "Failed to add product"})
  }
};

// edit / update product
export const updateProduct = async (req, res) => {
  try {
    const result = await updateProductService(req.params.id, req.body, req.files);

    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    return res.status(500).json({success: false,message: "Unable to update product"})
  }
}

export const getEditProduct = async (req, res) => {
  try {
    const result = await getEditProductService(req.params.id);

    if (!result.success) {
      return res.status(result.statusCode || 404).send(result.message);
    }

    return res.render("admin/editProduct", result.data);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server Issue! Wont able to get Product Info!");
  }
}

export const deleteProduct = async (req, res) => {
  try {
    const result = await deleteProductService(req.params.id);

    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Failed to Unlist product"})
  }
}

export const restoreProduct = async (req, res) => {
  try {
    const result = await restoreProductService(req.params.id);

    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    return res.status(500).json({success: false,message: "Server Error!"})
  }
}