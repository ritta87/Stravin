import User from "../models/userModel.js";
const userAuth = async (req, res, next) => {
  if (req.session && req.session.userId) {
    const user = await User.findById(req.session.userId);
    if (!user || user.isBlocked) {
      req.session.destroy();
      return res.redirect('/login');
    }

    next()
  } 
  else {
    return res.redirect('/login');
  }
}

export default userAuth;
