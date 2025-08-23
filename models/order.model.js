import { Sequelize, DataTypes } from 'sequelize'
import dbconnection from '../config/dbconfig.js'

const orderModel = dbconnection.define(
    'order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    // pick_up_latitude: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    // },
    order_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // payment_id: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    // warehouse_id: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    // },
    // outlet_id: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    // warehouse_po_box: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true,
    // },
    // warehouse_address: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    // outlet_address: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    // pick_up_longitude: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    // },
    // drop_latitude: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    // },
    // drop_longitude: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    // },
    // vendor_details: {
    //   type: DataTypes.JSON,
    //   allowNull: false,
    // },
    // po_box: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true,
    // },
    product_arr: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    // retailer_product_arr: {
    //   type: DataTypes.JSON,
    //   allowNull: true,
    // },
    // additional_commission_rate_for_retailer: {
    //   type: DataTypes.BIGINT,
    //   allowNull: true
    // },
    // coupon_id: {
    //   type: DataTypes.BIGINT,
    //   allowNull: true,
    // },
    sub_total: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // vendor_sub_sub_total: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   defaultValue: 0
    // },
    // vendor_vat: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   defaultValue: 0
    // },
    // retailer_sub_total: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    // },
    // retailer_sub_sub_total: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   defaultValue: 0
    // },
    // retailer_vat: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   defaultValue: 0
    // },
    // retailer_discount: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   defaultValue: 0
    // },
    // retailer_commission: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   defaultValue: 0
    // },
    // remaning_amount_pay: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    surplus_balance: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    delivery_charges: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },

    payment_method: {
        type: DataTypes.ENUM(
            "Razorpay",
            "goods_on_credit",
            "pay_as_you_go",
            "advance_pay",
            "cash_on_delivery",
            "debit_card/credit_card",
            'bill_to_bill'
        ),
        allowNull: true,
        defaultValue: "cash_on_delivery",
    },
    payment_mode: {
        type: DataTypes.ENUM("cash", "bank_transfer", "payment_gateway", "other"),
        allowNull: false,
        defaultValue: "other",
    },
    payment_status: {
        type: DataTypes.ENUM("complete", "failed", "pending"),
        allowNull: false,
        defaultValue: "pending",
    },
    status: {
        type: DataTypes.ENUM(
            "pending",
            "new",
            "requested",
            "dispatched",
            "orderaccepted",
            "processing",
            "outfordelivery",
            "delivered",
            "cancelled",
            "completed",
            "return-request",
            "return-failed",
            "return-success",
            "acceptedbyFE"
        ),
        allowNull: false,
        defaultValue: "new",
    },
    pin: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // card_details: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    country_code: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "IN",//
        //       Country Code: +44
        // Country Symbol (ISO 3166-1 alpha-2): GB
    },
    card_data: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    // txn_id: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
    order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    // order_accepted_by_vendor: {
    //     type: DataTypes.DATE,
    //     defaultValue: DataTypes.NOW,
    // },
    // order_accepted_by_fe: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
    // order_rejected_by_fe: {
    //     type: DataTypes.JSON,
    //     allowNull: true,
    // },

    delivery_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // ref_id: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    shipping_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    out_for_delivery_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    delivery_instructions: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // payment_id: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
    // apiHit: {
    //     type: DataTypes.INTEGER,
    //     defaultValue: 0,
    // },
    // lastHitTime: {
    //     type: DataTypes.DATE,
    //     allowNull: true,
    //     defaultValue: null
    // },
    // pickupToDropDistance: {
    //     type: DataTypes.STRING,
    // },
    // grn_image: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
    notes: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // emp_id: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
    // approximation_margin: {
    //     type: DataTypes.FLOAT,
    //     allowNull: true,
    //     defaultValue: null
    // },
    // tax_invoice_raise: {
    //     type: DataTypes.BOOLEAN,
    //     allowNull: true,
    //     defaultValue: 0
    // },
    order_status_arr: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [{ status: "new", date: DataTypes.NOW }]
    },
    // request_id: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    //     defaultValue: null
    // },
    // common_order_id: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    //     defaultValue: null
    // },
    // emp_noti_count: {
    //     type: DataTypes.INTEGER,
    //     defaultValue: 0,
    // },
    // vendor_noti_count: {
    //     type: DataTypes.INTEGER,
    //     defaultValue: 0,
    // },
    admin_notes: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    // assign_to: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    //     defaultValue: null
    // },
    // foc_retailer_vat: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    //     defaultValue: 0
    // },
    // foc_vendor_vat: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    //     defaultValue: 0
    // },
    // retailer_discount_obj: {
    //     type: DataTypes.JSON,
    //     allowNull: true,
    // },
    collect_money: {
        type: DataTypes.STRING,
        allowNull: true,
    },

}, { timestamps: false, tableName: 'order' }
)
export default orderModel