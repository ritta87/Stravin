import User from "../models/userModel.js";

export const localsMiddleware = async (req, res, next) => {
  try {
    res.locals.isLoggedIn = !!req.session.userId;
    res.locals.user = null;

    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      res.locals.user = user;
    }

    next();
  } catch (error) {
    next(error);
  }
}