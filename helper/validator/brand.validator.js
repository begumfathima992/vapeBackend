import Joi from "joi";

export const subBrandSchema = Joi.object({
  brand_id: Joi.number().required().label("brand_id"),
}).required().min(1).label("Data");

