import express from 'express'
import userControllerObj from '../controllers/user.controller'
const userRoutes=express.Router()

userRoutes.post("/register",userControllerObj.register)
export default userRoutes