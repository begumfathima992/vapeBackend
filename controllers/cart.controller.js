import { CartSchema, deleteProductFromCartSchema } from "../helper/validator/cartValidator.js";
import CartServiceObj from "../services/cart.services.js";



const options = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
};

class CartController {
  async add_product_cart(req, res, next) {
    try {
      let { error } = CartSchema.validate(req.body, options);
      if (error) {
        res.locals.statusCode = 400;
        res.locals.success = false;
        res.locals.message = error.details[0]?.message;
        next();
        return;
      }

      await CartServiceObj.AddToCart(req, res, next);
    } catch (err) {
      console.log(err, "eeeoro in add cart")
      return res
        .status(500)
        .json({ message: err?.message, success: false, statusCode: 500 });
    }
  }

  async deleteProduct(req, res, next) {
    try {
      let { error } = deleteProductFromCartSchema.validate(req.body, options);
      if (error) {
        res.locals.statusCode = 400;
        res.locals.success = false;
        res.locals.message = error.details[0]?.message;
        next();
        return;
      }
      console.log(req.body,"e delete ")
      await CartServiceObj.deleteFromCart(req, res, next)
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message, statusCode: 500, success: false });
    }
  }
  async emptyCart(req, res, next) {
    try {
      await CartServiceObj.emptyCartData(req, res, next)
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message, statusCode: 500, success: false });
    }
  }

  async fetch_data(req, res, next) {
    try {
      await CartServiceObj.fetch_data(req, res, next);
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message, success: false, statusCode: 500 });
    }
  }



}
const CartControllerObj = new CartController();
export default CartControllerObj;
