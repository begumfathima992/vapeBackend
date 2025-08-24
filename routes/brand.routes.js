

import BrandControllerObj from "../controllers/brand.controller.js";
import express from 'express'
import { responseHandleMiddleware } from "../helper/responseHandleMiddleware.js";

const BrandRoutes = express.Router()
BrandRoutes.get('/get',BrandControllerObj.get)
BrandRoutes.get('/get_sub_brand',BrandControllerObj.getSubBrandByBrandId,responseHandleMiddleware)


export default BrandRoutes