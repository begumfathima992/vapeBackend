import express from 'express'
import dotenv from 'dotenv'
import userRoutes from './routes/user.routes.js'
import { environmentVar } from './config/environmentVariable.js'
import productRoutes from './routes/product.routes.js'
import cartRoutes from './routes/cart.routes.js'

dotenv.config()

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/hellow", (req, res) => {
    return res.status(200).json({ message: "success message" })
})

app.use("/user", userRoutes)
app.use("/product", productRoutes)
app.use("/cart", cartRoutes)

app.listen(environmentVar.PORT, (res, err) => {
    console.log(`success listening to port : ${environmentVar.PORT}`)
})

