import {getVariantByProductService,addVariantService,updateVariantService,
  unlistVariantService,restoreVariantService} from "../services/variantService.js";

export const getVariantByProduct = async (req, res) => {
  try {
    const result = await getVariantByProductService(req);

    if (!result.success) {
      return res.status(result.statusCode || 404).send(result.message);
    }

    return res.render("admin/variants", result.data);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.message);
  }
}

export const addVariant = async (req, res) => {
  try {
    const result = await addVariantService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({success: false,message: error.message})
  }
}

export const updateVariant = async (req, res) => {
  try {
    const result = await updateVariantService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (err) {
    console.error("Update variant error:", err);
    return res.status(500).json({success: false,message: err.message})
  }
}

export const unlistVariant = async (req, res) => {
  try {
    const result = await unlistVariantService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    return res.status(500).json({success: false,message: "Server crashed"})
  }
}

export const restoreVariant = async (req, res) => {
  try {
    const result = await restoreVariantService(req);
    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    return res.status(500).json({success: false,message: "Server issue!"})
  }
}




