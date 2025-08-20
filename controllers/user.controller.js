import Joi from "joi";
import userServiceObj from "../services/user.services";
import moment from 'moment'
import { UserSchema } from "../helper/validator/user.validator";


const options = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
}

class userController {

    async register(req, res) {
        try {
            let { error } = UserSchema.validate(req.body, options)
            if (error) {
                return res.status(400).json({ message: error?.details[0]?.message, statusCode: 400, success: false })
            }
            await userServiceObj.regsiter(req, res)
        } catch (error) {
            return res.status(500).json({ message: error?.message, statusCode: 500, success: false })
        }
    }
}
const userControllerObj = new userController()

export default userControllerObj