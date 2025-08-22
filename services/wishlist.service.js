import { Op } from "sequelize";

import wishlistModel from "../models/wishlist.model.js";
import productModel from "../models/product.model.js";
import dbconnection from "../config/dbconfig.js";

class wishlistServices {
    async AddOrRemoveToWishlist(req, res) {
        try {
            const { product_id, } = req?.body;

            let findProductData = await productModel.findOne({
                where: { id: product_id, status: 'active', is_deleted: 0 },
                // attributes: ['id', 'title', 'brand_id'],
                raw: true,
            });
            if (!findProductData) {
                return res.status(400).json({
                    message: "Product not found",
                    statusCode: 400,
                    success: false,
                });
            }
            let user_id = req.userData.id;

            let findWishlistItem = await wishlistModel.findOne({
                where: { user_id: user_id, product_id },
                attributes: ['id'],
                raw: true,
            });

            // console.log(findWishlistItem, "findwishlistitem--->>>>>>>>>>")

            if (findWishlistItem && findWishlistItem?.id) {
                await wishlistModel.destroy(
                    { where: { id: findWishlistItem?.id } }
                );
                res.status(200).json({
                    message: "Product Removed From Wishlist Successfully",
                    statusCode: 200,
                    success: true,
                });
            } else {

                await wishlistModel.create({
                    user_id: user_id,
                    product_id,
                });
                console.log("aaaaaaaaaaaafirst ")
                res.status(201).json({
                    message: "Product Added To Wishlist",
                    statusCode: 201,
                    success: true,
                });
            }
            return
        } catch (err) {
            console.error(err, "add or remove wishlist product");
            return res
                .status(500)
                .json({ message: err?.message, success: false, statusCode: 500 });
        }
    }

    async emptyWishlistData(req, res) {
        try {
            let findWishlistItem = await wishlistModel.destroy({
                where: { user_id: req.userData?.id },
            });

            if (findWishlistItem) {
                return res.status(200).json({
                    message: "Wishlist Empty Success",
                    statuscode: 200,
                    success: true,
                });
            } else {
                return res.status(404).json({
                    message: "No items found in wishlist",
                    statusCode: 404,
                    success: false,
                });
            }
        } catch (err) {
            console.error(err, 'at the time empty wishlist');
            return res
                .status(500)
                .json({ message: err?.message, success: false, statusCode: 500 });
        }
    }

    async fetchWishlistData(req, res) {
        try {
            let user_id = req.userData.id;

            const { searchKeyword, product_id } = req.query; // Extracting query params
            const page = parseInt(req.query.page) || 1; // Get page number from query or default to 1
            const limit = parseInt(req.query.limit) || 10; // Get limit from query or default to 10
            const offset = (page - 1) * limit; // Calculate offset

            let query = `
  SELECT
    w.id AS wishlist_id,
    w.product_id,
    w.user_id,
    p.id AS product_id,
    JSON_OBJECT(
      'id', p.id,
      'title', p.title,
      'description', p.description,
      'images', p.images,
      'universal_standard_code', p.universal_standard_code,
      'status', p.status
    ) AS findProductObj
  FROM wishlist w
  INNER JOIN product p
  ON p.id = w.product_id
  WHERE w.user_id = :user_id

`;

            // Adding conditions dynamically
            let replacements = { user_id: user_id };

            if (searchKeyword) {
     query += `
    AND (
      p.title LIKE :searchKeyword COLLATE utf8mb4_unicode_ci OR
      p.description LIKE :searchKeyword COLLATE utf8mb4_unicode_ci
    )
  `;
                replacements.searchKeyword = `%${searchKeyword}%`; // For fuzzy search
            }

            if (product_id) {
                query += ` AND p.id = :product_id COLLATE utf8mb4_unicode_ci`;
                replacements.product_id = product_id;
            }
// Now add group/order/limit
query += `
  GROUP BY p.id, w.id
  ORDER BY w.id DESC
  LIMIT :limit OFFSET :offset
`;

            let productsData = await dbconnection.query(query, {
                replacements: { ...replacements, limit, offset },
                type: dbconnection.QueryTypes.SELECT,
                raw: true
            });

            // Query for total number of items (without pagination)
            let countQuery = `
  SELECT COUNT(DISTINCT p.id) AS totalItems
  FROM wishlist w
  INNER JOIN product p
    ON p.id = w.product_id 
  WHERE w.user_id = :user_id
`;

            let countReplacements = { user_id: user_id };

            if (searchKeyword) {
                countQuery += ` AND (
    p.title LIKE :searchKeyword COLLATE utf8mb4_unicode_ci OR
    p.description LIKE :searchKeyword COLLATE utf8mb4_unicode_ci 
  )`;
                countReplacements.searchKeyword = `%${searchKeyword}%`;
            }

            if (product_id) {
                countQuery += ` AND p.id = :product_id COLLATE utf8mb4_unicode_ci`;
                countReplacements.product_id = product_id;
            }

            let countResult = await dbconnection.query(countQuery, {
                replacements: countReplacements,
                type: dbconnection.QueryTypes.SELECT,
                raw: true
            });

            const totalItems = countResult[0]?.totalItems || 0;
            const totalPages = Math.ceil(totalItems / limit);

            res.status(200).json({
                message: "Fetch Data",
                data: productsData,
                paginated: {
                    currentPage: page,
                    totalItems,
                    totalPages,
                },
                statusCode: 200,
                success: true,
            });
            return
        } catch (error) {
            console.log(error, "@$ fetch wishlist  ")
            res.status(500).json({
                message: "Error fetching data",
                error: error.message,
                statusCode: 500,
                success: false
            });
            return
        }
    }

}

const WishlistServicesObj = new wishlistServices();
export default WishlistServicesObj;
