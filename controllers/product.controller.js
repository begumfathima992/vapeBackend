import { getProductSchema } from "../helper/validator/product.validator.js"
import ProductServicesObj from "../services/product.services.js"

const options = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
}

class ProductController {
    async get(req, res) {
        try {
            let { error } = getProductSchema.validate(req.query, options)
            if (error) {
                return res.status(400).json({ message: error?.details[0]?.message, statusCode: 400, success: false })
            }
            ProductServicesObj.get(req, res)

        } catch (error) {
            return res.status(500).json({ message: error?.message, statusCode: 500, success: false })
        }
    }
}
const productControllerObj = new ProductController()

export default productControllerObj