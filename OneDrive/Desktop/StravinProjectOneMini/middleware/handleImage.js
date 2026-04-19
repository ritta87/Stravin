import { upload } from "../middleware/multer.js";

export const handleImage = (req, res, next) => {
  upload.array("images", 4)(req, res, function (err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};