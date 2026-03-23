import Address from '../models/addressModel.js'
import Cart from '../models/cartModel.js'

export const getCheckoutPage=async(req,res)=>{
    try{
        const userId = req.session.userId;
        const cart  =await Cart.findOne({userId}).populate('items.product').populate('items.variant')
        const addresses=await Address.find({userId})

        if(!cart||cart.length===0){
            return res.redirect('/user/cart')
        }
    let subTotal=0;
    const tax = Math.round(subTotal * 0.05);
    const shipping = 50;
    const discount = 0;
        cart.items.forEach(item=>{
            subTotal+=item.price*item.quantity
        })
        const finalTotal=subTotal+tax+shipping-discount;
        res.render('user/checkout',{
            cart,addresses,subTotal,tax,shipping,discount,finalTotal})

    }catch(error){
        console.log(error)
        res.status(500).json({success:false,message:"Checkout errro!!"})

    }
}

