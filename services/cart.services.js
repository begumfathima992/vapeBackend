import dbconnection from "../config/dbconfig.js";
import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";

class Cart {
    async AddToCart(req, res, next) {
        try {
            let userData = req.userData

            const { product_id, quantity, } = req?.body;
            let findProductData = await productModel.findOne({
                where: { id: product_id, status: 'active', is_deleted: 0 },
                // attributes: ['id', 'status', 'is_deleted'],
                raw: true,
            });

            if (!findProductData) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Product Not Found";
                next();
                return;
            }
            let db_warehouse_quantity = findProductData?.quantity
            console.log(db_warehouse_quantity, "db_warehouse_quantity")

            if (Number(quantity) > Number(db_warehouse_quantity)) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = `Availale quantity is ${db_warehouse_quantity}`;
                next();
                return;
            } else if (Number(quantity) < findProductData?.minimum_order_quantity) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = `Minimum Order quantity is ${findProductData?.minimum_order_quantity}`;
                next();
                return;
            }

            let findCartItem = await cartModel.findOne({
                where: { user_id: userData?.id, product_id, },
                raw: true,
            });
            //  console.log(findCartItem,"findCartItemfindCartItem")
            if (findCartItem && findCartItem?.id) {
                let quantityTotal = Number(findCartItem?.quantity) + Number(quantity)
                if (findProductData?.quantity < quantityTotal) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Maximum Order Quantity is ${findProductData?.quantity}`;
                    next();
                    return;
                }
                await cartModel.update(
                    { quantity: quantityTotal },
                    { where: { id: findCartItem?.id } }
                );
                let object = {
                    cart_id: findCartItem?.id,
                    product_id
                }

                res.locals.data = object
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Quantity updated successfully";
                next();
                return
            } else {
                await cartModel.create({
                    user_id: userData?.id,
                    product_id,
                    quantity,
                });
                let findCartId = await cartModel?.findOne({
                    where: {
                        user_id: userData?.id,
                        product_id,
                    },
                    raw: true,
                    attributes: ['id']
                })
                let object = {
                    cart_id: findCartId?.id,
                    product_id
                }

                res.locals.data = object
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Product added to Cart";
                next();
                return
            }
        } catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ message: err?.message, success: false, statusCode: 500 });
        }
    }

    async deleteFromCart(req, res, next) {
        try {
            const { product_id } = req?.body;

            let user_id = req.userData.id

            let findCartItem = await cartModel.destroy({
                where: { product_id, user_id: user_id },
            });

            if (findCartItem) {
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Product Deleted From Cart";
                next();
                return;
            } else {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Product already deleted from cart";
                next();
                return;
            }
        } catch (err) {
            console.error(err, 'deleteFromCart');
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return
        }
    }

    async emptyCartData(req, res, next) {
        try {
            let user_id = req.userData.id

            let findCartItem = await cartModel.destroy({
                where: { user_id: user_id },
            });
            if (findCartItem) {
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Cart Empty Success";
                next();
                return;
            } else {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Cart Empty Already";
                next();
                return;
            }
        } catch (err) {
            console.error(err, 'empyty cart data');
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return
        }
    }

    async fetch_data(req, res, next) {
        try {

            let cartQuery = `
    SELECT
    c.id AS id,
    c.user_id,
    c.product_id,
    c.quantity,

     JSON_OBJECT(
        'id', p.id,
        'status', p.status,
        'is_deleted', p.is_deleted,
        'brand_id', p.brand_id,
        'title', p.title,
        'product_images', p.images,
         'brandObj', JSON_OBJECT(
        'id',b.id,
        'title',b.title,
        'description',b.description,
        'images',b.images 
        )
    ) AS productObj

    FROM cart c
INNER JOIN product p
ON p.id=c.product_id

LEFT JOIN brand b 
ON b.id = p.brand_id AND b.status = 1 
WHERE c.user_id = :userId
ORDER BY c.id  DESC

`;
            let user_id = req.userData.id

            let cartItems = await dbconnection.query(cartQuery, {
                replacements: { userId: user_id, },
                type: dbconnection.QueryTypes.SELECT,
                raw: true
            });

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Fetch data";
            res.locals.data = cartItems;
            next();
            return;

        } catch (err) {
            console.error(err, "An error occured during fetch cart data");
            res.locals.statusCode = 500;
            res.locals.success = true;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async update_quantity(req, res, next) {
        try {
            let userData = req.userData

            const { product_id, quantity, } = req?.body;
            let findProductData = await productModel.findOne({
                where: { id: product_id, status: 'active', is_deleted: 0 },
                // attributes: ['id', 'status', 'is_deleted'],
                raw: true,
            });

            if (!findProductData) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Product Not Found";
                next();
                return;
            }
            let db_warehouse_quantity = findProductData?.quantity
            console.log(db_warehouse_quantity, "db_warehouse_quantity")

            if (Number(quantity) > Number(db_warehouse_quantity)) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = `Availale quantity is ${db_warehouse_quantity}`;
                next();
                return;
            } else if (Number(quantity) < findProductData?.minimum_order_quantity) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = `Minimum Order quantity is ${findProductData?.minimum_order_quantity}`;
                next();
                return;
            }

            let findCartItem = await cartModel.findOne({
                where: { user_id: userData?.id, product_id, },
                raw: true,
            });
            //  console.log(findCartItem,"findCartItemfindCartItem")
            if (findCartItem && findCartItem?.id) {
                let quantityTotal = Number(quantity)
                if (findProductData?.quantity < quantityTotal) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Maximum Order Quantity is ${findProductData?.quantity}`;
                    next();
                    return;
                }
                await cartModel.update(
                    { quantity: quantityTotal },
                    { where: { id: findCartItem?.id } }
                );
                let object = {
                    cart_id: findCartItem?.id,
                    product_id
                }

                res.locals.data = object
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Quantity updated successfully";
                next();
                return
            } else {
                await cartModel.create({
                    user_id: userData?.id,
                    product_id,
                    quantity,
                });
                let findCartId = await cartModel?.findOne({
                    where: {
                        user_id: userData?.id,
                        product_id,
                    },
                    raw: true,
                    attributes: ['id']
                })
                let object = {
                    cart_id: findCartId?.id,
                    product_id
                }
                res.locals.data = object
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Product added to Cart";
                next();
                return
            }
        } catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ message: err?.message, success: false, statusCode: 500 });
        }
    }

}


const CartServiceObj = new Cart()
export default CartServiceObj