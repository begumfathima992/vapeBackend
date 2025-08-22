import Joi from "joi";

export const wishlistSchema = Joi.object({
  product_id: Joi.string().max(50).trim().required().label("productId"),
//   variant_id: Joi.string().max(50).trim().required().label("variant_Id"),
  
}).required();