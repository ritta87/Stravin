import dotenv from 'dotenv' 
dotenv.config()
import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import methodOverride from 'method-override'
import { fileURLToPath } from "url"

import passport from "./config/passport.js"
import connectToDb from './config/db.js'
import sessionMiddleware from './config/sessionConfig.js'

import { breadcrumps } from './middleware/breadcrumb.js'
import { localsMiddleware } from './middleware/localsMiddleware.js'
import { notFound } from './middleware/notFound.js'

import adminRoutes from './routes/adminRoutes.js'
import userRoutes from './routes/userRoutes.js'
import googleAuthRoute from "./routes/googleAuthRoute.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 7111
connectToDb()
const app = express()

app.set('view engine', 'ejs')

// middlewares
app.use(express.static(path.join(__dirname, "public")))
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(methodOverride('_method'))

app.use(sessionMiddleware)
app.use(localsMiddleware)
app.use(breadcrumps)

//passport
app.use(passport.initialize())
app.use(passport.session())

//routes
app.use('/auth', googleAuthRoute)
app.use('/admin', adminRoutes)
app.use('/', userRoutes)

//404
app.use(notFound)

app.listen(PORT, () => {
  console.log(`Server connected at http://localhost:${PORT}`)
})