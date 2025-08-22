import express from "express";
import { authorize } from "../helper/auth.js";
import WishlistControllerObj from "../controllers/wishlist.controller.js";

const WishlistRoutes = express.Router();

WishlistRoutes.post("/add_remove_wishlist", authorize, WishlistControllerObj.add_or_remove_to_wishlist);
WishlistRoutes.delete("/empty_wishlist_data", authorize, WishlistControllerObj.emptywishlistdata);
WishlistRoutes.get("/fetch_data", authorize, WishlistControllerObj.fetchwishlistdata);

export default WishlistRoutes;
