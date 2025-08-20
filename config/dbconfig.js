import { config } from 'dotenv'
import { Sequelize } from 'sequelize'

config()
const dbconnection = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD, {

    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialectOptions: {
        timezone: "local",
    },
    // timezone: "+00:00",
    // timezone: "Z",
    dialect: 'mysql',
    define: {
        timestamps: true
    },
    pool: {
        max: 15,
        min: 0,
        maxIdleTime: 1000,
        acquire: 30000000,
        idle: 100000000
    },
    logging: false
}

)
export default dbconnection