import dotenv from 'dotenv' 
dotenv.config()


import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import path from 'path'
import MongoStore from 'connect-mongo'
import methodOverride from 'method-override';
import { fileURLToPath } from "url";
import User from './models/userModel.js';
import passport from "./config/passport.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import adminRoutes from './routes/adminRoutes.js'
import userRoutes from './routes/userRoutes.js'
import googleAuthRoute from "./routes/googleAuthRoute.js"



//port setup
const PORT = process.env.PORT || 7111

//Mongo database 
import connectToDb from './config/db.js'
connectToDb()

const app=express()
//ejs setup..
app.set('view engine','ejs')


//middlewares
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"));
app.use(cookieParser())
app.use(methodOverride('_method'))
//breadcrumbs middleware.
app.use((req, res, next) => {
  const pathParts = req.originalUrl.split('?')[0].split('/').filter(Boolean)

  let breadcrumbs = [{ name: "Home", url: "/" }];
  let currentPath = "";

  pathParts.forEach((part) => {
    currentPath += `/${part}`;
    let name = part.charAt(0).toUpperCase() + part.slice(1);

    breadcrumbs.push({
      name,
      url: currentPath
    });
  });

  res.locals.breadcrumbs = breadcrumbs;
  next();
});
//session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,   
  }),

  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  }
}))



app.use(async (req, res, next) => {
  res.locals.isLoggedIn = !!req.session.userId;
  if (req.session.userId) {
    const user = await User.findById(req.session.userId);
    res.locals.user = user;
  }

  next();
});

//passport
app.use(passport.initialize())
app.use(passport.session())

//Routes setup 
app.use('/auth',googleAuthRoute);
app.use('/admin',adminRoutes)
app.use('/',userRoutes)



app.use((req,res)=>{
    res.status(404).render('user/404')
})




app.listen(PORT,()=>{
    console.log(`Server connected at http://localhost:${PORT}`)
})