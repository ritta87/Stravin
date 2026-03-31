import express from "express";
import multer from "multer";
import path from 'path'
const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/profilePics'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });
import userAuth from '../middleware/userAuth.js'
import { getSignupPage , userSignup , verifyOtp , getVerifyOtp ,
   resendOtp , getLoginPage , userLogin ,
    getForgotPassword , forgotPassword ,
getResetPassword , resetPassword } from "../controllers/userController.js";

import {loadHome ,loadShop, getAllProductsForHome , loadSingleProduct , listedCategories , userLogout } from '../controllers/homeController.js';
import { addToCart  ,getCartItems , getCartCount , updateCartQty , removeCartItem}
 from '../controllers/cartController.js';
import {getWishlistPage , addToWishlist, moveToCartFromWishlist, removeFromWishlist } from '../controllers/wishlistController.js'
import {getUserProfile,getEditProfile,editprofile,verifyEmailOtp,sendEmailOtp,getChangePassword,changePassword} from '../controllers/profileController.js'

import {getUserAddress , getAddAddress , addUserAddress,getEditAddress,postEditAddress,deleteAddress, setDefaultAddress }
 from '../controllers/addressController.js'

 import {getCheckoutPage} from '../controllers/checkoutController.js'
import {placeOrder, getOrderSuccess,getUserOrder,getOrderDetails, cancelOrder,returnItem,downloadInvoice,verifyPayment}
 from '../controllers/orderController.js'

import { getWallet,createWalletPayment,verifyWalletPayment } from "../controllers/walletController.js";

import { noCache } from "../middleware/no-cache.js";
router.use(noCache)

router.get("/signup", getSignupPage)
router.post('/signup', userSignup)
router.get('/verifyOtp',getVerifyOtp)
router.post('/verifyOtp',verifyOtp)
router.post('/resendOtp',resendOtp)
router.get('/login',getLoginPage)
router.post('/login',userLogin)
router.get('/forgotPassword',getForgotPassword)
router.post('/forgotPassword',forgotPassword)
router.get('/resetPassword',getResetPassword)
router.post('/resetPassword',resetPassword)


router.get('/',userAuth,loadHome)
router.get("/products",userAuth,getAllProductsForHome);
router.get('/product/:id',userAuth,loadSingleProduct)
router.get('/listedCategories',userAuth,listedCategories)

router.get('/shop',userAuth,loadShop)

router.post('/addtocart',userAuth,addToCart)
router.get('/cart',userAuth,getCartItems)
router.get('/cart/count',userAuth,getCartCount)
router.post('/cart/update', userAuth,updateCartQty)
router.post('/cart/remove', userAuth,removeCartItem)

router.get('/wishlist',userAuth,getWishlistPage)
router.post('/addToWishlist',userAuth,addToWishlist);
router.post('/wishlist/moveToCart',userAuth,moveToCartFromWishlist)
router.post('/wishlist/remove',userAuth,removeFromWishlist)

router.get('/profile',userAuth,getUserProfile)
router.get('/profile/address',userAuth,getUserAddress)
router.get('/profile/address/add',userAuth,getAddAddress)
router.post('/profile/address/add',userAuth,addUserAddress)
router.get('/profile/address/edit/:id',userAuth,getEditAddress)
router.put('/profile/address/edit/:id',userAuth,postEditAddress)
router.delete('/profile/address/delete/:id',userAuth,deleteAddress)
router.put('/profile/address/default/:id',userAuth,setDefaultAddress)
router.get('/profile/edit',userAuth,getEditProfile)
router.post('/profile/edit',userAuth,upload.single('profileImage'),editprofile)
router.post('/profile/verify-email-otp', userAuth,verifyEmailOtp)
router.post('/profile/send-email-otp', userAuth,sendEmailOtp)
router.get('/profile/changePassword',userAuth,getChangePassword)
router.post('/profile/changePassword', userAuth, changePassword);

router.get('/checkout',userAuth,getCheckoutPage)

router.post('/placeOrder',userAuth,placeOrder)
router.get('/orderSuccess/:orderId',userAuth,getOrderSuccess)
router.get('/orders',userAuth,getUserOrder)
router.get('/viewOrder/:orderId',userAuth,getOrderDetails)
router.post('/cancelOrder/:orderId',userAuth,cancelOrder);
router.post('/returnItem/:orderId/:itemId',userAuth,returnItem)
router.get('/orders/:orderId/invoice',userAuth,downloadInvoice)
router.post('/verifyPayment',userAuth,verifyPayment)

router.get('/wallet',userAuth,getWallet);
router.post('/createWalletPayment',userAuth,createWalletPayment)
router.post('/verifyWalletPayment',userAuth,verifyWalletPayment)


router.get('/logout',userLogout)

export default router
