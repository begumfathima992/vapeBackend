import { QueryTypes, Sequelize } from "sequelize"
import dbconnection from "../config/dbconfig.js"

class Product {
    async get(req, res) {
        try {
            let userData = req.userData
            let page = +req.query.page||1
            let limit = +req.query.limit||10
           let offset=(page-1)*limit 

            let str = `
            SELECT p.id,
            p.title,
            p.description,
            p.images,
            p.brand_id,
            JSON_OBJECT(
            'id',b.id,
            'title',b.title,
            'status',b.status,
            'images',b.images,
            'description',b.description
        ) AS brandObj
            
             FROM product p 
             LEFT JOIN brand b
             ON p.brand_id = b.id
             AND b.status = 'active'
             WHERE p.status = 'active'
             AND p.is_deleted = 0
             ORDER BY p.id DESC
             LIMIT :limit OFFSET :offset
            `
            let get = await dbconnection.query(str,
                {    replacements:{limit,offset}, type: QueryTypes.SELECT })
                
get.forEach((a,b)=>{
    if(a?.brandObj?.id==null){
        a.brandObj={}
    }
    return a
})
            return res.status(200).json({ message: "Get Product List", data: get, statusCode: 200, success: true })
        } catch (error) {
            console.log(error,'get product er')
            return res.status(500).json({ message: error?.message, statusCode: 500, success: false })
        }
    }
}
const ProductServicesObj = new Product()
export default ProductServicesObj
















// let str = `SELECT title, description, brand_id ,id,images
             // FROM product 
             // WHERE status ='active' AND is_deleted = 0 
             // ORDER BY  id DESC `


