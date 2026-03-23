
import jwt from 'jsonwebtoken'

const adminAuth = (req,res,next)=>{
    const token = req.cookies.token;
    if(!token){
       return res.redirect('/admin/login')
    }
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        req.admin=decoded;
        next();
    }catch(error){
        return res.redirect('adminLogin')
    }
}
export default adminAuth
