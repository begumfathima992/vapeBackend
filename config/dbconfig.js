import { config } from 'dotenv'
import { Sequelize } from 'sequelize'

config()
const dbconnection = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD, {

    host: process.env.HOST,
    port: process.env.PORT,
    dialect: 'mysql',
    timezone: "+4:00",
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