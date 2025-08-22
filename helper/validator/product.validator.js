import Joi from "joi";

export const getProductSchema = Joi.object({
    page: Joi.number().optional().label("shop_name"),
    limit: Joi.number().optional().label("limit"),
})


