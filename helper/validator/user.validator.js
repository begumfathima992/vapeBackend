import Joi from "joi";

export const UserSchema = Joi.object({
    shop_name: Joi.string().min(3).max(30).required().label("shop_name"),
    phone: Joi.string().max(16).required().label("phone_number"),
    adddress: Joi.string().required().max(90).label("address")
})

