import { encryptStringWithKey, generateAccessToken } from "../helper/extra.js";
import userModel from "../models/user.model.js";
let salt = 10
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

class UserService {
    async regsiter(req, res) {
        try {
            let { phone_number, address, shop_name, password } = req.body
            // console.log(req.body,'req.bodyyyyyyy')

            let findPhoneExist = await userModel.findOne({ where: { phone_number: phone_number }, raw: true, attribute: ['id'] })
            if (findPhoneExist && findPhoneExist?.id) {
                return res.status(400).json({ message: `This Phone : ${phone_number} is already register, kindly login your account`, statusCode: 400, success: false })
            }

            // password = await encryptStringWithKey((Math.round(Math.random() * 40000780) + shop_name).toLowerCase());
            // password = temp_p?.slice(0, 6)

            let encrypt = await bcrypt.hash(password, salt);
            // console.log(encrypt, 'encrypt,encrypt,encrypt,', 'temp_p')
            // return
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

    // generateAccessTok
    async login(req, res) {
        try {
            // console.log("first", req.body)

            let { phone_number, password } = req.body

            let find = await userModel.findOne({ where: { phone_number }, raw: true })
            // console.log(find, "findEmailfindEmail")

            if (!find) {
                return res.status(400).json({ message: "User not found, kindly register first", success: false, statusCode: 400 })
            }
            // console.log(find, "findemali")
            let checkpassword = await bcrypt.compare(password, find?.password);
            // console.log(checkpassword, "checkpassword ")

            if (!checkpassword) {
                res.status(400).json({ message: "Password is not valid", success: false, statusCode: 400 })
                return;
            }

            delete find.password
            delete find.access_token
            let generateToken = generateAccessToken(find)
            let access_token = generateAccessToken(find)

            await userModel?.update({ access_token: access_token }, { where: { id: find?.id } })

            find.token = generateToken
            find.access_token = access_token

            return res.status(200).json({ mesage: "Login Success", data: find, statusCode: 200, success: true })
        } catch (error) {
            console.log(error)
            return res.status(500).json({ message: error?.message, statusCode: 500, success: false })
        }
    }


    async logout(req, res) {
        try {
            let user_obj = req.userData
            let findUSer = await userModel?.findOne({ where: { id: user_obj?.id } })
            if (!findUSer) {
                return res.status(400).json({ message: "user not found" })
            }
            await userModel?.update({ access_token: null }, { where: { id: user_obj?.id } })
            return res.status(200).json({ message: "logout success" })
        }
        catch (error) {
            console.log(error, "errorerror")
            return res.status(500).json({ message: error?.message })
        }
    }

}
const userServiceObj = new UserService()

export default userServiceObj