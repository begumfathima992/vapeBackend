

import BrandControllerObj from "../controllers/brand.controller.js";
import express from 'express'

const BrandRoutes = express.Router()
BrandRoutes.get('/get',BrandControllerObj.get)

export default BrandRoutes