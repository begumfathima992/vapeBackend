import userServiceObj from "../services/user.services";

class userController {
    async register(req, res) {
        try {

        } catch (error) {
            return res.status(500).json({ message: error?.message, statusCode: 500, success: false })
        }
    }
}