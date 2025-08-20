import Joi from "joi";

export const UserSchema = Joi.object({
    shop_name: Joi.string().min(3).max(30).required().label("shop_name"),
    phone_number: Joi.string().max(16).required().label("phone_number"),
    address: Joi.string().required().max(90).label("address"),
    password: Joi.string().min(4).required().label('password')
})



export const USerLoginSchema = Joi.object({
    phone_number: Joi.string()
        .trim()
        .required()
        .label('phone_number'),
    password: Joi.string()
        .trim().
        min(3).max(50)
        .required()
        .label('password')
});

