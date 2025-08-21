import { config } from 'dotenv'

config()
export const environmentVar = {
    PORT: process.env.PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    SECRET_VALUE: process.env.SECRET_VALUE,
}

