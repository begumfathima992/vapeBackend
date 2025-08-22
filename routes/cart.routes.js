import express from "express";
import CartControllerObj from "../controllers/cart.controller.js";
import { authorize } from "../helper/auth.js";
import { responseHandleMiddleware } from "../helper/responseHandleMiddleware.js";

const cartRoutes = express.Router();
cartRoutes.post("/add", authorize, CartControllerObj.add_product_cart, responseHandleMiddleware);
cartRoutes.delete("/delete_from_cart", authorize, CartControllerObj.deleteProduct, responseHandleMiddleware);
cartRoutes.delete("/empty_cart", authorize, CartControllerObj.emptyCart, responseHandleMiddleware);
cartRoutes.get("/fetch_data", authorize, CartControllerObj.fetch_data, responseHandleMiddleware);


cartRoutes.patch("/update_quantity", authorize, CartControllerObj.update_quantity, responseHandleMiddleware);

//fetch cart data
// cartRoutes.get("/revert_data_to_cart", authorize, CartControllerObj.revert_data_to_cart, responseHandleMiddleware);

export default cartRoutes;
