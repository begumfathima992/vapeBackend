import { Sequelize, DataTypes } from 'sequelize'
import dbconnection from '../config/dbconfig.js'

const userModel = dbconnection.define(
    'user', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
    shop_name: { type: DataTypes.STRING, required: true },
    phone_number: { type: DataTypes.STRING, required: true },
    address: { type: DataTypes.STRING, required: true },
    password: { type: DataTypes.STRING, required: true },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, { timestamps: false, tableName: 'user' }
)
export default userModel