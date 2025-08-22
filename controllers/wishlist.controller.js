import { wishlistSchema } from "../helper/validator/wishlist.validator.js";
import WishlistServicesObj from "../services/wishlist.service.js";
const options = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
};

class WishlistController {
    async add_or_remove_to_wishlist(req, res) {
        try {
            
            let { error } = wishlistSchema.validate(req.body, options);
            if (error) {
                return res.status(400).json({
                    message: error.details[0]?.message,
                    success: false,
                    statusCode: 400,
                });
            }

            await WishlistServicesObj.AddOrRemoveToWishlist(req, res);
        } catch (err) {
            return res
                .status(500)
                .json({ message: err?.message, success: false, statusCode: 500 });
        }
    }

    async emptywishlistdata(req, res) {
        try {

            await WishlistServicesObj.emptyWishlistData(req, res)
        } catch (err) {
            return res
                .status(500)
                .json({ message: err?.message, statusCode: 500, success: false });
        }
    }

    async fetchwishlistdata(req, res) {
        try {
            await WishlistServicesObj.fetchWishlistData(req, res);
        } catch (err) {
            return res
                .status(500)
                .json({ message: err?.message, success: false, statusCode: 500 });
        }
    }
}
const WishlistControllerObj = new WishlistController();
export default WishlistControllerObj;
