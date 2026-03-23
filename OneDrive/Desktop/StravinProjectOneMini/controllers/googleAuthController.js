import jwt from 'jsonwebtoken'

export const googleCallbackController = async(req,res)=>{
    try{
        const user=req.user;
        const token=jwt.sign(
            {
            id:user._id,
            email:user.email
            },process.env.JWT_SECRET,{expiresIn:'7d'}
    )
    res.redirect(`${process.env.FRONTEND_URL}/google-success?token=${token}`)
    }catch(error){
        console.log('callback error',error)
        res.redirect('/login')
    }
}