import { Sequelize, DataTypes } from 'sequelize'
import dbconnection from '../config/dbconfig.js'

const wishlistModel = dbconnection.define(
    'wishlist', {
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    // product_variant_id: {
    //     type: DataTypes.BIGINT,
    //     allowNull: false,
    // },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, { timestamps: false, tableName: 'wishlist' }
)
export default wishlistModel