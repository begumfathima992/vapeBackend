import userModel from "../models/user.model";

class UserService {
    async regsiter(req, res) {
        try {
            let { phone_number, address, shop_name } = req.body
            let findPhoneExist = await userModel.findOne({ where: { phone_number: phone_number }, raw: true, attribute: ['id'] })
            if (findPhoneExist && findPhoneExist?.id) {
                return res.status(400).json({ message: `This phone is already register, kindly login your account`, statusCode: 400, success: false })
            }
            let obj = {
                phone_number, shop_name, address
            }
            await userModel.create(obj)
            return res.status(201).json({ message: "Register success", statusCode: 201, success: true })
        } catch (error) {
            return res.status(500).json({ message: error?.message, statusCode: 500, success: false })
        }
    }
}
const userServiceObj = new UserService()

export default userServiceObj