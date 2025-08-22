import express from 'express'
import { authorize, authorize_optional } from '../helper/auth.js'
import productControllerObj from '../controllers/product.controller.js'

const productRoutes = express.Router()

productRoutes.get('/get',authorize_optional,productControllerObj.get)
export default productRoutes