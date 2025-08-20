import { Sequelize, DataTypes } from 'sequelize'
import dbconnection from '../config/dbconfig'

const userModel = dbconnection.define(
    'user', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
    shop_name: { type: DataTypes.STRING, required: true },
    phone_number: { type: DataTypes.STRING, required: true },
    address: { type: DataTypes.STRING, required: true }
}, { timestamps: false, tableName: 'user' }
)
export default userModel