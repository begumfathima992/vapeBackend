import express from 'express'
import dotenv from 'dotenv'
import userRoutes from './routes/user.routes.js'
dotenv.config()

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/hellow", (req, res) => {
    return res.status(200).json({ message: "success message" })
})
app.use("/user", userRoutes)

app.listen(process.env.PORT, (res, err) => {
    if (err) {
        console.log(err, "erro occurred while connecting the site")
        return
    }
    console.log(`success listening to port : ${process.env.PORT}`)
})

