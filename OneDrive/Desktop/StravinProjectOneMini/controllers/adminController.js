import mongoose from "mongoose";

import jwt from 'jsonwebtoken'

import cookieParser  from "cookie-parser";

export const adminLogin = async(req,res)=>{

        const {email,password } = req.body

        const admin_email = process.env.ADMIN_EMAIL
        const admin_password = process.env.ADMIN_PASSWORD
        if(admin_email!==email||admin_password!==password){
            return res.status(400).json({message:"Invalid credentials!"})
        }
        
        const token = jwt.sign({
            email,
            role:"admin"},
            process.env.JWT_SECRET,
        )
        res.cookie("token",token,{
            httpOnly:true,
            secure:false,
            maxAge: 1 * 60 * 60 * 1000 
        })

res.redirect('/admin/dashboard')
}

export const getAdminDashboard = async(req,res)=>{
    res.render('admin/dashboard',{admin:req.admin})
}

export const adminLogout=async(req,res)=>{
    res.clearCookie('token')
    res.redirect('/admin/login')
}


