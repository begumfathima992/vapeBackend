import { subBrandSchema } from "../helper/validator/brand.validator.js";
import BrandServicesObj from "../services/brand.services.js"

const options = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
};

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

    async getSubBrandByBrandId(req, res, next) {
        try {
            let { error } = subBrandSchema.validate(req.query, options);
            if (error) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = error.details[0]?.message;
                next();
                return;
            }

            BrandServicesObj.fetchSubBrandByBrandId(req, res)
        } catch (error) {
            return res.status(500).json({
                message: error?.message, statusCode: 500, success: false
            })
        }
    }


}
const BrandControllerObj = new Brand()
export default BrandControllerObj
