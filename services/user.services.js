import { encryptStringWithKey } from "../helper/extra.js";
import userModel from "../models/user.model.js";
let salt = 10
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

class UserService {
    async regsiter(req, res) {
        try {
            let { phone_number, address, shop_name } = req.body
            // console.log(req.body,'req.bodyyyyyyy')
            let findPhoneExist = await userModel.findOne({ where: { phone_number: phone_number }, raw: true, attribute: ['id'] })
            // console.log(findPhoneExist,'findPhoneExistfindPhoneExist')
            if (findPhoneExist && findPhoneExist?.id) {
                return res.status(400).json({ message: `This phone is already register, kindly login your account`, statusCode: 400, success: false })
            }
            let temp_p = await encryptStringWithKey((Math.round(Math.random() * 40000780) + shop_name).toLowerCase());
            temp_p = temp_p?.slice(0, 6)
            let encrypt = await bcrypt.hash(temp_p, salt);
            console.log(encrypt, 'encrypt,encrypt,encrypt,', temp_p)
            return
            let obj = {
                phone_number, shop_name, address, password: encrypt,
            }
            await userModel.create(obj)
            return res.status(201).json({ message: "Register success", statusCode: 201, success: true })
        } catch (error) {
            console.log(error, "eororrororo")
            return res.status(500).json({ message: error?.message, statusCode: 500, success: false })
        }
    }

}
const userServiceObj = new UserService()

export default userServiceObj