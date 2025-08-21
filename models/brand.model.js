import { Sequelize, DataTypes } from 'sequelize'
import dbconnection from '../config/dbconfig.js'

const brandModel = dbconnection.define(
    'brand', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
    title: { type: DataTypes.STRING, required: true },
    slug: { type: DataTypes.STRING, required: false, allowNull: true },
    description: { type: DataTypes.STRING, required: true },
    images: { type: DataTypes.JSON, required: false, allowNull: true },
    status: { Type: DataTypes.ENUM("active", 'inactive'), defaultValue: "active" },

    created_by: { type: DataTypes.STRING, allowNull: true },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, { timestamps: false, tableName: 'brand' }
)
export default brandModel