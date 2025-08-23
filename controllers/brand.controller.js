import BrandServicesObj from "../services/brand.services.js"

class Brand {
    async get(req, res) {
        try {
            BrandServicesObj.getMainBrand(req, res)
        } catch (error) {
            return res.status(500).json({
                message: error?.message, statusCode: 500, success: false
            })
        }
    }
}
const BrandControllerObj = new Brand()
export default BrandControllerObj
