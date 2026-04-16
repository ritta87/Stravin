import express from 'express'
import mongoose from 'mongoose'
const router = express.Router()
import { upload } from '../middleware/multer.js';

import adminAuth from '../middleware/authMiddleware.js'

import { adminLogin, adminLogout, getAdminDashboard } from "../controllers/adminController.js";

import { AddCategories , getAllCategories , getEditCategory  , updateCategory, deleteCategory, restoreCategory} 
from '../controllers/categoryController.js';

import {getAllProducts, addProduct,GetAddProduct, getEditProduct, updateProduct, deleteProduct ,restoreProduct} 
from '../controllers/productController.js'

import {addVariant , getVariantByProduct ,restoreVariant,unlistVariant,updateVariant } from '../controllers/variantController.js'

import {getAllCustomers , blockCustomer , unblockcustomer } from '../controllers/customerController.js'

import { getAllOrders,viewOrderDetails,updateStatus, handleReturnRequest } from '../controllers/adminOrderController.js';

import { getCouponPage,addCoupon,addCouponPage,getEditCoupon,editCoupon,deleteCoupon} from '../controllers/couponController.js';

import { loadSalesReport } from '../controllers/salesReportController.js';
import { noCache } from '../middleware/no-cache.js'
router.use(noCache)


router.get('/login',(req,res)=>{
    res.render('admin/adminLogin')
})
router.post('/login',adminLogin)
router.get('/dashboard',adminAuth,getAdminDashboard)
router.get('/logout',adminLogout)

//category routes..
router.post('/categories/add',adminAuth,AddCategories)
router.get('/categories',adminAuth,getAllCategories,async(req,res)=>{
    try{
        const categories = await getAllCategories()
        res.render('categories',{categories:categories||[]})
    }catch(error){
        console.log(error)
        return res.status(400).json({message:"Something went wrong!"})
    }
})
router.get('/categories/:id/edit',adminAuth,getEditCategory);
router.put('/categories/:id/edit',adminAuth,updateCategory)
router.delete('/categories/:id',adminAuth,deleteCategory)
router.put('/categories/restoreCategory/:id',adminAuth,restoreCategory)

//product routes..
router.get('/products',adminAuth,getAllProducts)
router.post('/products',adminAuth,upload.array('images',4),addProduct)
router.get('/GetAddProduct',adminAuth,GetAddProduct)
router.get('/products/edit/:id',adminAuth,getEditProduct)
router.post('/products/edit/:id',upload.array("images",4),updateProduct)
router.delete('/products/:id',adminAuth,deleteProduct)
router.put('/products/restoreProduct/:id',adminAuth,restoreProduct)

//variant route here..

//creating variant for a selected product(by productId)..
router.post('/products/:productId/variants/add',adminAuth,upload.array('images',4),addVariant)
router.get('/products/:productId/variants',adminAuth,getVariantByProduct)
router.put('/variants/update/:variantId', adminAuth, upload.array('images',4), updateVariant)
router.patch('/variants/:variantId/unlist',adminAuth,unlistVariant)
router.patch('/variants/:variantId/restore',adminAuth,restoreVariant)


//customer management routes..
router.get('/customers',adminAuth,getAllCustomers) //show all customers
router.post('/customers/block/:id',adminAuth,blockCustomer)
router.post('/customers/unblock/:id',adminAuth,unblockcustomer)

//order management..
router.get('/orders',adminAuth,getAllOrders);
router.get('/orderDetails/:orderId',adminAuth,viewOrderDetails)
router.put('/orderDetails/:orderId/item/:itemId/updateStatus',adminAuth,updateStatus)
router.post('/return/:orderId/:itemId', adminAuth,handleReturnRequest);


//coupon management..
router.get('/coupons',adminAuth,getCouponPage)
router.get('/addCoupon',adminAuth,addCouponPage)
router.post('/addCoupon',adminAuth,addCoupon)
router.get('/getEditCoupon/:id',adminAuth,getEditCoupon)
router.post('/editCoupon/:id',adminAuth,editCoupon)
router.delete('/deleteCoupon/:id',adminAuth,deleteCoupon)

//sales report managemnt......
router.get('/salesReport',adminAuth,loadSalesReport)

export default router;
