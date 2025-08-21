import express from 'express'
import dotenv from 'dotenv'
import userRoutes from './routes/user.routes.js'
import { environmentVar } from './config/environmentVariable.js'

dotenv.config()

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/hellow", (req, res) => {
    return res.status(200).json({ message: "success message" })
})
app.use("/user", userRoutes)

app.listen(environmentVar.PORT, (res, err) => {
    console.log(`success listening to port : ${environmentVar.PORT}`)
})

