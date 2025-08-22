import Joi from "joi";

export const CartSchema = Joi.object({
  product_id: Joi.string().max(50).trim().required().label("product"),
  quantity: Joi.number().required().label("quantity"),
}).required().min(1).label("Data");


export const deleteProductFromCartSchema = Joi.object({
  product_id: Joi.number().required().invalid('undefined')
    .label("product"),
}).required().min(1).label("Data");

export const UpdateOrderSchema = Joi.object({
  order_id: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (parseFloat(value) < 0) {
        return helpers.message("order data cannot be negative");
      }
      return value;
    })
    .required()
    .label("order id"),
  card_details: Joi.string().trim().required().label("card_details"),
  card_data: Joi.string().min(1).required().label("card_data"),
  txn_id: Joi.string().trim().required().label("txn_id"),
  delivery_instruction: Joi.string().trim().label("delivery_instruction"),
  payment_status: Joi.string()
    .trim()
    .valid("complete", "failed", "pending")
    .required()
    .label("payment_status"),
}).required();

export const update_order_status_schema = Joi.object({
  order_id: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (parseFloat(value) < 0) {
        return helpers.message("order id cannot be negative");
      }
      return value;
    })
    .required()
    .label("order id"),
  status: Joi.string().trim().valid("cancelled").required().label("status"),
}).required();

export const request_return_schema = Joi.object({
  order_id: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (parseFloat(value) < 0) {
        return helpers.message("order id cannot be negative");
      }
      return value;
    })
    .required()
    .label("order id"),
  status: Joi.string().trim().required().label("status"),
}).required();

export const cancel_order_schema = Joi.object({
  order_id: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (parseFloat(value) < 0) {
        return helpers.message("order id cannot be negative");
      }
      return value;
    })
    .required()
    .label("order id"),
}).required();

//admin
export const UpdateDeliveryDateSchema = Joi.object({
  order_id: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (parseFloat(value) < 0) {
        return helpers.message("order id cannot be negative");
      }
      return value;
    })
    .required()
    .label("order id"),
  delivery_date: Joi.date().required().min(new Date()).label("delivery_date"),
  shipping_date: Joi.date().required().min(new Date()).label("shipping_date"),
  out_for_delivery_date: Joi.date()
    .required()
    .min(new Date())
    .label("out_for_delivery_date"),
});

export const UpdateOrderStatusSchema = Joi.object({
  order_id: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (parseFloat(value) < 0) {
        return helpers.message("order id cannot be negative");
      }
      return value;
    })
    .required()
    .label("order id"),
  status: Joi.string()
    .trim()
    .valid(
      "outfordelivery",
      "new",
      "processing",
      "cancelled",
      "delivered",
      "return-failed",
      "return-success"
    )
    .required()
    .label("status"),
});

export const createPaymentIntentSchema = Joi.object({
  amount: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (parseFloat(value) < 0) {
        return helpers.message("amount cannot be negative");
      }
      return value;
    })
    .required()
    .label("amount"),
  currency: Joi.string().trim().required().label("currency"),
});


export const revertdatatoCartSchema = Joi.object({
  order_id: Joi.string().max(50).trim().required().label("order_id"),
});
