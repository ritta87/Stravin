

const userAuth = (req, res, next) => {
  if (req.session&&req.session.userId) {
    next();
  }else{
  return res.status(401).json({success:false,message:"Please Login first!"})
}
};

export default userAuth;
