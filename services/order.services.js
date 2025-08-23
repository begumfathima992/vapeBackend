import { v4 as uuidv4 } from "uuid";

import OrderModel, { OrderModel_poland } from "../../models/OrderModel.js";
import ProductsModels from "../../models/ProductsModels.js";
import User from "../../models/UserModel.js";
import PaymentModel from "../../models/PaymentModel.js";
import {
    getDistance,
    groupByLocation,
    orderDetailsSendEmailToRetailer,
    orderPlaceAndSendEmailToVendor,
    orderReceivedAndSendEmailToVendor,
    generateOrderPdfForVendor,
    generateOrderPdfForRetailer,
    generateOrderPdfByDate,
    generateOrderGRNreportAfterSuccessPayment,
    generateInvoicePdf,
    generateInvoicePdfSendToRetailer,
    generateInvoicePdfSendToVendor,
    sendPinToRetailer,
    generateOrderLPOpdf,
    sendOrderCompletedEmail,
    sendOrderCancelledEmail,
    getEmailById,
    sendPaymentDetailsEmail,
    groupByLocationNew,
    getUserDataById,
    retailerDocumentsIsVerify,
    orderAcceptedEmailToRetailer,
    sendOrderCancelledByRetailerEmail,
    sendPaymentFailedEmailToRetailer,
    sendNotificationToLogistic,
    generateInvoicePdfForVendor,
    generateInvoicePdfForRetailer,
    generateTaxInvoicePdf,
    sendorderReadyForDeliveryToRetailer,
    vendorCanceledOrderOrderSendNotification,
    scheduleOrderCheckAfterThreeMinutes_notifyToEmployees,
    scheduleOrderCheckAfterEightMinutes_notifyToAdmin,
    scheduleOrderEveryOneMinutes_notifyToVendor,
    generateInvoicePDF_emp,
    orderDetailsSendEmailToemploy,
    tempgenerateInvoicePdfForRetailer,
    roundToNearestQuarter,

} from "../../helpers/common.js";
import CommissionModel from "../../models/CommissionModel.js";
import ProductVariantModel from "../../models/ProductVariantModel.js";
import WarehouseModel from "../../models/WarehouseModel.js";
import OutletModel from "../../models/OutletModel.js";
//import { client } from "../../server.js";
import axios from 'axios';
import { col, Op, Sequelize, where } from "sequelize";
import RequestProductModel from "../../models/RequestProductModel.js";
import { client } from "../../config/redisClient.js";
import dbConnection from "../../config/dbConfig.js";
import FlashSalesModel from "../../models/FlashSalesModel.js";
import sequelize from "../../config/dbConfig.js";
import PDFDocument from "pdfkit";
import {
    sendWarehouseQuantityEmail
} from "../../helpers/aswSesServices.js";
import CartModel from "../../models/CartModel.js";
import { uploadBase64ImageToS3, uploadImageToS3FunctionTwo, uploadImageToS3New } from "../../helpers/s3.js";
import { environmentVars } from "../../config/environmentVar.js";
let bucketName = environmentVars?.S3_BUCKET_DOCUMENTS;
let region = process.env?.Aws_region;
import { send_whatsApp_noti_assigned_employee, sendNotification, sendWhatsAppMessages } from "../../middlewares/pushNotification.js";
import orderComplain from "../../models/OrderComplainModel.js";
import NotificationDataModel from '../../models/NotificationDataModel.js';
import crypto, { createCipheriv, createHash } from 'crypto';
import nodeCCAvenue from 'node-ccavenue';
import UserDetailsModel from "../../models/UserDetailsModel.js";
import UserModel from "../../models/UserModel.js";
import UserCreditTransactionModel from "../../models/UserCreditTransactionModel.js";
import GoodsOnCreditModel from "../../models/GoodsOnCreditModel.js";
import { COUNTRIES, ORDER_STATUS, REDIS_KEY, USERS } from "../../helpers/staticData.js";
import { redis } from "../../server.js";
import path from 'path'
import { fileURLToPath } from 'url';
import fs from 'fs'
import UserOtp from "../../models/UserOtpModel.js";
import CouponModel from "../../models/CouponModel.js";
import Order_pending_amount_model from "../../models/OrderPendingAmountModel.js";
import { deduct_quantity, revert_quantity } from "../../helpers/helperFunction.js";
import productModel from "../models/product.model.js";

class orderServices {

    async addOrderLatest(req, res, next) {
        try {
            let {
                outlet_id,
                order_detail,
                sub_total,
                delivery_charges,
                payment_method,
                payment_mode,
                payment_status,
                card_details,
                card_data,
                txn_id,
                payment_id,
                delivery_instructions,
                status,
                retailer_id,
                //emp_id,
                bank_name,
                cheque_no,
                pay_date,
                notes,
                doc_image, coupon_id
            } = req.body;

            let token = req.userData

            //   let outletObj = {}
            //   if (outlet_id && outlet_id?.length > 8) {
            //     outletObj = await OutletModel.findOne({
            //       where: { uuid: outlet_id },   //,user_id:req.userData.uuid
            //       raw: true,
            //     });
            //     if (!outletObj) {
            //       res.locals.statusCode = 400;
            //       res.locals.success = false;
            //       res.locals.message = "Outlet not found : ";
            //       next();
            //       return;
            //     }
            //   }

            /**********************check coupon code  ********************************/
            /************************************************************************** */
            const keys = [];//product_id -----
            const variantKey = [];
            const warehouse_array = [];

            for (let le of order_detail) {
                keys.push(le?.product_id);
                variantKey.push(le?.variant_id);
            }
            // console.log(order_detail, 'keyskeyskeys')
            // return
            let simplrProductArr = await productModel.findAll({
                where: { uuid: keys },
                raw: true,
                attributes: [
                    "id",
                    "brand_id",
                    "title",
                    "universal_standard_code",
                    "status",
                    "images",
                    'is_deleted'
                    // 'unit_value',
                    // 'product_identical',
                    // 'is_primary',
                    // "description",
                    // "summary",
                    // "title_ar",
                    // "created_by",
                ],
            });
            // console.log(first)
            // return
            for (let le of simplrProductArr) {
                if (le.status != 'active') {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This product ${le?.title} is not active `;
                    next();
                    return;
                } else if (le.is_deleted == 1) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This product ${le?.title} is deleted `;
                    next();
                    return;
                }
            }

            // let variantDbArr = await ProductVariantModel.findAll({
            //     where: { uuid: variantKey, },
            //     raw: true,
            // });
            let warehouseFrequency = {}; // To store warehouse frequencies across variants
            let warehouseMapping = {};  // To store warehouse details by their ID
            //   for (let le of variantDbArr) {
            //   if (le.status == 'inactive') {
            //     return res.status(400).json({ message: `This product's variant ${le?.title} is inactive`, statusCode: 400, success: false })
            //   } else if (le.status_by_super_admin == 0) {

            //     return res.status(400).json({ message: `This product's variant ${le?.title} is deactivated`, statusCode: 400, success: false })
            //   } else if (le.approve_by_super_admin == 0) {
            //     return res.status(400).json({ message: `This product's variant ${le?.title} is not approved`, statusCode: 400, success: false })
            //   } else if (le.is_deleted == 1) {
            //     return res.status(400).json({ message: `This product's variant ${le?.title} is deleted`, statusCode: 400, success: false })
            //   }
            // }
            // return
            let tempVariantData = [...variantDbArr];

            tempVariantData = JSON.parse(JSON.stringify(tempVariantData));

            let t = [];

            for (let el of order_detail) {
                // console.log(el, "el----->>>>>>");
                let inFlash = false
                let findData = variantDbArr?.find((elem) => elem?.uuid == el?.variant_id);
                if (!findData) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This variant ${el.variant_id} is not exist`;
                    next();
                    return;
                }
                let findProduct = simplrProductArr?.find((a) => a?.uuid == el.product_id);
                //console.log("findData.images 1", findData.images);
                if (!findData.images || findData?.images?.length == 0) findData.images = findProduct?.product_images;
                //console.log("findData.images 2", findData.images);
                //return;
                // return;
                // findData.price_details = Math.floor(Number(findData.price_details) * 100) / 100
                findData.price_details = Math.trunc(Number(findData.price_details) * 10000) / 10000

                el.price = findData.price_details
                el.price_details = findData.price_details
                el.commission_type = findData.commission_type
                el.commission_value = findData.commission_value
                el.vat = findProduct?.vat
                // return
                let variantNameFind = findData?.title3

                if (findData?.mainVariant?.name) {
                    variantNameFind = findData?.mainVariant?.value
                } if (findData?.variant1?.name) {
                    variantNameFind = variantNameFind + ": " + findData?.variant1?.value
                } if (findData?.variant2?.name) {
                    variantNameFind = variantNameFind + ": " + findData?.variant2?.value
                }

                if (Number(el?.quantity) < Number(findData?.minimum_order_quantity) && el?.is_foc != true) {
                    // console.log(el, "ellllll", findData?.minimum_order_quantity)
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Minimum order quantity is ${findData?.minimum_order_quantity} of this variant ${variantNameFind}...`;
                    next();
                    return;
                }

                if (foundFlash && foundFlash.quantity != 0 && el?.quantity <= foundFlash.quantity) {  //&& foundFlash.quantity>=el?.quantity
                    //console.log("flashdatahiii----->>>>>>")
                    let flashDbPrice = 0
                    if (foundFlash.aqad_price != null) {
                        // foundFlash.aqad_price = Math.floor(Number(foundFlash.aqad_price) * 100) / 100
                        foundFlash.aqad_price = Math.trunc(Number(foundFlash.aqad_price) * 10000) / 10000

                        flashDbPrice = foundFlash.aqad_price
                    } else {
                        // foundFlash.offer_price = Math.floor(Number(foundFlash.offer_price) * 100) / 100
                        foundFlash.offer_price = Math.trunc(Number(foundFlash.offer_price) * 10000) / 10000
                        flashDbPrice = foundFlash.offer_price
                    }
                    let flashObj = {
                        quantity: sequelize.literal(`quantity - ${el?.quantity}`),
                        sold_quantity: sequelize.literal(`sold_quantity + ${el?.quantity}`)
                    };
                    if (el?.quantity > foundFlash.quantity) {
                        /* return res.status(400).json({
                          // message: `In Flash sale only ${foundFlash.quantity} quantity available for this variant ${el?.variant_id}`,
                          message: `In Flash sale only ${foundFlash.quantity} quantity available for this variant ${variantNameFind}`,
                          statusCode: 400,
                          succcess: false,
                        }); */

                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = `In Flash sale only ${foundFlash?.quantity} quantity available for this variant ${variantNameFind}`;
                        next();
                        return;

                    } else {
                        if (foundFlash.quantity == el?.quantity) flashObj.status = 0;
                        el.db_price = Number(flashDbPrice);
                    }
                    // let updateQuantity = await FlashSalesModel.update(flashObj, { where: { variant_id: el?.variant_id } });
                    inFlash = true
                } else {
                    if (findData?.discount_type == "fixed") {
                        let discountedPrice = Number(findData?.price_details) - Number(findData?.discount);
                        el.db_price = Number(discountedPrice);

                    } else if (findData.discount_type == "percentage") {
                        let discountedPrice = Number(findData.price_details) - (Number(findData.price_details) * Number(findData.discount) / 100);
                        el.db_price = discountedPrice;
                    } else {
                        el.db_price = Number(findData.price_details);
                    }
                }
                el.inFlash = inFlash;
                let productData = simplrProductArr?.find(
                    (h) => h?.uuid == el.product_id
                );
                if (!productData) {
                    return res
                        .status(400)
                        .json({ message: `This product ${el.product_id} is not exist` });
                }

                let warhousefind = findData?.warehouse_arr || findData?.warehouse_arr_2;
                // console.log(findData,"finddididididididdi")
                el.db_variant_title = findData?.title;
                // const foundRecord = flashSalesData.find((item) => item.variant_id == el.variant_id);
                delete findData?.warehouse_arr;
                delete findData?.created_at;
                delete findData?.updated_at;
                warhousefind = warhousefind?.sort((a, b) => b?.quantity - a.quantity);
                let Ui_quantity = el.quantity;

                let totalWwrehouseQuantity = warhousefind?.reduce(
                    (a, b) => Number(a) + Number(b?.quantity),
                    0
                );

                if (el.quantity > totalWwrehouseQuantity) {
                    /* return res.status(400).json({
                      // message: `This variant ${el?.variant_id}, only have ${totalWwrehouseQuantity} quantity`,
                      message: `This variant ${variantNameFind}, only have ${totalWwrehouseQuantity} quantity`,
                      statusCode: 400,
                      succcess: false,
                    }); */

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This variant ${variantNameFind}, only have ${totalWwrehouseQuantity} quantity, (${findData.id})`;
                    next();
                    return;
                }
                // console.log(el.is_foc, "Ui_quantity ", "el", "asda", warhousefind, "asdads", findData)
                // return
                if (el.is_foc == true && warhousefind?.length || (Ui_quantity >= findData?.minimum_order_quantity && warhousefind?.length)) {

                    if (Ui_quantity <= warhousefind[0]?.quantity) {
                        let commonWarehouse = warehouseMapping[findData?.id];
                        let elem = commonWarehouse == null ? warhousefind[0] : warhousefind.find((a) => a.id == commonWarehouse);
                        // console.log("findData?.id", findData?.id)
                        // console.log("commonWarehouse", commonWarehouse)
                        // console.log("elem", elem)
                        // return;
                        let obj = {
                            ui_data: { ...el, quantity: Ui_quantity },
                            db_warehouse_obj: { ...elem },
                            variant_db: findData,
                            findProductOBj: productData,
                        };

                        t = [...t, obj];
                    } else {
                        for (let elem of warhousefind) {
                            let uiDataCopy = JSON.parse(JSON.stringify(el));

                            let obj = {
                                ui_data: uiDataCopy,
                                db_warehouse_obj: elem,
                                variant_db: findData,
                                findProductOBj: productData,
                            };

                            if (Ui_quantity > elem?.quantity) {
                                obj.ui_data.quantity = elem?.quantity;
                                Ui_quantity = Ui_quantity - elem.quantity;
                                t = [...t, obj];
                            } else if (
                                Ui_quantity < elem?.quantity &&
                                Ui_quantity >= findData?.minimum_order_quantity
                            ) {
                                obj.ui_data.quantity = Ui_quantity;
                                t = [...t, obj];
                                Ui_quantity = elem.quantity - Ui_quantity;
                            } else if (
                                Ui_quantity == elem?.quantity &&
                                Ui_quantity >= findData?.minimum_order_quantity
                            ) {
                                obj.ui_data.quantity = Ui_quantity;
                                t = [...t, obj];
                            }
                        }
                    }
                }
            }
            // res.json({order_detail})
            // order_detail = order_detail?.filter((a) => Number(a.db_price));

            order_detail = order_detail?.filter((a) => Math.floor(Number(a.db_price) * 100) / 100)// Number(a.db_price));
            //console.log(order_detail, "amountprice---->>>>2131");

            const conditions = order_detail.map(amount => {
                if (amount.commission_type == null || amount.commission_value == null) return ({
                    start_range: { [Op.lte]: amount.db_price },
                    end_range: { [Op.gte]: amount.db_price },
                    status: "active"
                })
            });

            // console.log(conditions, "conditions--->>>>");

            let subtotal = 0;
            let total = 0

            let obj = {
                warehouse_address: el?.db_warehouse_obj?.warehouse_address,
                warehouse_po_box: el?.db_warehouse_obj?.warehouse_po_box,
                warehouse_id: el?.db_warehouse_obj?.warehouse_id,
                outlet_address: outletObj?.address,
                outlet_id: outletObj?.uuid,
                pickupToDropDistance: pickupToDropDistance || "",
                po_box: outletObj?.po_box,
                drop_latitude: outletObj?.latitude,
                drop_longitude: outletObj?.longitude,
                delivery_charges,
                payment_method,
                card_data,
                txn_id,
                payment_id,
                delivery_instructions,
                payment_status: payment_status,
                status: order_status,//(payment_method == "advance pay" || payment_method == "advance_pay") ? "pending" : "new",
                card_details,
                vendor_details: getVednorObj,
                uuid: id,
                order_id: id,
                created_by: req?.userData?.uuid,
                user_id: req.userData.user_type == 'vendor' ? retailer_id : req?.userData?.uuid,
                email: req?.userData?.email,
                name: req.userData?.name,
                delivery_date: deliveryDate,
                shipping_date: deliveryDate,
                out_for_delivery_date: deliveryDate,
                vendor_id: el.findProductOBj?.created_by,
                emp_id: emp_id || null,
                assign_to: emp_id,
                notes,
                payment_mode,
                inFlash: el.inFlash,
                order_status_arr: [{ status: "new", date: new Date() }],
                common_order_id
            };
            if (order_status == 'orderaccepted') {
                obj.pin = pin
            }

            let order_result = await OrderModel.bulkCreate(newVendorArr);
            // return
            let order_ids = [];
            let order_uuids = [];
            for (let item of order_result) {
                order_ids.push(item.id);
                order_uuids.push(item.uuid);
            }
            //console.log(order_ids, "order_ids--->>>>")
            //order_uuids.join("_");
           
            //console.log("payment_method", payment_method);

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Order generated";
            res.locals.data = orderBill;
            res.locals.payLink = payment_url?.payLink || null;
            res.locals.order_ids = order_uuids;
            next();
            //console.log('Order generated ', 'approximation_value ', approximation_value);
            // console.log(req.userData.uuid,"aaaaaaaaa")
            // return
            if (payment_method != "advance_pay") {
                let p_linking = []

                let fetchVarianWarehouseData = newVendorArr
                    ?.map((a) => a?.product_arr)
                    .flat()
                    .map((a) => ({
                        uuid: a?.db_variant_obj?.uuid,
                        warehouse_id: a?.db_warehouse_obj?.warehouse_id,
                        quantity: a?.quantity,
                        in_flash: a?.in_flash
                    }))
                    .filter((a) => a.uuid && a.warehouse_id && a.quantity !== undefined);

                // 
                let vendorIds = tempVariantData.map(a => a.created_by)
                let vendorData = await User.findAll({ where: { uuid: vendorIds }, raw: true })

                let tempObjVariantSame = []
                for (let le of fetchVarianWarehouseData) {
                    let findVariant = tempVariantData.find((a) => a?.uuid == le.uuid)
                    if (findVariant && findVariant?.does_variant_same == 1) {
                        tempObjVariantSame.push({ ...le, product_id: findVariant?.product_id, does_variant_same: findVariant?.does_variant_same })
                    }
                    // console.log(findVariant,"variant--->>>",le)
                    // console.log(findVariant, "findVariantfindVariant", "le")
                    // return 
                    if (findVariant) {
                        findVariant?.warehouse_arr?.forEach((ab) => {
                            if (ab?.id == le.warehouse_id) {
                                ab.quantity = Number(ab.quantity) - Number(le.quantity);
                                if (Number(ab.quantity) < 1) {
                                    ab.quantity = 0
                                }
                                let wareHouse = findWArhouseDb.find((b) => b?.uuid == le.warehouse_id)

                                let findVendor = vendorData.find((a) => a?.uuid == ab.created_by)
                                if (ab.quantity == 0) {
                                    let op = "Finished"
                                    sendWarehouseQuantityEmail(findVariant, op, wareHouse, findVendor);
                                } else if (ab.quantity < Number(findVariant?.minimum_order_quantity)) {
                                    let op = "Less";
                                    sendWarehouseQuantityEmail(findVariant, op, wareHouse, findVendor);
                                }
                            }
                        });

                        //for flash sale quantity deduction
                        if (le?.in_flash == true) {
                            let flashObj = {
                                quantity: sequelize.literal(`quantity - ${le?.quantity}`),
                                sold_quantity: sequelize.literal(`sold_quantity + ${le?.quantity}`)
                            };
                            let updateQuantity = await FlashSalesModel.update(flashObj, { where: { variant_id: le?.uuid } });
                        }
                    }
                    // console.log(findVariant, "findVariantfindVariant", "le")
                    // return

                    if (findVariant && findVariant?.does_variant_same == 0) {
                        if (findVariant && findVariant?.add_variant == 1) {
                            p_linking.push(findVariant)

                        } else {
                            await ProductVariantModel?.update(
                                { warehouse_arr: findVariant?.warehouse_arr },
                                { where: { uuid: le?.uuid } }
                            );
                        }
                    }
                }

                //product linking functionality         
                if (p_linking && p_linking?.length > 0) {
                    // console.log(p_linking, 'p_linkingp_linkingp_linking')
                    await deduct_quantity(p_linking, simplrProductArr, order_detail)


                }

                //  console.log(tempObjVariantSame, 'tempObjVariantSame')
                let stockdeductarr = {}

                for (let el of tempObjVariantSame) {
                    if (stockdeductarr[el.product_id]) {
                        stockdeductarr[el.product_id] = Number(stockdeductarr[el.product_id]) + Number(el?.quantity)
                    } else {
                        stockdeductarr[el.product_id] = Number(el.quantity)
                    }
                }

                // console.log(stockdeductarr,'stockdeductarrWQWQWQ')
                //  return
                // /***************does variant same functionality */
                let product_ids = tempObjVariantSame?.map((a) => a?.product_id)
                let not_includes_variantid = tempObjVariantSame?.map((a) => a?.uuid)

                let fetchSameVariant = await ProductVariantModel.findAll({
                    where: {
                        does_variant_same: 1,
                        product_id: { [Op.in]: product_ids }, // Matches product_id in the array
                        // uuid: { [Op.notIn]: not_includes_variantid }, // Excludes uuid in the array
                        status: 'active',
                        status_by_super_admin: 1,
                        approve_by_super_admin: 1
                    },
                    raw: true, attributes: ['uuid', 'product_id', 'warehouse_arr', 'does_variant_same', 'status', 'status_by_super_admin', 'approve_by_super_admin']
                });
                //console.log(fetchSameVariant,'fetchSameVariantfetchSameVariant')
                // return 

                for (let el of fetchSameVariant) {
                    let warehouseArr = el.warehouse_arr;
                    let find1 = tempObjVariantSame?.find((a) => a?.product_id == el.product_id)
                    if (find1 && stockdeductarr[el.product_id]) {
                        let tempware = warehouseArr?.map((ab) => {
                            if (ab?.id == find1.warehouse_id) {
                                ab.quantity = Number(ab.quantity) - stockdeductarr[el.product_id]
                                if (Number(ab.quantity) < 1) {
                                    ab.quantity = 0
                                }
                            }
                            return ab
                        });
                        await ProductVariantModel?.update(
                            { warehouse_arr: tempware },
                            { where: { uuid: el?.uuid } }
                        );
                    }
                }
                // console.log(fetchSameVariant,'fetchSameVariantfetchSameVariant')
                // return
            }
            let io = req.app.get("io");
            //------email and notification send to vendor and retailer------
            // console.log("newVendorArr", newVendorArr)
            // console.log("newVendorArr.length", newVendorArr.length)
            /**************coupon use increase  */
           

            let retailerDatafetch = {}

            //fetch supervisor 

            for (const generatedOrder of newVendorArr) {
                // console.log("newvwndorarrorderidddd", generatedOrder.order_id)
                let orderData = await OrderModel.findOne({
                    where: { order_id: generatedOrder.order_id },
                    raw: true,
                });

                //let retailerEmail = await getEmailById(orderData.user_id); //get email by id
                let retailerData = await getUserDataById(orderData.user_id); //get user data by id
                // console.log("retailerEmaillllll:", retailerData);
                let ProdImage;
                let ProdName = [];
                let BrandName = [];
                for (let el of orderData?.product_arr) {
                    //console.log('productImagee>>>>',el.db_product_obj.product_images);
                    //console.log('varientImageeee>>>>>',el.db_variant_obj.images);
                    ProdImage = el.db_product_obj.product_images[0] || '';
                    ProdName.push(el.db_variant_obj.title);
                    BrandName.push(el.db_product_obj.brand_id);
                }

                if (payment_method == 'against_delivery' || payment_method == 'Against Delivery' || payment_method == "goods_on_credit" || payment_method == "goods on credit" || payment_method == 'bill_to_bill') {
                    await orderReceivedAndSendEmailToVendor(orderData, generatedOrder.order_id);// order received email send to vendor + send pdf without comission price
                    await orderDetailsSendEmailToRetailer(retailerData, orderData, generatedOrder.order_id); //send order invoice to retailer
                    // return
                    //For send notification start
                    //console.log("orderData>>>>>>>", orderData)

                    //const prodNameString = ProdName.join(', ');
                    //console.log('prodNameString',prodNameString);
                    //const brandNameString = BrandName.join(', ');
                    //console.log('brandNameString',brandNameString);

                    const orderDate = orderData?.order_date.toISOString().split('T')[0];
                    let notiObj = {
                        notification_type: 'order-placed',
                        uuId: String(orderData?.uuid),
                        orderId: String(orderData?.order_id),
                        orderDate: String(orderDate),
                        subTotal: String(orderData?.retailer_sub_sub_total),
                        vat_fee: String(orderData?.retailer_vat),
                        discount: String(orderData?.retailer_discount),
                        total: String(orderData?.retailer_sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }
                    let payload = {
                        notification: {
                            title: 'Your order is successfully placed',
                            body: `Order ID is ${generatedOrder?.order_id}`,
                        },
                        data: notiObj
                    }
                    let notiJson = JSON.stringify(payload);
                    //console.log('retailertoken>>>>',req.userData.deviceToken); 
                    // if (req?.userData && req?.userData?.deviceToken) {
                    //   const notificationCount = await NotificationDataModel.count({
                    //     where: { receiverId: req.userData.uuid, status: 0 },
                    //   });
                    //   //  console.log('Unread Notification Count:', notificationCount,"req.userData.deviceToken",req.userData.deviceToken);
                    //   sendNotification(req.userData.deviceToken, payload, notificationCount)
                    //   let idr = uuidv4();
                    //   idr = idr.replace(/-/g, "");
                    //   NotificationDataModel.create({ uuid: idr, receiverId: req.userData.uuid, subject: notiObj.notification_type, body: notiJson })
                    // }

                    let notiObjForVendor = {
                        notification_type: 'order-received',
                        uuId: String(orderData?.uuid),
                        orderId: String(orderData?.order_id),
                        orderDate: String(orderDate),
                        warehouseAddress: String(orderData?.warehouse_address),
                        total: String(orderData?.sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }
                    let payloadForVendor = {
                        notification: {
                            title: 'New order is placed by SupplyMatch',
                            body: `Order ID is ${generatedOrder.order_id}`,
                        },
                        data: notiObjForVendor
                    }
                    //console.log('vendortoken>>>>',generatedOrder.vendor_details.deviceToken);
                    let notiJsonVendor = JSON.stringify(payloadForVendor);

                    let send_obj = {
                        WhatsAppmsg_template: environmentVars.NEW_ORDER_GENERATE_NOTIFICATION_EMP,
                        to: sales_employee?.phone,
                        data: orderObj
                    }
                    if (orderData && orderData?.vendor_details?.auto_accept_order == 1) {

                        let usersData = [sales_employee, fetch_supervisor]

                        // console.log(usersData, "userata--usera--useData")
                        await sendNotificationToLogistic(orderData, usersData);
                    } else {

                        if (sales_employee && sales_employee?.phone) {
                            console.log(send_obj, 'snd_obj assigned sales em[loyee')
                            await send_whatsApp_noti_assigned_employee(send_obj); //send message
                        }

                        ///send whatsapp notification to assigned sales employee  ////////////////and assigned supervisor
                        orderObj.msgOne = ` ${fetch_supervisor?.name}.`
                        send_obj.to = fetch_supervisor?.phone
                        if (fetch_supervisor && fetch_supervisor?.name) {
                            console.log(send_obj, 'send_objsend supervisor emp')
                            await send_whatsApp_noti_assigned_employee(send_obj); //send message
                        }
                    }

                }
                //Run scheduleOrderCheckAfterThreeMinutes
                //   Order_notifyToEmployees(generatedOrder.order_id); // employee 
                // return
                scheduleOrderCheckAfterThreeMinutes_notifyToEmployees(generatedOrder.order_id); // run Scheduler

                //Run scheduleOrderCheckAfterEightMinutes
                scheduleOrderCheckAfterEightMinutes_notifyToAdmin(generatedOrder.order_id); // run Scheduler

                //Run scheduleOrderCheckAfterOneMinutes
                scheduleOrderEveryOneMinutes_notifyToVendor(generatedOrder.order_id); //run Scheduler
                if (payment_method != "advance_pay") {
                    /**-------------------------------socket io-------------------------------------- */
                    let super_admin_data = await UserModel.findAll({
                        where: {
                            user_type: 'super_admin',
                            account_status: 'activated', // account_status should be 'activated'
                            is_deleted: 0
                        },
                        raw: true,
                        attributes: ["uuid"],
                    });


                    let admin_ids = await super_admin_data?.map((a) => a.uuid);
                    if (admin_ids && admin_ids.length > 0) {
                        admin_ids.forEach((admin_id) => {
                            let message = `New order received: ${generatedOrder.order_id}`
                            const socketId = io?.userSocketMap?.get(admin_id);
                            console.log("new-order socketId", socketId)
                            io.to(socketId).emit('new-order', {
                                message,
                                type: "order",
                                data: {
                                    order_id: generatedOrder.order_id,
                                    image: String(ProdImage),
                                    product_name: String(ProdName),
                                    brand_name: String(BrandName),
                                    order_status: generatedOrder.status,
                                    payment_status: generatedOrder.payment_status,
                                    delivery_date: generatedOrder.delivery_date,
                                    retailer_sub_total: generatedOrder.retailer_sub_total,
                                    sub_total: generatedOrder.sub_total,
                                    retailer_details: { id: req.userData?.uuid, name: req.userData?.name },
                                    vendor_details: { id: generatedOrder.vendor_details?.uuid, name: generatedOrder.vendor_details?.name }
                                }
                            }); //.to(admin_ids)
                        });

                    }
                    await this.sendSocketEvent(io, generatedOrder?.order_id);

                    /**-------------------------------socket io-------------------------------------- */
                }
            }

            /**-------------------------------Credit Amount Calculation-------------------------------------------- */
            if (payment_method == "goods_on_credit" || payment_method == "goods on credit") {
                const timestamp = Date.now();
                let uuid = timestamp + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
                await UserDetailsModel.update({ 'credit_amount': SM_credit }, { where: { user_id: req.userData.uuid } });
                let transaction_data = {
                    uuid,
                    user_id: req?.userData?.uuid,
                    order_id: order_uuids,
                    amount: payment_total,
                    transaction_type: "Debit",
                }
                await UserCreditTransactionModel.create(transaction_data);
                let doc_image_url;
                if (doc_image && Object.keys(doc_image).length > 0) {
                    let image_name = `${Date.now()}_${doc_image?.name}`;
                    let userid = req.userData.user_type == 'vendor' ? retailer_id : req?.userData?.uuid
                    const docImagePhotoKey = `${req?.userData?.user_type}/${userid}/goods_credit_cheque/${image_name}`;
                    doc_image_url = `https://${bucketName}.s3.${region}.amazonaws.com/${docImagePhotoKey}`;
                    console.log(doc_image_url, '@@@@@!!!doc_image_urldoc_image_url')
                    await uploadBase64ImageToS3(doc_image?.uri, doc_image?.name, doc_image?.type, 'user');
                }

                const timestamp2 = Date.now();
                let cheque_uuid = timestamp2 + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
                let credit_data = {
                    uuid: cheque_uuid,
                    user_id: req?.userData?.uuid,
                    order_id: order_uuids,
                    amount: payment_total,
                    bank_name,
                    cheque_no,
                    pay_date,
                    doc_image: doc_image_url,
                    status: "order_created",
                }
                await GoodsOnCreditModel.create(credit_data);
            }
            /**----------------------------Credit Amount Calculation-------------------------------------------- */


            /**------------------------redis data----------------------------------------*/
            try {

                const keyPatterns = [`${REDIS_KEY.ORDER}*`, `${REDIS_KEY.NOTIFICATION}`, `${REDIS_KEY.FLASHSALES}`, `${REDIS_KEY.PRODUCT}`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }


        } catch (err) {
            console.log(err, "error in order create api");
            // return res
            //   .status(500)
            //   .json({ message: err?.message, success: false, statusCode: 500 });
        }
    }

    async getOrderDetailsForSocket(order_id, language = "en") {
        try {
            // console.log("vendor loggedIn>>>>>");
            let sqlQuery = `
       SELECT id, uuid, status, order_id, order_date, user_id, sub_total, product_arr, vendor_details,request_id
       FROM orders
       WHERE order_id =:order_id`;

            const replacements = {
                order_id: order_id
            };

            // Execute main query
            let get = await dbConnection.query(sqlQuery, {
                replacements: replacements,
                type: dbConnection.QueryTypes.SELECT,
                raw: true,
            });

            // Process results
            get = get?.map((a) => {
                a.totalAmount = a.sub_total;
                a.product_arr = a?.product_arr?.map((ele) => {
                    ele.db_product_obj.brand_id = language == "ar" && ele?.db_product_obj?.brand_id_ar ? ele?.db_product_obj?.brand_id_ar : ele?.db_product_obj?.brand_id
                    ele.db_product_obj.title = language == "ar" && ele?.db_product_obj?.title_ar ? ele?.db_product_obj?.title_ar : ele?.db_product_obj?.title
                    return ele;
                })
                if (a?.status == 'accept') {
                    a.status = 'AcceptedByFE';
                }
                return a;
            });


            return ({ data: get[0] });
        } catch (error) {
            console.error("error:", error)
        }
    }

    async getRetailerCurrentOrderForSocket(order_id) {
        try {
            let status = ['new', 'outfordelivery', 'processing', 'accept', 'dispatched', 'orderaccepted', 'accept', 'pending']


            let get = await OrderModel.findAll({
                where: {
                    order_id: order_id,
                    //status: { [Op.in]: status },
                },
                attributes: ['id', 'uuid', 'order_id', 'user_id', 'delivery_date', 'order_date', 'status'],
                raw: true
            })
            for (let el of get) {
                el.getOrderDate = await this.formatDate(el?.order_date)
                el.getOrderDay = await this.getDayOfWeek(el?.order_date)
                el.expectedDeliveryDate = await this.formatDate(el.delivery_date)
                el.expectedDeliveryDay = await this.getDayOfWeek(el?.delivery_date)
            }


            return get[0];
        } catch (er) {
            console.log("message:", er?.message)

        }
    }

    async getVendorCurrentOrderForSocket(order_id) {
        try {
            let status = ['new', 'outfordelivery', 'processing', 'accept', 'dispatched', 'orderaccepted']

            let whereCondition = `order_id = '${order_id}'`;

            let replacements = [...status];
            // req.userData.user_type = 'vendor'
            // whereCondition += ` AND JSON_CONTAINS(vendor_details, '{"uuid": "${vendor_id}"}', '$')`;



            let get = await dbConnection.query(`
        SELECT id, uuid, order_id, user_id, delivery_date, order_date, status, vendor_details
        FROM orders
        WHERE ${whereCondition}
      `, {
                replacements,
                type: dbConnection.QueryTypes.SELECT
            });

            for (let el of get) {
                if (el.variantObj?.images?.length == 0) {
                    el.variantObj.images = el.productObj.product_images
                }
                el.getOrderDate = await this.formatDate(el?.order_date)
                el.getOrderDay = await this.getDayOfWeek(el?.order_date)
                el.expectedDeliveryDate = await this.formatDate(el.delivery_date)
                el.expectedDeliveryDay = await this.getDayOfWeek(el?.delivery_date)
                // delete el.vendor_details?.dob
                if (el.vendor_details) {
                    Object.keys(el.vendor_details).forEach(key => {
                        if (el.vendor_details[key] === null) {
                            delete el.vendor_details[key];
                        }
                    });
                }
                delete el?.vendor_details?.email
                delete el?.vendor_details?.password
                delete el?.vendor_details?.createdAt
                delete el?.vendor_details?.updatedAt
                delete el?.vendor_details?.created_by
                delete el?.vendor_details?.accessToken
                delete el?.vendor_details?.is_verified
                delete el?.vendor_details?.account_status
                delete el?.vendor_details?.cognito_user_id
                delete el?.vendor_details?.is_social_login
                delete el?.vendor_details?.preferred_language
            }

            return get[0];
        } catch (er) {
            console.log(er, "get_d_dashboard_data_vendor");
        }
    }


    getDeliveryTime() {
        // Define Dubai timezone
        const dubaiTimeZone = 'Asia/Dubai';

        // Get current date and time in Dubai timezone
        const now = new Date();
        const options = { timeZone: dubaiTimeZone, hour: '2-digit', minute: '2-digit' };
        const dubaiTime = new Intl.DateTimeFormat('en-US', options).format(now);

        // Convert to a 24-hour number for easy comparison
        const currentHour = parseInt(dubaiTime.split(':')[0], 10);
        const currentMinute = parseInt(dubaiTime.split(':')[1], 10);

        // Determine if it's morning or night in Dubai
        const isMorning = currentHour >= 6 && currentHour < 21;

        // Set delivery time based on the time of day
        const deliveryTime = new Date(now); // Clone current time

        if (isMorning) {
            // Add 1.5 hours for morning delivery
            deliveryTime.setHours(deliveryTime.getHours() + 1);
            deliveryTime.setMinutes(deliveryTime.getMinutes() + 30);
        } else {
            // Add 3 hours for night delivery
            deliveryTime.setHours(deliveryTime.getHours() + 3);
        }

        return deliveryTime;
    }

    customRound(value) {
        const integerPart = Math.floor(value);

        // Get the decimal part
        const decimalPart = value - integerPart;

        // Check the decimal part and apply the rounding logic
        if (decimalPart >= 0.1 && decimalPart <= 0.5) {
            return integerPart + 0.5; // Round to x.5
        } else if (decimalPart > 0.5 && decimalPart < 1) {
            return integerPart + 1; // Round to x + 1
        } else {
            return value;
        }
    }


    //order status change api expected cancelled status
    //'new', 'outfordelivery', 'processing','cancelled', 'completed', 'delivered', 'orderaccepted', 'dispatched'
    async change_status(req, res, next) {
        try {
            let { id, order_id, status } = req.body;
            const timestamp = new Date().toISOString(); // Format timestamp as ISO string

            let orderData = await OrderModel.findOne({
                where: { order_id: order_id },
                raw: true,
            });
            if (!orderData) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found : ";
                next();
                return;
            }

            let retailerData = await getUserDataById(orderData.user_id);

            const existing_statuses = orderData.order_status_arr || [];

            // Add the new status object
            const new_status = {
                status,
                date: timestamp
            };

            existing_statuses.push(new_status);
            //console.log("existing_statuses", existing_statuses);
            await OrderModel.update(
                { status, updated_at: timestamp, order_accepted_by_vendor: timestamp, order_status_arr: existing_statuses },
                { where: { order_id: order_id } }
            );

            let statusMessage;
            if (status == "outfordelivery") {
                statusMessage = "Your order is out for delivery";
                await generateOrderLPOpdf(res, orderData); //generate GRN and send to vendor 
                await sendPinToRetailer(res, orderData, retailerData, orderData?.pin); //send pin to retailer email

            } else if (status == "dispatched") {
                statusMessage = "Your order is dispatched";

            } else if (status == "delivered") {
                statusMessage = "Your order is delivered";
                //await generateInvoicePdfSendToVendor(orderData, order_id); //Send LPO invoce to vendor
                //await orderDetailsSendEmailToRetailer(retailerData, orderData, order_id); //Send order invoce to retailer

            } else if (status == "completed") {
                statusMessage = "Your order is completed";
            }

            //-----send notification---------
            /*const orderDate = orderData?.order_date.toISOString().split('T')[0];
            let notiObj = {
              notification_type: 'order-status-update',
              uuId: String(orderData?.uuid),
              orderId: String(orderData?.order_id),
              orderDate: String(orderDate),
              subTotal: String(orderData?.retailer_sub_sub_total),
              vat_fee: String(orderData?.retailer_vat),
              discount: String(orderData?.retailer_discount),
              total: String(orderData?.retailer_sub_total)
            }
            let payload = {
              notification: {
                title: statusMessage,
                body: `Order id is ${orderData?.order_id}`,
              },
              data: notiObj
            }
            let notiJson = JSON.stringify(payload);
            if (retailerData?.deviceToken) {
              sendNotification(retailerData?.deviceToken, payload)
              let idr = uuidv4();
              idr = idr.replace(/-/g, "");
              await NotificationDataModel.create({ uuid: idr, receiverId: retailerData?.uuid, subject: notiObj.notification_type, body: notiJson })
            }*/
            //-----send notification---------
            // res.status(200).json({
            //   message: "Order status updated successfully",
            //   statusCode: 200,
            //   success: true,
            // });

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Order status updated successfully";
            next();

            /**-------------------------------socket io-------------------------------------- */
            let super_admin_data = await UserModel.findAll({
                where: {
                    user_type: 'super_admin',
                    account_status: 'activated', // account_status should be 'activated'
                    is_deleted: 0
                },
                raw: true,
                attributes: ["uuid"],
            });
            let admin_ids = await super_admin_data?.map((a) => a.uuid);
            let ProdImage;
            let ProdName = [];
            let BrandName = [];
            for (let el of orderData?.product_arr) {
                //console.log('productImagee>>>>',el.db_product_obj.product_images);
                //console.log('varientImageeee>>>>>',el.db_variant_obj.images);
                ProdImage = el.db_product_obj.product_images[0] || '';
                ProdName.push(el.db_variant_obj.title);
                BrandName.push(el.db_product_obj.brand_id);
            }
            let io = req.app.get("io");
            if (admin_ids && admin_ids.length > 0) {
                admin_ids.forEach((admin_id) => {
                    let message = `order: ${order_id} is now ${status}`
                    const socketId = io?.userSocketMap?.get(admin_id);

                    console.log("order-status-update2 event socketId", socketId)
                    console.log("order-status-update2 event msg", message)
                    io.to(socketId).emit('order-status-update', {
                        message,
                        type: "order",
                        data: {
                            order_id: orderData.order_id,
                            image: String(ProdImage),
                            product_name: String(ProdName),
                            brand_name: String(BrandName),
                            order_status: orderData.status,
                            payment_status: orderData.payment_status,
                            delivery_date: orderData.delivery_date,
                            retailer_sub_total: orderData.retailer_sub_total,
                            sub_total: orderData.sub_total,
                            retailer_details: { id: retailerData?.uuid, name: retailerData?.name },
                            vendor_details: { id: orderData.vendor_details?.uuid, name: orderData.vendor_details?.name }
                        }
                    }); //.to(admin_ids)
                });
            }
            const retailerSocketId = io?.userSocketMap?.get(retailerData?.uuid);
            io.to(retailerSocketId).emit('order-status-update', { message: statusMessage, type: "order", data: { orderId: String(orderData?.order_id), status } });
            const vendorSocketId = io?.userSocketMap?.get(orderData.vendor_details?.uuid);
            io.to(vendorSocketId).emit('order-status-update', { message: statusMessage, type: "order", data: { orderId: String(orderData?.order_id), status } });
            /**-------------------------------socket io-------------------------------------- */

            /***********************redis data------------------------------------------- */
            try {
                const keyPatterns = [`${REDIS_KEY.ORDER}*`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error  Redis keys:', error);
            }

            return;
        } catch (err) {
            console.log(err, "An error occurred during update order status");
            // return res
            //   .status(500)
            //   .json({ message: err?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async get_data(req, res, next) {
        try {
            let get = [];
            let t_obj = req.userData
            let user_id = t_obj.uuid;
            let retailer_id = req.query.retailer_id;
            let searchKeyword = req.query.searchKeyword//product title or brancd or orderid

            // console.log('userrrrrrrr: ', req.query);
            const statusQuery = req.query.status || null;
            const page = parseInt(req.query.page, 10) || 1;
            const pageSize = parseInt(req.query.pageSize, 10) || 10;
            const offset = (page - 1) * pageSize;

            let whereCondition = {};
            if (statusQuery && statusQuery.length > 0) {
                whereCondition.status = {
                    [Op.in]: statusQuery,
                };
            }

            // Add search filter for title or order_id if searchKeyword is provided
            // if (searchKeyword) {
            //   searchKeyword = searchKeyword?.toLowercase()
            //   whereCondition[Op.and] = [
            //     ...(whereCondition[Op.and] || []), // Preserve existing conditions
            //     {
            //       [Op.or]: [
            //         Sequelize.literal(`JSON_EXTRACT(retailer_product_arr, '$[0].db_product_obj.title') LIKE '%${searchKeyword}%'`),
            //         { order_id: { [Op.like]: `%${searchKeyword}%` } },
            //       ],
            //     },
            //   ];
            // }
            //       
            // 
            // req.userData.country = COUNTRIES?.POLAND
            //dynamic model here
            let orderModelToUse = OrderModel
            if (req.userData.country == COUNTRIES?.POLAND) {
                orderModelToUse = OrderModel_poland

            }

            //------------------redis get data
            let keyname = `${REDIS_KEY.ORDER_GET_DATA}:${user_id}:${retailer_id}:${searchKeyword}:${statusQuery}:${page}:${pageSize}:${t_obj?.user_type}:${req.language}:${orderModelToUse}:${t_obj?.country}`

            let getredis = await redis.get(keyname)
            if (getredis) {
                let extactdata = JSON.parse(getredis)
                // if (extactdata && extactdata.data) {
                //   res.locals.statusCode = 200;
                //   res.locals.success = true;
                //   res.locals.message = "Fetch Data from redis";
                //   res.locals.data = extactdata.data
                //   res.locals.pagination = extactdata.pagination
                //   next();
                //   return;
                // }
            }

            if (searchKeyword) {
                searchKeyword = searchKeyword.toLowerCase()
                //const keyword = searchKeyword.toLowerCase(); // Convert the keyword to lowercase
                whereCondition = {
                    ...whereCondition,
                    [Op.and]: {
                        [Op.or]: [Sequelize.literal(
                            `LOWER(JSON_EXTRACT(retailer_product_arr, '$[0].db_product_obj.title')) LIKE '%${searchKeyword}%'`
                        ),
                        Sequelize.where(
                            Sequelize.fn('LOWER', Sequelize.col('order_id')),
                            {
                                [Op.like]: `%${searchKeyword}%`
                            }
                        )]
                    }
                }

            }

            let totalItems;

            console.log("req.userData?.user_type", req.userData?.user_type);
            if (req.userData && req.userData?.user_type == 'retailer') {
                if (statusQuery && statusQuery?.length > 0) {
                    whereCondition = { status: statusQuery }
                }

                let get2 = await orderModelToUse.findAll({
                    where: {
                        ...whereCondition,
                        //[Op.and]: [{ [Op.or]: [Sequelize.where(col('orders.order_id'), col('orders.common_order_id')), { 'common_order_id': null }] }],
                        user_id: user_id,
                    },
                    /* include: [
                      {
                        model: orderModelToUse,
                        as: 'common_orders', // Alias defined in the association
                        attributes: ['order_id', 'retailer_product_arr'], // Select specific fields for the manager
             
                      },
                    ],
                    subQuery: false, */
                    //attributes: { exclude: ["card_data", "card_details", 'apiHit', 'product_arr'] },
                    attributes: ["id", "uuid", "user_id", "order_id", "order_date", ["retailer_sub_total", "totalAmount"], 'product_arr', 'retailer_product_arr', 'status', 'request_id', 'retailer_discount_obj'],
                    order: [['created_at', 'DESC']],
                    limit: pageSize,
                    offset: offset,
                });
                // console.log(get, "getabccccccccc", whereCondition, "whereConditionwhereCondition")

                totalItems = await orderModelToUse.count({
                    where: {
                        ...whereCondition,
                        //[Op.and]: [{ [Op.or]: [Sequelize.where(col('orders.order_id'), col('orders.common_order_id')), { 'common_order_id': null }] }],
                        user_id: user_id
                    },
                });
                get = JSON.parse(JSON.stringify(get2))
                // get 
                // =
                get?.forEach((a) => {
                    a.product_arr = a.retailer_product_arr
                    if (a?.retailer_discount_obj && a?.retailer_discount_obj?.retailer_sub_total_after_discount) {
                        a.totalAmount = a?.retailer_discount_obj?.retailer_sub_total_after_discount
                        a.totalAmount = a.totalAmount?.toString()
                    }
                    // console.log(a?.totalAmount, "a?.retailer_discount_obj?.r")
                    // a.totalAmount = a.retailer_sub_total
                    a.product_arr = a?.product_arr?.map((ele) => {
                        ele.db_product_obj.brand_id = req.language == "ar" && ele?.db_product_obj?.brand_id_ar ? ele?.db_product_obj?.brand_id_ar : ele?.db_product_obj?.brand_id
                        ele.db_product_obj.title = req.language == "ar" && ele?.db_product_obj?.title_ar ? ele?.db_product_obj?.title_ar : ele?.db_product_obj?.title
                        return ele;
                    })
                    if (a?.status == 'accept') {
                        a.status = 'AcceptedByFE';
                    }

                    delete a.retailer_product_arr
                    // return a
                })
            } else if (req.userData.user_type == 'vendor') {

                // console.log("vendor loggedIn>>>>>");
                let sqlQuery = `
            SELECT id, uuid, status, order_id, order_date, user_id, sub_total, product_arr, vendor_details,request_id
            FROM orders
            WHERE (
              JSON_UNQUOTE(JSON_EXTRACT(vendor_details, '$.uuid')) = :user_id
              ${retailer_id ? `AND user_id = :retailer_id` : ''}
            ) AND status != 'pending'
          `;

                // Add status filter
                if (statusQuery) {
                    sqlQuery += ` AND status = :status `;
                }

                // Add searchKeyword filter (for title or order_id)
                if (searchKeyword) {
                    sqlQuery += ` AND (
              Lower(JSON_EXTRACT(product_arr, '$[0].db_product_obj.title')) LIKE :searchKeyword
              OR order_id LIKE :searchKeyword
            ) `;
                }

                sqlQuery += `
            ORDER BY order_date DESC
            LIMIT :limit OFFSET :offset
          `;

                let countQuery = `
            SELECT COUNT(*) AS count
            FROM orders
            WHERE (
              JSON_UNQUOTE(JSON_EXTRACT(vendor_details, '$.uuid')) = :user_id
              ${retailer_id ? `AND user_id = :retailer_id` : ''}
            ) AND status != 'pending'
          `;

                // Add status filter for count query
                if (statusQuery) {
                    countQuery += ` AND status = :status `;
                }

                // Add searchKeyword filter (for title or order_id) in count query
                if (searchKeyword) {
                    countQuery += ` AND (
              JSON_EXTRACT(product_arr, '$[0].db_product_obj.title') LIKE :searchKeyword
              OR order_id LIKE :searchKeyword
            ) `;
                }

                const replacements = {
                    user_id: user_id,
                    limit: pageSize,
                    offset: offset,
                };

                if (statusQuery) {
                    replacements.status = statusQuery;
                }

                if (searchKeyword) {
                    replacements.searchKeyword = `%${searchKeyword}%`;
                }

                if (retailer_id) {
                    replacements.retailer_id = retailer_id; // Add retailer_id if provided
                }

                // Execute main query
                get = await dbConnection.query(sqlQuery, {
                    replacements: replacements,
                    type: dbConnection.QueryTypes.SELECT,
                    raw: true,
                });

                // Execute count query
                const countResult = await dbConnection.query(countQuery, {
                    replacements: replacements,
                    type: dbConnection.QueryTypes.SELECT,
                    raw: true,
                });

                totalItems = countResult[0].count;

                // Process results
                get = get?.map((a) => {
                    a.totalAmount = a.sub_total;
                    a.product_arr = a?.product_arr?.map((ele) => {
                        ele.db_product_obj.brand_id = req.language == "ar" && ele?.db_product_obj?.brand_id_ar ? ele?.db_product_obj?.brand_id_ar : ele?.db_product_obj?.brand_id
                        ele.db_product_obj.title = req.language == "ar" && ele?.db_product_obj?.title_ar ? ele?.db_product_obj?.title_ar : ele?.db_product_obj?.title
                        return ele;
                    })
                    if (a?.status == 'accept') {
                        a.status = 'AcceptedByFE';
                    }
                    return a;
                });
            } else {
                if (statusQuery && statusQuery?.length > 0) {
                    whereCondition = { status: statusQuery }
                }
                // console.log("@@@2 1:111  aaaaaaaaa", whereCondition, "AAAAA",req.userData.uuid)
                get = await orderModelToUse.findAll({
                    where: {
                        ...whereCondition,
                        user_id: req.userData.uuid,
                    },
                    //attributes: { exclude: ["card_data", "card_details", 'apiHit'] },
                    attributes: ["id", "uuid", "user_id", "order_id", "order_date", "sub_total", "retailer_sub_total", 'product_arr', 'retailer_product_arr', 'status', 'request_id'],
                    order: [['created_at', 'DESC']],
                    limit: pageSize,
                    offset: offset,
                    raw: true,
                });

                // Replace the "status" key's value if it is "accept"
                get = get.map(order => {
                    if (order.status === "accept") {
                        order.status = "AcceptedByFE";
                    }
                    order.product_arr = order?.product_arr?.map((ele) => {
                        ele.db_product_obj.brand_id = req.language == "ar" && ele?.db_product_obj?.brand_id_ar ? ele?.db_product_obj?.brand_id_ar : ele?.db_product_obj?.brand_id
                        ele.db_product_obj.title = req.language == "ar" && ele?.db_product_obj?.title_ar ? ele?.db_product_obj?.title_ar : ele?.db_product_obj?.title
                        return ele;
                    })
                    return order; // Return the modified or original order
                });
                //console.log(get, "getgetgetgetgetget", whereCondition, "whereConditionwhereCondition")
                totalItems = await orderModelToUse.count({
                    where: {
                        ...whereCondition,
                        user_id: req.userData.uuid
                    },
                });
            }
            // console.log(totalItems, "totalItemstotalItemstotalItems", get)
            const totalPages = Math.ceil(totalItems / pageSize);
            //----------redis set data------------------------
            let redisobj = {
                data: get,
                pagination: {
                    currentPage: page,
                    pageSize: pageSize,
                    totalItems: totalItems,    //totalItems
                    totalPages: totalPages,
                }
            }
            await redis.set(keyname, JSON.stringify(redisobj), 'EX', environmentVars.REDISTTL)
            /* res.status(200).json({
              message: "Fetch Data",
              pagination: {
                currentPage: page,
                pageSize: pageSize,
                totalItems: totalItems,    //totalItems
                totalPages: totalPages,
              },
              statusCode: 200,
              success: true,
              data: get,
            });
            return */

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Fetch Data";
            res.locals.data = get
            res.locals.pagination = {
                currentPage: page,
                pageSize: pageSize,
                totalItems: totalItems,    //totalItems
                totalPages: totalPages,
            }
            next();
            return;
        } catch (error) {
            console.error(error);
            // return res.status(500).json({
            //   message: error,
            //   statusCode: 500,
            //   success: false,
            // });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = error.message;
            next();
            return;
        }

    }

    async get_data_latest(req, res, next) {
        try {
            let get = [];
            let user_id = req.userData.uuid;
            let retailer_id = req.query.retailer_id;
            //let title = req.query.searchKeyword//product title or brancd
            let searchKeyword = req.query.searchKeyword//product title or brancd or orderid
            console.log(retailer_id, "retailer_id>>>", user_id, "userType>>>>", req.userData.user_type)

            console.log('userrrrrrrr: ', req.query);
            const statusQuery = req.query.status || null;
            const page = parseInt(req.query.page, 10) || 1;
            const pageSize = parseInt(req.query.pageSize, 10) || 10;
            // req.userData.user_type = 'vendor';
            const offset = (page - 1) * pageSize;

            let whereCondition = {};
            // Add status filter if provided
            if (statusQuery && statusQuery.length > 0) {
                whereCondition.status = {
                    [Op.in]: statusQuery,
                };
            }

            // Add search filter for title or order_id if searchKeyword is provided
            // if (searchKeyword) {
            //   searchKeyword = searchKeyword?.toLowercase()
            //   whereCondition[Op.and] = [
            //     ...(whereCondition[Op.and] || []), // Preserve existing conditions
            //     {
            //       [Op.or]: [
            //         Sequelize.literal(`JSON_EXTRACT(retailer_product_arr, '$[0].db_product_obj.title') LIKE '%${searchKeyword}%'`),
            //         { order_id: { [Op.like]: `%${searchKeyword}%` } },
            //       ],
            //     },
            //   ];
            // }
            if (searchKeyword) {
                const keyword = searchKeyword.toLowerCase(); // Convert the keyword to lowercase
                Sequelize.literal(
                    `LOWER(JSON_EXTRACT(retailer_product_arr, '$[0].db_product_obj.title')) LIKE '%${keyword}%'`
                ),
                    Sequelize.where(
                        Sequelize.fn('LOWER', Sequelize.col('order_id')),
                        {
                            [Op.like]: `%${keyword}%`
                        }
                    )
            }


            let totalItems;
            //req.userData.user_type = 'retailer';
            // req.userData.user_type="vendor"

            console.log("req.userData?.user_type", req.userData?.user_type);
            if (req.userData && req.userData?.user_type == 'retailer') {
                if (statusQuery && statusQuery?.length > 0) {
                    whereCondition = { status: statusQuery }
                }

                let orders = await OrderModel.findAll({
                    where: {
                        ...whereCondition,
                        [Op.and]: [{ [Op.or]: [Sequelize.where(col('orders.order_id'), col('orders.common_order_id')), { 'common_order_id': null }] }],
                        user_id: user_id,
                    },
                    include: [
                        {
                            model: OrderModel,
                            as: 'common_orders', // Alias defined in the association
                            attributes: ['order_id', 'retailer_product_arr', "retailer_sub_total"], // Select specific fields for the manager
                            where: Sequelize.where(col('common_orders.order_id'), "!=", col('common_orders.common_order_id')),
                        },
                    ],
                    subQuery: false,
                    //attributes: { exclude: ["card_data", "card_details", 'apiHit', 'product_arr'] },
                    attributes: ["id", "uuid", "user_id", "order_id", "order_date", "retailer_sub_total", 'product_arr', 'retailer_product_arr', 'status', 'request_id',
                        // [fn('SUM', col('orders.retailer_sub_total')), 'total_amount'],
                        // [fn('SUM', col('orders.retailer_vat')), 'vat_total'],
                        // [fn('SUM', col('orders.retailer_sub_sub_total')), 'sub_total']
                    ],
                    order: [['created_at', 'DESC']],
                    limit: pageSize,
                    offset: offset,
                });
                console.log(get, "getabccccccccc", whereCondition, "whereConditionwhereCondition")

                totalItems = await OrderModel.count({
                    where: {
                        ...whereCondition,
                        //[Op.and]: [{ [Op.or]: [Sequelize.where(col('orders.order_id'), col('orders.common_order_id')), { 'common_order_id': null }] }],
                        user_id: user_id
                    },
                });

                for (let a of orders) {
                    a.product_arr = a.retailer_product_arr
                    //a.totalAmount = a.retailer_sub_total
                    if (a?.status == 'accept') {
                        a.status = 'AcceptedByFE';
                    }
                    a.retailer_sub_total = Number(a.retailer_sub_total);
                    let common_order_total = 0
                    for (const common_order of a.common_orders) {
                        console.log("common_order_total", common_order_total)
                        console.log("common_order.retailer_sub_total", common_order.retailer_sub_total)
                        common_order_total += Number(common_order.retailer_sub_total);
                        console.log("common_order_total", common_order_total)
                    }

                    a.retailer_sub_total = Number(a.retailer_sub_total) + Number(common_order_total);
                    delete a.retailer_product_arr
                    get.push(a);
                }
            } else if (req.userData.user_type == 'vendor') {

                // console.log("vendor loggedIn>>>>>");
                let sqlQuery = `
            SELECT id, uuid, status, order_id, order_date, user_id, sub_total, product_arr, vendor_details,request_id
            FROM orders
            WHERE (
              JSON_UNQUOTE(JSON_EXTRACT(vendor_details, '$.uuid')) = :user_id
              ${retailer_id ? `AND user_id = :retailer_id` : ''}
            ) AND status != 'pending'
          `;

                // Add status filter
                if (statusQuery) {
                    sqlQuery += ` AND status = :status `;
                }

                // Add searchKeyword filter (for title or order_id)
                if (searchKeyword) {
                    sqlQuery += ` AND (
              JSON_EXTRACT(product_arr, '$[0].db_product_obj.title') LIKE :searchKeyword
              OR order_id LIKE :searchKeyword
            ) `;
                }

                sqlQuery += `
            ORDER BY order_date DESC
            LIMIT :limit OFFSET :offset
          `;

                let countQuery = `
            SELECT COUNT(*) AS count
            FROM orders
            WHERE (
              JSON_UNQUOTE(JSON_EXTRACT(vendor_details, '$.uuid')) = :user_id
              ${retailer_id ? `AND user_id = :retailer_id` : ''}
            ) AND status != 'pending'
          `;

                // Add status filter for count query
                if (statusQuery) {
                    countQuery += ` AND status = :status `;
                }

                // Add searchKeyword filter (for title or order_id) in count query
                if (searchKeyword) {
                    countQuery += ` AND (
              JSON_EXTRACT(product_arr, '$[0].db_product_obj.title') LIKE :searchKeyword
              OR order_id LIKE :searchKeyword
            ) `;
                }

                const replacements = {
                    user_id: user_id,
                    limit: pageSize,
                    offset: offset,
                };

                if (statusQuery) {
                    replacements.status = statusQuery;
                }

                if (searchKeyword) {
                    replacements.searchKeyword = `%${searchKeyword}%`;
                }

                if (retailer_id) {
                    replacements.retailer_id = retailer_id; // Add retailer_id if provided
                }

                // Execute main query
                get = await dbConnection.query(sqlQuery, {
                    replacements: replacements,
                    type: dbConnection.QueryTypes.SELECT,
                    raw: true,
                });

                // Execute count query
                const countResult = await dbConnection.query(countQuery, {
                    replacements: replacements,
                    type: dbConnection.QueryTypes.SELECT,
                    raw: true,
                });

                totalItems = countResult[0].count;

                // Process results
                get = get?.map((a) => {
                    a.totalAmount = a.sub_total;

                    if (a?.status == 'accept') {
                        a.status = 'AcceptedByFE';
                    }
                    return a;
                });
            } else {
                if (statusQuery && statusQuery?.length > 0) {
                    whereCondition = { status: statusQuery }
                }
                // console.log("@@@2 1:111  aaaaaaaaa", whereCondition, "AAAAA",req.userData.uuid)
                get = await OrderModel.findAll({
                    where: {
                        ...whereCondition,
                        user_id: req.userData.uuid,
                    },
                    //attributes: { exclude: ["card_data", "card_details", 'apiHit'] },
                    attributes: ["id", "uuid", "user_id", "order_id", "order_date", "sub_total", "retailer_sub_total", 'product_arr', 'retailer_product_arr', 'status', 'request_id'],
                    order: [['created_at', 'DESC']],
                    limit: pageSize,
                    offset: offset,
                    raw: true,
                });

                // Replace the "status" key's value if it is "accept"
                get = get.map(order => {
                    if (order.status === "accept") {
                        order.status = "AcceptedByFE";
                    }
                    return order; // Return the modified or original order
                });
                //console.log(get, "getgetgetgetgetget", whereCondition, "whereConditionwhereCondition")
                totalItems = await OrderModel.count({
                    where: {
                        ...whereCondition,
                        user_id: req.userData.uuid
                    },
                });
            }
            //console.log(totalItems, "totalItemstotalItemstotalItems", get)
            const totalPages = Math.ceil(totalItems / pageSize);

            /* res.status(200).json({
              message: "Fetch Data",
              pagination: {
                currentPage: page,
                pageSize: pageSize,
                totalItems: totalItems,    //totalItems
                totalPages: totalPages,
              },
              statusCode: 200,
              success: true,
              data: get,
            });
            return */

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Order generated";
            res.data = get,
                res.pagination = {
                    currentPage: page,
                    pageSize: pageSize,
                    totalItems: totalItems,    //totalItems
                    totalPages: totalPages,
                }
            next();
            return;
        } catch (error) {
            console.error(error);
            // return res.status(500).json({
            //   message: error,
            //   statusCode: 500,
            //   success: false,
            // });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = error;
            next();
            return;
        }

    }

    async formatDate(dateString) {
        const date = new Date(dateString);

        const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' };
        const optionsTime = { hour: 'numeric', minute: 'numeric', hour12: true };

        // Format the date and time
        const formattedDate = date.toLocaleDateString('en-US', optionsDate);
        const formattedTime = date.toLocaleTimeString('en-US', optionsTime);

        return `${formattedDate} at ${formattedTime}`;
    }

    async getDayOfWeek(dateString) {
        const date = new Date(dateString);

        // Format options for getting the day of the week
        const options = { weekday: 'long' };

        // Get the formatted day of the week
        const dayOfWeek = date.toLocaleDateString('en-US', options);

        return dayOfWeek;
    }

    async get_dashboard_data_vendor(req, res, next) {
        try {
            let user_id = req.userData.uuid

            /************redis get data */
            let keyname = `${REDIS_KEY.ORDER_GET_DASHBOARD_DATA_VENDOR}:${user_id}`
            let getredisdata = await redis.get(keyname)
            if (getredisdata) {
                let extractdata = JSON.parse(getredisdata)
                if (extractdata && extractdata.data) {
                    res.locals.statusCode = 200;
                    res.locals.success = true;
                    res.locals.message = "Fetch data from redis";
                    res.locals.data = extractdata.data,
                        next();
                    return;
                }
            }
            let status = ['new', 'outfordelivery', 'processing', 'accept', 'dispatched', 'orderaccepted']

            let whereCondition = `
        status IN (${status.map(() => '?').join(',')})
      `;

            let replacements = [...status];
            if (req.userData.user_type === 'vendor') {
                whereCondition += ` AND JSON_CONTAINS(vendor_details, '{"uuid": "${user_id}"}', '$')`;
            }
            else if (req.userData.user_type = USERS?.RETAILER || req.userData.user_type == USERS?.RETAILER_SUB_USER) {
                whereCondition += ` AND user_id = ?`;
                replacements.push(user_id);
            }

            let get = await dbConnection.query(`
        SELECT id, uuid, order_id, user_id, delivery_date, order_date, status, vendor_details
        FROM orders
        WHERE ${whereCondition}
      `, {
                replacements,
                type: dbConnection.QueryTypes.SELECT
            });

            for (let el of get) {
                if (el.variantObj?.images?.length == 0) {
                    el.variantObj.images = el.productObj.product_images
                }
                el.getOrderDate = await this.formatDate(el?.order_date)
                el.getOrderDay = await this.getDayOfWeek(el?.order_date)
                el.expectedDeliveryDate = await this.formatDate(el.delivery_date)
                el.expectedDeliveryDay = await this.getDayOfWeek(el?.delivery_date)
                // delete el.vendor_details?.dob
                if (el.vendor_details) {
                    Object.keys(el.vendor_details).forEach(key => {
                        if (el.vendor_details[key] === null) {
                            delete el.vendor_details[key];
                        }
                    });
                }
                delete el?.vendor_details?.email
                delete el?.vendor_details?.password
                delete el?.vendor_details?.createdAt
                delete el?.vendor_details?.updatedAt
                delete el?.vendor_details?.created_by
                delete el?.vendor_details?.accessToken
                delete el?.vendor_details?.is_verified
                delete el?.vendor_details?.account_status
                delete el?.vendor_details?.cognito_user_id
                delete el?.vendor_details?.is_social_login
                delete el?.vendor_details?.preferred_language
            }
            let temp = get?.map((a) => a.status)
            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Fetch data";
            res.locals.data = get,
                next();

            /*******************redis set data */
            try {

                let redisobj = { data: get }
                await redis.set(keyname, JSON.stringify(redisobj), 'EX', environmentVars.REDISTTL)
            } catch (error) {
                console.log(error, "eredis set")
            }
            return;
        } catch (er) {
            console.log(er, "get_d_dashboard_data_vendor")
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = er?.message;
            next();
            return;
        }
    }


    async get_dashboard_data(req, res, next) {
        try {
            let user_id = req.userData.uuid
            let status = ['new', 'outfordelivery', 'processing', 'accept', 'dispatched', 'orderaccepted', 'accept', 'pending']
            let startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0); // Sets to 00:00:00.000 of today

            let endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            //------redis implement--------------------------------------------
            let keyname = `${REDIS_KEY.ORDER_GET_DASHBOARD_DATA}:${user_id}`
            let getredisData = await redis.get(keyname)
            if (getredisData) {
                let extractdata = await JSON.parse(getredisData)
                if (extractdata && extractdata.data) {
                    res.locals.statusCode = 200;
                    res.locals.success = true;
                    res.locals.message = "Fetch data from redis";
                    res.locals.data = extractdata?.data
                    next();
                    return;
                }
            }
            let get = await OrderModel.findAll({
                where: {
                    user_id: user_id,
                    status: { [Op.in]: status },
                    // created_at: {
                    //   [Op.gte]: startOfToday,
                    //   [Op.lte]: endOfToday
                    // }
                }, attributes: ['id', 'uuid', 'order_id', 'user_id', 'delivery_date', 'order_date', 'status'],
                order: [["id", "desc"]]
                , raw: true
            })
            for (let el of get) {
                el.getOrderDate = await this.formatDate(el?.order_date)
                el.getOrderDay = await this.getDayOfWeek(el?.order_date)
                el.expectedDeliveryDate = await this.formatDate(el.delivery_date)
                el.expectedDeliveryDay = await this.getDayOfWeek(el?.delivery_date)
            }
            // ----------redis-set data------------------------
            let redisObj = { data: get }
            await redis.set(keyname, JSON.stringify(redisObj), 'EX', environmentVars.REDISTTL)
            // console.log(get,'getgetgetgetgetgetget')
            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Fetch data";
            res.locals.data = get;
            next();
            return;
        } catch (er) {
            console.log(er, 'errrr get dashboard ')
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = er?.message;
            next();
            return;
        }
    }

    //request_accepted_by_vendor
    async request_accepted_by_vendor(req, res, next) {
        try {
            let { request_id, status } = req.body
            // return
            if (!Array.isArray(request_id)) {
                //return res.status(400).json({ message: "request_id should be an array", statusCode: 400, success: false });
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "request_id should be an array";
                next();
                return;
            }
            let successArray = [];
            let RejectArray = [];
            let failureArray = [];

            // Loop through each request_id
            for (let id of request_id) {
                // let request_obj = await RequestProductModel.findOne({ where: { uuid: id, expiry_date: { [Op.gte]: Date.now() } }, raw: true });
                let request_obj = await RequestProductModel.findOne({
                    where: {
                        uuid: id,
                        expiry_date: {
                            [Op.gte]: Date.now(),
                        },
                    },
                    include: [
                        {
                            model: ProductsModels,// Your Product model
                            as: 'productObj', // Alias defined in the association
                            required: true, // Ensures an inner join (only returns if matching product exists)
                            attributes: ['uuid', 'id', 'brand_id', 'brand_id_ar', 'title', 'title_ar', 'created_by', 'product_images']
                        },
                        {
                            model: User,
                            as: 'userObj',
                            required: true,
                            attributes: ['uuid', 'id', 'name', 'email', 'phone']
                        }
                    ],
                    raw: true,
                    nest: true, // Ensures nested object structure for included models
                });

                // console.log(requestObj,);

                if (!request_obj) {
                    failureArray.push({ uuid: id, message: "data not found" });
                    continue; // Skip to the next iteration
                }
                console.log(request_obj, "request_obj>>>>>>>>>>>>>>>>>>>>", "req.userData")
                if (status === 'accept') {
                    let temp = request_obj?.accepted_by_vendors ? [...request_obj.accepted_by_vendors] : [];
                    let already_accepted_check = temp.find((a) => a == req.userData.uuid);

                    if (!already_accepted_check) {
                        temp.push(req.userData.uuid);
                        await RequestProductModel.update({ accepted_by_vendors: temp }, { where: { uuid: id } });

                        successArray.push({ uuid: id, message: "Accept success" });
                        //-----send notification to retailer----------
                        let getRetailer = await getUserDataById(request_obj?.created_by);
                        console.log(getRetailer, "getRetailergetRetailer`token")
                        let notiObj = {
                            notification_type: 'product-request-accepted',
                            product_id: String(request_obj?.product_id),
                            created_by: String(request_obj?.created_by),
                            qty: String(request_obj?.quantity),
                            product_name: String(request_obj?.productObj?.title),
                            user_name: String(request_obj?.userObj?.name),
                            user_id: String(request_obj?.userObj?.uuid),
                            user_phone: String(request_obj?.userObj?.phone),
                            outlet_id: String(request_obj?.outlet_id),
                            brand_name: String(request_obj?.productObj?.brand_id),
                            image: String(request_obj?.productObj?.product_images[0]),
                            uuid: String(request_obj?.uuid),
                            //   "outlet_address": "462, Manglaya Sadak, delhi",
                            // "total": "685.74",
                        }
                        console.log(notiObj, "notiObjnotiObjnotiObjnotiObj")
                        let payload = {
                            notification: {
                                title: `Product request has been successfully accepted by the vendor`,
                                body: `Product ${request_obj?.product_title} request successfully accetped by vendor, please pay your amount.`,
                            },
                            data: notiObj
                        }
                        let notiJson = JSON.stringify(payload);
                        sendNotification(getRetailer?.deviceToken, payload, 1)
                        // return
                        let idr = uuidv4();
                        idr = idr.replace(/-/g, "");
                        //await NotificationDataModel.create({ uuid: idr, receiverId: getRetailer?.uuid, subject: notiObj.notification_type, body: notiJson })
                        //-----send notification to retailer----------
                        /**-------------------------------socket io-------------------------------------- */
                        let io = req.app.get("io");
                        const userSocketId = io?.userSocketMap?.get(request_obj?.created_by);
                        io.to(userSocketId).emit('request-order-accepted', { message: `Your product request successfully accetped by vendor`, data: { request_id: id } });
                        /**-------------------------------socket io-------------------------------------- */
                    } else {
                        successArray.push({ uuid: id, message: "You already accepted" });
                        failureArray.push({ uuid: id, message: "You already accepted" });
                    }

                } else if (status === 'reject') {
                    let temp = request_obj?.reject_by_vendors ? [...request_obj.reject_by_vendors] : [];
                    let check = temp.find((a) => a == req.userData.uuid);

                    if (!check) {
                        temp.push(req.userData.uuid);
                        await RequestProductModel.update({ reject_by_vendors: temp }, { where: { uuid: id } });

                        RejectArray.push({ uuid: id, message: "Reject success" });
                        successArray.push({ uuid: id, message: "Reject success" });
                    } else {
                        failureArray.push({ uuid: id, message: "You already rejected" });

                    }
                } else {
                    failureArray.push({ uuid: id, message: "Something went wrong with this request" });
                }

            }
            // return res.status(successArray.length > 0 ? 200 : 400).json({
            /* return res.status(200).json({
              success: successArray.length > 0,
              // message: RejectArray.length > 0 ? "Request Accepted" : "Request Deleted",
              message: RejectArray.length > 0 ? "Request Deleted" : "Request Accepted",
              successData: successArray,
              failureData: failureArray,
              // statusCode: successArray.length > 0 ? 200 : 400
              statusCode: 200
            }); */

            res.locals.statusCode = 200;
            res.locals.success = successArray.length > 0;
            res.locals.message = RejectArray.length > 0 ? "Request Deleted" : "Request Accepted";
            res.locals.successData = successArray;
            res.locals.failureData = failureArray;
            next();
            /******************************redis data previous del */
            if (successArray?.length > 0) {
                try {
                    const keyPatterns = [`${REDIS_KEY.ORDER}*`, `${REDIS_KEY.REQUEST_PRODUCT_VENDOR_GET}:${req.userData.uuid}*`];
                    for (const pattern of keyPatterns) {
                        const keys = await redis.keys(pattern);
                        if (keys?.length) {
                            await redis.del(...keys);
                        }
                    }
                } catch (error) {
                    console.error('ErrorRedis data:', error);
                }
            }

            return;
        } catch (err) {
            console.log(err, "eeeweffweeferegeerrbeebeeebeeeeeee   adefwefwfr")
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }


    async generate_order_by_vendor_for_requested_product(req, res, next) {
        try {
            let {
                request_product_id,
                warehouse_id,
                sub_total,
                delivery_method,
                payment_method
                , delivery_charges,
                country_code,
                payment_status,
                txn_id,
                payment_id,
                delivery_instructions,
                status,
            } = req.body;
            if (!Array.isArray(request_product_id)) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "request_product_id should be an array";
                next();
                return;
            }

            for (const reqProdId of request_product_id) {
                let requestProductObj = await RequestProductModel.findOne({
                    where: { uuid: reqProdId, request_status: "open" },
                    raw: true,
                });
                // console.log(requestProductObj, "requestProductObjrequestProductObjrequestProductObj")
                if (!requestProductObj) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = "Request Data not found";
                    next();
                    return;
                }
                // else if (reqest_status == 'closed') {
                //   return res.status(400).json({ message: "This request will be closed", statusCode: 400, success: false })
                // }
                let findProductObj = await ProductsModels.findOne({
                    where: { uuid: requestProductObj?.product_id, status: "active", is_deleted: 0, status_by_super_admin: 1 }, raw: true,
                    // attributes: ['id', 'uuid', 'category_id', 'status', 'universal_standard_code'] 
                })
                if (!findProductObj) {
                    //return res.status(400).json({ message: "Product not found", statusCode: 400, success: false })

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = "Product not found";
                    next();
                    return;
                }
                let variant_obj;
                if (requestProductObj?.variant_id) {
                    variant_obj = await ProductVariantModel?.findOne({
                        where: {
                            uuid: requestProductObj?.variant_id, status: "active"
                        },
                        raw: true,
                        attributes: ['id', 'uuid', 'product_id', 'packaging_type', 'status', 'images', 'warehouse_arr', 'price_details', "minimum_order_quantity", 'input_field', 'sku']
                    })
                    if (!variant_obj) {
                        //return res.status(400).json({ message: "Variant not found", statusCode: 400, success: false })
                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = "Variant not found";
                        next();
                        return;
                    }
                }
                if (findProductObj && findProductObj?.minimum_order_quantity > requestProductObj?.quantity || variant_obj?.minimum_order_quantity > requestProductObj?.quantity) {
                    //return res.status(400).json({ message: `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`, statusCode: 400, success: false })
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`;
                    next();
                    return;
                }
                if (findProductObj && findProductObj?.minimum_order_quantity > requestProductObj?.quantity || variant_obj?.minimum_order_quantity > requestProductObj?.quantity) {
                    //return res.status(400).json({ message: `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`, statusCode: 400, success: false })
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`;
                    next();
                    return;
                }
                let totalWwrehouseQuantity = 0
                if (findProductObj?.warehouse_arr) {

                    totalWwrehouseQuantity = findProductObj?.warehouse_arr?.find((a, b) => a?.id == warehouse_id)
                } else if (variant_obj?.warehouse_arr) {
                    totalWwrehouseQuantity = variant_obj?.warehouse_arr?.find((a, b) => a?.id == warehouse_id)
                }
                if (totalWwrehouseQuantity && totalWwrehouseQuantity?.quantity < requestProductObj?.quantity) {
                    //return res.status(400).json({ message: `Maximum quantity available is ${totalWwrehouseQuantity?.quantity}`, statusCode: 400, success: false })

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Maximum quantity available is ${totalWwrehouseQuantity?.quantity}`;
                    next();
                    return;
                }
                let requestSubTotal = Number(requestProductObj?.quantity) * Number(requestProductObj?.price)
                // let calculatedSubTotal = Number(requestProductObj?.quantity) * Number(variant_obj?.price_details)
                // console.log(requestSubTotal, "requestSubTotal ", "calculatedSubTotal", "calculaedSubTotal")
                if (requestSubTotal != Number(sub_total)) {
                    // return res.status(400).json({ message: "SubTotal amount is mismatched", statusCode: 400, success: false })
                }
                const timestamp = Date.now();
                let id = Date.now()?.toString().slice(7, -1) + Math.round(Math.random() * 100000)//+Math.round(Math.random()*1000000)
                let id2 = Date.now()?.toString().slice(7, -1) + Math.round(Math.random() * 100000)
                // let id = timestamp + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
                // let id2 = uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString() + timestamp;
                // id=id?.toString().slice(7,-1)+Math.round(Math.random()*100000)

                let warehouseObj = await WarehouseModel?.findOne({ where: { uuid: warehouse_id }, raw: true })
                if (!warehouseObj) {
                    //return res.status(400).json({ message: "Warehouse not found", statusCode: 400, succcess: false })

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = "Warehouse not found";
                    next();
                    return;
                }
                let outletObj = await OutletModel?.findOne({ where: { uuid: requestProductObj?.outlet_id }, raw: true })
                let commissionObj = await CommissionModel?.findOne({ where: { country_code: "UAE" }, raw: true })
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + 7);
                let pickupToDropDistance = await getDistance(
                    warehouseObj?.latitude,
                    warehouseObj?.longitude,
                    outletObj?.latitude,
                    outletObj?.longitude
                );
                if (findProductObj?.warehouse_arr) {
                    findProductObj.warehouse_arr = findProductObj?.warehouse_arr?.filter((a, b) => { a.id == warehouse_id })
                }
                let variant_obj2 = variant_obj
                variant_obj2 = JSON.parse(JSON.stringify(variant_obj))
                if (variant_obj?.warehouse_arr) {
                    variant_obj2.warehouse_arr = variant_obj?.warehouse_arr?.filter((a, b) => { a.id == warehouse_id })
                }
                let retailerUser = await User.findOne({ where: { uuid: requestProductObj?.created_by }, raw: true, attributes: ['uuid', 'id', 'name', 'name_ar', 'email'] })
                findProductObj.variant_obj = variant_obj2
                let obj = {
                    uuid: id,
                    warehouse_id,
                    outlet_id: requestProductObj?.outlet_id,
                    pick_up_latitude: warehouseObj?.latitude,
                    warehouse_po_box: warehouseObj?.po_box,
                    warehouse_address: warehouseObj?.address,
                    pick_up_longitude: warehouseObj?.longitude,
                    drop_latitude: outletObj?.latitude,
                    drop_longitude: outletObj?.longitude,
                    outlet_address: outletObj?.address,
                    po_box: outletObj?.po_box,
                    vendor_details: req.userData,
                    additional_commission_rate_for_retailer: commissionObj?.rate,
                    product_arr: [],///////////////////
                    retailer_product_arr: [],///////////
                    order_id: id2,
                    user_id: req.userData?.uuid,
                    sub_total: sub_total, // //// / / ////////////////////////////
                    retailer_sub_total: sub_total,//////////////////////
                    country_code: commissionObj?.country_code,
                    delivery_charges: delivery_charges,
                    payment_method: payment_method,
                    payment_status: payment_status,
                    status,
                    // card_details: card_details||"",
                    // card_data: card_data||"",
                    // ref_id: ref_id||"",
                    // txn_id: txn_id||"",
                    order_date: new Date(),
                    order_accepted_by_vendor: new Date(),
                    delivery_date: deliveryDate,
                    shipping_date: deliveryDate,
                    out_for_delivery_date: deliveryDate,
                    delivery_instructions: delivery_instructions,
                    // payment_id: payment_id,
                    pickupToDropDistance,
                    delivery_method,
                }
                //restrucure for email send--------------
                let vendorSubTotal = sub_total
                let retailerSubTotal = sub_total

                // Avoid circular reference by creating a new object without references to the original objects
                const simplifiedProductObj = {
                    ...findProductObj, // Copy properties of findProductObj
                    db_product_obj: null, // Avoid self-referencing
                    quantity: requestProductObj?.quantity,
                    db_price_obj: {
                        price: findProductObj?.price_details,
                    },
                    amount: Number(findProductObj?.price_details) * Number(requestProductObj?.quantity),
                };
                // Assign values to the arrays
                obj.product_arr.push(simplifiedProductObj);
                obj.retailer_product_arr.push(simplifiedProductObj);

                // Additional properties for email
                obj.sub_total = retailerSubTotal;
                obj.name = retailerUser?.name;
                obj.po_box = outletObj?.po_box;
                obj.outlet_address = outletObj?.address;
                obj.sub_total = retailerSubTotal;
                let newVendorArr = [{ vendor_details: { email: req.userData?.email, name: req.userData?.name }, ...obj }];
                await OrderModel.create(obj);
                // res
                //   .status(200)
                //   .json({
                //     message: "Order generated",
                //     statusCode: 201,
                //     success: true,
                //   });

                if (findProductObj?.warehouse_arr) {
                    let warehouse_Arr = findProductObj?.warehouse_arr?.map((a) => {
                        if (a?.id == warehouse_id) {
                            a.quantity = Number(a.quantity) - Number(requestProductObj?.quantity)
                        }
                        return a
                    })
                    await ProductsModels.update({ warehouse_arr: warehouse_Arr }, { where: { uuid: findProductObj?.uuid } })
                } else if (variant_obj?.warehouse_arr) {
                    let warehouse_Arr = variant_obj?.warehouse_arr?.map((a) => {
                        if (a?.id == warehouse_id) {
                            a.quantity = Number(a.quantity) - Number(requestProductObj?.quantity)
                        }
                        return a
                    })
                    await ProductVariantModel.update({ warehouse_arr: warehouse_Arr }, { where: { uuid: variant_obj?.uuid } })
                }
                await orderReceivedAndSendEmailToVendor(newVendorArr, vendorSubTotal);
                //=================new code====================================
                for (const generatedOrder of newVendorArr) {
                    let orderData = await OrderModel.findOne({
                        where: { order_id: generatedOrder.order_id },
                        raw: true,
                    });

                    //get email by id
                    let retailerData = await getUserDataById(orderData?.user_id);

                    //order generate email to retailer when vendor will placed order
                    await orderDetailsSendEmailToRetailer(retailerData, orderData, generatedOrder.order_id);

                }
                await RequestProductModel?.update({ request_status: 'closed' }, { where: { uuid: reqProdId } })
                try {
                    const keys = await redis.keys(`${REDIS_KEY.REQUEST_PRODUCT_VENDOR_GET}:${req.userData.uuid}*`);
                    if (keys && keys?.length) {
                        await redis.del(...keys);
                    }
                } catch (error) {
                    console.log(error, 'redis generate order ')
                }
            }
            // res.status(200).json({ message: "Order Generated Successfully", statusCode: 400, success: false })
            // return;
            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Order Generated Successfully";
            next();
            return;
        } catch (err) {
            console.log(err, "error in order create api");
            // return res
            //   .status(500)
            //   .json({ message: err?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async generate_order_by_vendor_for_requested_product_new(req, res, next) {
        try {
            let {
                request_warehouse,
                suotb_tal,
                delivery_method,
                payment_method,
                delivery_charges,
                country_code,
                txn_id,
                payment_id,
                delivery_instructions,
            } = req.body;
            if (!Array.isArray(request_warehouse)) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Request Warehouse should be an array";
                next();
                return;
            }
            let request_ids = request_warehouse.map((a) => a.request_id);
            let warehouse_ids = request_warehouse.map((a) => a.warehouse_id);

            let requestProductArray = await RequestProductModel.findAll({
                where: { uuid: { [Op.in]: request_ids }, request_status: "open", expiry_date: { [Op.gte]: Date.now() } },
                raw: true,
            });
            let warehouseArray = await WarehouseModel.findAll({ where: { uuid: { [Op.in]: warehouse_ids } }, raw: true });

            let productKey = []
            let variantKey = [];
            let outletKey = [];
            for (const requestProductObj of requestProductArray) {
                productKey.push(requestProductObj.product_id);
                variantKey.push(requestProductObj.variant_id);
                outletKey.push(requestProductObj.outlet_id);
            }
            let vendorDbData = await User.findOne({
                where: { uuid: req.userData?.uuid },
                raw: true,
                attributes: [
                    "id",
                    "uuid",
                    "user_type",
                    "name",
                    "email",
                    "phone",
                    "account_status",
                    "deviceToken",
                    "company_name",
                    "company_address",
                    "company_logo"
                ],
            });
            let productArray = await ProductsModels.findAll({
                where: { uuid: { [Op.in]: productKey }, status: "active", is_deleted: 0, status_by_super_admin: 1 }, raw: true,
                attributes: [
                    "id",
                    "uuid",
                    "brand_id",
                    "description",
                    "summary",
                    "category_id",
                    "subcategory_id",
                    "subcategory_id_level3",
                    "subcategory_id_level4",
                    "condition",
                    "title",
                    "universal_standard_code",
                    "status",
                    "created_by",
                    "vat",
                    "product_images"
                ]
            });
            let variantArray = await ProductVariantModel?.findAll({
                where: {
                    uuid: { [Op.in]: variantKey }, status: "active"
                },
                raw: true,
                attributes: ['id', 'uuid', 'product_id', 'packaging_type', 'status', 'images', 'warehouse_arr', 'price_details', "minimum_order_quantity", 'input_field', 'sku']
            });

            let outletArray = await OutletModel?.findAll({ where: { uuid: { [Op.in]: outletKey } }, raw: true });
            let commissionObj = await CommissionModel?.findOne({ where: { country_code: "UAE" }, raw: true });
            for (const request_warehouse_obj of request_warehouse) {
                let requestProductObj = await requestProductArray?.find((a) => a.uuid == request_warehouse_obj?.request_id);
                let findProductObj = await productArray?.find((a) => a.uuid == requestProductObj?.product_id);
                if (!findProductObj) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = "Product not found";
                    next();
                    return;
                }
                let variant_obj;
                if (requestProductObj?.variant_id) {
                    variant_obj = await variantArray?.find((a) => a.uuid == requestProductObj?.variant_id);
                    if (!variant_obj) {
                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = "Variant not found";
                        next();
                        return;
                    }
                }
                let warehouseObj = await warehouseArray?.find((a) => a.uuid == request_warehouse_obj?.warehouse_id);
                if (!warehouseObj) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = "Warehouse not found";
                    next();
                    return;
                }

                if (!variant_obj.images || variant_obj.images.length == 0) variant_obj.images = findProductObj.product_images;
                //delete variant_obj?.warehouse_arr;
                delete variant_obj?.created_at;
                delete variant_obj?.updated_at;
                if (variant_obj?.minimum_order_quantity > requestProductObj?.quantity) {
                    //return res.status(400).json({ message: `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`, statusCode: 400, success: false })

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Minimum_order_quantity is ${variant_obj?.minimum_order_quantity}`;
                    next();
                    return;
                }

                let totalWwrehouseQuantity = 0
                if (variant_obj?.warehouse_arr) {
                    totalWwrehouseQuantity = variant_obj?.warehouse_arr?.find((a, b) => a?.id == warehouseObj.uuid)
                }
                if (totalWwrehouseQuantity && totalWwrehouseQuantity?.quantity < requestProductObj?.quantity) {
                    //return res.status(400).json({ message: `Maximum quantity available is ${totalWwrehouseQuantity?.quantity}`, statusCode: 400, success: false })

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Maximum quantity available is ${totalWwrehouseQuantity?.quantity}`;
                    next();
                    return;
                }

                let randomNumber = String(Date.now() + Math.floor(10000000 + Math.random() * 90000000 + Math.random() * 80000)).slice(0, -3); // Generates an 8-digit random number
                let id = `OD` + randomNumber;
                console.log('orderID : ', id);
                let outletObj = await outletArray?.find((a) => a.uuid == requestProductObj?.outlet_id);
                /**------------------------------------commission calculation-------------------------------------------- */

                variant_obj.db_price = requestProductObj.price;
                variant_obj.vat = findProductObj.vat;
                variant_obj.quantity = requestProductObj.quantity;
                console.log("variant_obj 2", variant_obj);
                //return;
                variant_obj.db_price_total_without_vat = Number(variant_obj?.db_price);
                let commission_on_single_unit = requestProductObj.commission_admin;
                let vendor_vat = 0;
                let vat_on_single_unit = 0;
                let vendor_price = Number(variant_obj?.db_price);
                if (Number(variant_obj.vat)) {
                    vendor_vat = (Number(vendor_price) * Number(variant_obj.vat) / 100).toFixed(2);
                    vat_on_single_unit = ((Number(variant_obj?.db_price) + Number(commission_on_single_unit)) * Number(variant_obj.vat) / 100).toFixed(2);
                }
                variant_obj.vat_on_single_unit = vat_on_single_unit;
                variant_obj.vendor_vat = vendor_vat;
                variant_obj.commission_on_single_unit = commission_on_single_unit;
                variant_obj.vendor_price = vendor_price;
                variant_obj.total_pricee_pay = Number(variant_obj?.db_price) + Number(commission_on_single_unit) + Number(vat_on_single_unit);
                let sub_total = Number(variant_obj?.db_price) + Number(vendor_vat);

                /**------------------------------------commission calculation-------------------------------------------- */
                const deliveryDate = this.getDeliveryTime();
                /* const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + 7); */
                let pickupToDropDistance = await getDistance(
                    warehouseObj?.latitude,
                    warehouseObj?.longitude,
                    outletObj?.latitude,
                    outletObj?.longitude
                );
                if (findProductObj?.warehouse_arr) {
                    findProductObj.warehouse_arr = findProductObj?.warehouse_arr?.filter((a, b) => { a.id == warehouse_id })
                }
                let variant_obj2 = variant_obj
                variant_obj2 = JSON.parse(JSON.stringify(variant_obj))
                if (variant_obj?.warehouse_arr) {
                    variant_obj2.warehouse_arr = variant_obj?.warehouse_arr?.filter((a, b) => { a.id == warehouseObj?.uuid })
                }
                let retailerUser = await User.findOne({ where: { uuid: requestProductObj?.created_by }, raw: true, attributes: ['uuid', 'id', 'name', 'name_ar', 'email'] })
                // findProductObj.variant_obj = variant_obj2
                let obj = {
                    uuid: id,
                    warehouse_id: warehouseObj?.uuid,
                    outlet_id: requestProductObj?.outlet_id,
                    pick_up_latitude: warehouseObj?.latitude,
                    warehouse_po_box: warehouseObj?.po_box,
                    warehouse_address: warehouseObj?.address,
                    pick_up_longitude: warehouseObj?.longitude,
                    drop_latitude: outletObj?.latitude,
                    drop_longitude: outletObj?.longitude,
                    outlet_address: outletObj?.address,
                    po_box: outletObj?.po_box,
                    vendor_details: vendorDbData,
                    additional_commission_rate_for_retailer: commissionObj?.rate,
                    product_arr: [],//////////////////////////////
                    retailer_product_arr: [],////////////////////////////////
                    order_id: id,
                    user_id: requestProductObj?.created_by,//   retailerUser?.uuid,
                    sub_total: sub_total,//////////////////////////////////////
                    retailer_sub_total: sub_total,//////////////////////
                    country_code: commissionObj?.country_code,
                    delivery_charges: delivery_charges,
                    payment_method: requestProductObj?.payment_method,
                    //payment_mode: requestProductObj?.payment_mode,
                    payment_status: "pending",
                    status: requestProductObj?.payment_method == "against_delivery" ? "orderaccepted" : "requested",
                    order_status_arr: [{ status: requestProductObj?.payment_method == "against_delivery" ? "orderaccepted" : "requested", date: new Date() }],
                    order_date: new Date(),
                    order_accepted_by_vendor: new Date(),
                    delivery_date: deliveryDate,
                    shipping_date: deliveryDate,
                    out_for_delivery_date: deliveryDate,
                    delivery_instructions: delivery_instructions,
                    // payment_id: payment_id,
                    pickupToDropDistance,
                    delivery_method,
                    request_id: requestProductObj?.uuid,
                    emp_id: requestProductObj?.emp_id,
                    common_order_id: id,
                }
                // console.log(obj.product_arr, "obj.product_arrobj.product_arr")
                let db_price_obj = {
                    price: variant_obj?.db_price,
                    offer_price: variant_obj?.db_price,
                    vat: variant_obj.vat_on_single_unit,
                    commission: variant_obj.commission_on_single_unit
                }
                // Assign values to the arrays
                obj.product_arr = [
                    {
                        db_product_obj: findProductObj,
                        db_variant_obj: variant_obj,
                        db_price_obj: db_price_obj,
                        db_warehouse_obj: warehouseObj,
                        quantity: Number(variant_obj?.quantity),
                        amount: (Number(variant_obj?.vendor_price) + Number(variant_obj.vendor_vat)) * Number(variant_obj?.quantity),
                        vat_total: Number(variant_obj.quantity) * Number(variant_obj.vendor_vat),
                        discount_total: 0,
                    },
                ],
                    obj.retailer_product_arr = [
                        {
                            db_product_obj: findProductObj,
                            db_variant_obj: variant_obj,
                            db_price_obj: db_price_obj,
                            db_warehouse_obj: warehouseObj,
                            quantity: variant_obj?.quantity,
                            amount: Number(variant_obj?.quantity) * (Number(variant_obj?.vendor_price) + Number(variant_obj.vat_on_single_unit) + Number(variant_obj.commission_on_single_unit)),
                            vat_total: Number(variant_obj.quantity) * (Number(variant_obj.vat_on_single_unit)),
                            discount_total: 0,
                            commission_total: (Number(variant_obj.commission_on_single_unit)) * Number(variant_obj.quantity)
                        },
                    ]

                // Additional properties for email
                obj.sub_total = (Number(variant_obj?.vendor_price) + Number(variant_obj?.vendor_vat)) * Number(variant_obj?.quantity);
                obj.vendor_sub_sub_total = Number(variant_obj?.vendor_price) * Number(variant_obj?.quantity);
                obj.vendor_vat = Number(variant_obj?.vendor_vat) * Number(variant_obj?.quantity);
                obj.name = retailerUser?.name;
                obj.po_box = outletObj?.po_box;
                obj.outlet_address = outletObj?.address;
                let newVendorArr = [{ vendor_details: { email: req.userData?.email, name: req.userData?.name }, ...obj }];
                //obj.sub_total = ((Number(variant_obj?.db_price) + Number(variant_obj?.vat_on_single_unit)) * Number(variant_obj?.quantity)).toFixed(2);
                obj.retailer_sub_total = (Number(variant_obj?.quantity) * Number(variant_obj.total_pricee_pay)).toFixed(2);
                obj.retailer_sub_sub_total = ((Number(variant_obj.total_pricee_pay) - Number(variant_obj.vat_on_single_unit) - Number(variant_obj.commission_on_single_unit)) * Number(variant_obj?.quantity)).toFixed(2);
                obj.retailer_vat = (Number(variant_obj.quantity) * Number(variant_obj.vat_on_single_unit)).toFixed(2);
                obj.retailer_commission = ((Number(variant_obj.commission_on_single_unit)) * Number(variant_obj.quantity)).toFixed(2);
                // console.log("obj",obj);
                // res.json({ obj });
                // return;
                await OrderModel.create(obj);
        /* if (findProductObj?.warehouse_arr) {
          let warehouse_Arr = findProductObj?.warehouse_arr?.map((a) => {
            if (a?.id == warehouse_id) {
              a.quantity = Number(a.quantity) - Number(requestProductObj?.quantity)
            }
            return a
          })
          await ProductsModels.update({ warehouse_arr: warehouse_Arr }, { where: { uuid: findProductObj?.uuid } })
        } else  */if (variant_obj?.warehouse_arr) {
                    console.log(variant_obj, "variant_objvariant_objvariant_obj")
                    console.log(warehouseObj?.uuid, "warehouse_id")
                    let warehouse_Arr = variant_obj?.warehouse_arr?.map((a) => {
                        if (a?.id == warehouseObj?.uuid) {
                            a.quantity = Number(a.quantity) - Number(requestProductObj?.quantity)
                        }
                        console.log(a, "aaaaaaaaaaaaaa")
                        return a
                    })
                    console.log(warehouse_Arr, "aaaaaaaaaaaaaaaaaaaaaaaa")
                    await ProductVariantModel.update({ warehouse_arr: warehouse_Arr }, { where: { uuid: variant_obj?.uuid } })
                }
                // return
                // console.log("=========", newVendorArr, "newVendor", "temVariantData")
                //=================new code====================================
                for (const generatedOrder of newVendorArr) {
                    // console.log("newvwndorarrorderidddd", generatedOrder.order_id)
                    let orderData = await OrderModel.findOne({
                        where: { order_id: generatedOrder.order_id },
                        raw: true,
                    });

                    let getUser = await getUserDataById(orderData.user_id);

                    let retailerEmail = getUser?.email;
                    // console.log("retailerEmaillllll:", retailerEmail);

                    //await orderDetailsSendEmailToRetailer(retailerEmail, orderData, generatedOrder.order_id);  //send order invoice to retailer

                    const timestamp = new Date().toISOString();
                    const genPin = Math.floor(100000 + Math.random() * 900000);
                    console.log(genPin, '==========', timestamp);
                    const resData = await OrderModel.update(
                        { pin: genPin, order_accepted_by_vendor: timestamp },
                        { where: { order_id: generatedOrder.order_id } }
                    );

                    //For notification start
                    /*const orderDate = orderData?.order_date.toISOString().split('T')[0];
                    let notiObj = {
                      notification_type: 'order-placed',
                      uuId: String(orderData?.uuid),
                      orderId: String(orderData?.order_id),
                      orderDate: String(orderDate),
                      subTotal: String(orderData?.retailer_sub_sub_total),
                      vat_fee: String(orderData?.retailer_vat),
                      discount: String(orderData?.retailer_discount),
                      total: String(orderData?.retailer_sub_total)
                    }
                    
                    let payload = {
                      notification: {
                        title: 'Your order successfully placed by vendor.',
                        body: `Order id is ${generatedOrder.order_id}`,
                      },
                      data: notiObj
                    }
                    let notiJson = JSON.stringify(payload);
                    sendNotification(getUser?.deviceToken, payload)
                    let idr = uuidv4();
                    idr = idr.replace(/-/g, "");
                    NotificationDataModel.create({ uuid: idr, receiverId: getUser?.uuid, subject: notiObj.notification_type, body: notiJson })
                    */
                    //For notification end


                    // notify logistic
                    await this.notifyLogistic(generatedOrder.order_id)
                    /**-------------------------------socket io-------------------------------------- */
                    let io = req.app.get("io");
                    const userSocketId = io?.userSocketMap?.get(orderData.user_id);
                    io.to(userSocketId).emit('request-order-generated', {
                        title: 'Your order successfully placed by vendor.',
                        body: `Order id is ${generatedOrder.order_id}`,
                    });
                    /**-------------------------------socket io-------------------------------------- */


                    //==================new code===================================
                    await RequestProductModel?.update({ request_status: 'closed' }, { where: { uuid: requestProductObj?.uuid } });
                    /****************************redis delete data */
                    try {
                        const keyPatterns = [`${REDIS_KEY.REQUEST_PRODUCT_VENDOR_GET}:${req.userData.uuid}*`, `${REDIS_KEY.ORDER}*`];
                        for (const pattern of keyPatterns) {
                            const keys = await redis.keys(pattern);
                            if (keys?.length) {
                                await redis.del(...keys);
                            }
                        }
                    } catch (error) {
                        console.error('Error while clearing Redis keys:', error);
                    }
                }



            }
            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Order generated";
            next();
            return;
        } catch (err) {
            console.log(err, "error in order create api");
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    // create order for  by vendor for specifc retailer  
    async generate_order_by_vendor_for_specific_retailer(req, res, next) {
        try {
            let {
                outlet_id,
                retailer_id,
                warehouse_id,
                sub_total,
                delivery_method,
                payment_method
                , delivery_charges,
                country_code,
                payment_status,
                txn_id,
                payment_id,
                delivery_instructions,
                status,
                order_details
            } = req.body;
            // console.log(req.userData, "req.boddyyddy")
            let outletObj = await OutletModel.findOne({
                where: { uuid: outlet_id, is_default: 1 },
                raw: true,
            });
            if (!outletObj) {
                //return res.status(400).json({ message: "Data not found", statusCode: 400, success: false })
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Data not found";
                next();
                return;
            }
            // let user_id = [retailer_id
            let get_retailer_obj = await User?.findOne({ where: { uuid: retailer_id }, raw: true, attributes: ['id', 'uuid', 'email', 'user_type', 'name', 'name_ar', 'phone', 'company_name', 'company_address'] })
            if (!get_retailer_obj) {
                return req.status(400).json({ message: "Retailer not found", statusCode: 400, success: false })
            }
            // 
            const rawQuery = `
SELECT 
 variants.id, 
 variants.uuid, 
variants.product_id,
variants.title,
variants.images,
variants.price_details,
variants.minimum_order_quantity,
variants.input_field,
variants.sku,
variants.warehouse_arr
  FROM variants 
  WHERE created_by = :created_by 
  AND JSON_CONTAINS(warehouse_arr, '{"id": "${warehouse_id}"}', '$')
`;
            const Variant = await dbConnection.query(rawQuery, {
                replacements: {
                    created_by: req.userData.uuid,
                },
                type: dbConnection.QueryTypes.SELECT,
            });




            let ui_product_arr = order_details?.map((a) => a?.product_id)
            let ui_variant_arr = order_details?.map((a) => a?.variant_id)
            let findProductArr = await ProductsModels.findOne({
                where: { uuid: ui_product_arr, status: "active" }, raw: true,
                // attributes: ['id', 'uuid', 'category_id', 'status', 'universal_standard_code'] 
            })

            for (let el of ui_product_arr) {
                let findExist = findProductArr?.find((a) => a?.uuid == el)
                if (!findExist) {
                    //return res.status(400).json({ message: `This Product ${el} not found`, statusCode: 400, success: false })

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This Product ${el} not found`;
                    next();
                    return;
                }
            }
            for (let el of ui_variant_arr) {
                let findExist = findProductArr?.find((a) => a?.uuid == el)
                if (!findExist) {
                    //return res.status(400).json({ message: `This Product ${el} not found`, statusCode: 400, success: false })

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This Product ${el} not found`;
                    next();
                    return;
                }
            }

            if (!findProductObj) {
                //return res.status(400).json({ message: "Product not found", statusCode: 400, success: false })

                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Product not found";
                next();
                return;
            }
            let variant_obj;
            if (requestProductObj?.variant_id) {
                variant_obj = await ProductVariantModel?.findOne({
                    where: {
                        uuid: requestProductObj?.variant_id, status: "active"
                    },
                    raw: true,
                    attributes: ['id', 'uuid', 'product_id', 'packaging_type', 'status', 'images', 'warehouse_arr', 'price_details', "minimum_order_quantity", 'input_field', 'sku']
                })
                if (!variant_obj) {
                    //return res.status(400).json({ message: "Variant not found", statusCode: 400, success: false })
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = "Variant not found";
                    next();
                    return;
                }
            }
            if (findProductObj && findProductObj?.minimum_order_quantity > requestProductObj?.quantity || variant_obj?.minimum_order_quantity > requestProductObj?.quantity) {
                //return res.status(400).json({ message: `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`, statusCode: 400, success: false })
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`;
                next();
                return;
            }
            if (findProductObj && findProductObj?.minimum_order_quantity > requestProductObj?.quantity || variant_obj?.minimum_order_quantity > requestProductObj?.quantity) {
                //return res.status(400).json({ message: `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`, statusCode: 400, success: false })
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = `Minimum_order_quantity is ${findProductObj?.minimum_order_quantity}`;
                next();
                return;
            }
            let totalWwrehouseQuantity = 0
            if (findProductObj?.warehouse_arr) {

                totalWwrehouseQuantity = findProductObj?.warehouse_arr?.find((a, b) => a?.id == warehouse_id)
            } else if (variant_obj?.warehouse_arr) {
                totalWwrehouseQuantity = variant_obj?.warehouse_arr?.find((a, b) => a?.id == warehouse_id)
            }
            if (totalWwrehouseQuantity && totalWwrehouseQuantity?.quantity < requestProductObj?.quantity) {
                //return res.status(400).json({ message: `Maximum quantity available is ${totalWwrehouseQuantity?.quantity}`, statusCode: 400, success: false })
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = `Maximum quantity available is ${totalWwrehouseQuantity?.quantity}`;
                next();
                return;
            }
            let requestSubTotal = Number(requestProductObj?.quantity) * Number(requestProductObj?.price)
            // let calculatedSubTotal = Number(requestProductObj?.quantity) * Number(variant_obj?.price_details)
            console.log(requestSubTotal, "requestSubTotal ", "calculatedSubTotal", "calculaedSubTotal")
            if (requestSubTotal != Number(sub_total)) {
                //return res.status(400).json({ message: "SubTotal amount is mismatched", statusCode: 400, success: false })
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "SubTotal amount is mismatched";
                next();
                return;
            }
            const timestamp = Date.now();
            let id = timestamp + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
            let id2 = uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString() + timestamp;
            let warehouseObj = await WarehouseModel?.findOne({ where: { uuid: warehouse_id }, raw: true })
            if (!warehouseObj) {
                //return res.status(400).json({ message: "Warehouse not found", statusCode: 400, succcess: false })

                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Warehouse not found";
                next();
                return;
            }
            // let outletObj = await OutletModel?.findOne({ where: { uuid: requestProductObj?.outlet_id }, raw: true })
            let commissionObj = await CommissionModel?.findOne({ where: { country_code: "UAE" }, raw: true })
            const deliveryDate = new Date().toISOString();
            deliveryDate.setHours(deliveryDate.getHours() + 3);

            let pickupToDropDistance = await getDistance(
                warehouseObj?.latitude,
                warehouseObj?.longitude,
                outletObj?.latitude,
                outletObj?.longitude
            );
            if (findProductObj?.warehouse_arr) {
                findProductObj.warehouse_arr = findProductObj?.warehouse_arr?.filter((a, b) => { a.id == warehouse_id })
            }
            let variant_obj2 = variant_obj
            variant_obj2 = JSON.parse(JSON.stringify(variant_obj))
            if (variant_obj?.warehouse_arr) {
                variant_obj2.warehouse_arr = variant_obj?.warehouse_arr?.filter((a, b) => { a.id == warehouse_id })
            }
            let retailerUser = await User.findOne({ where: { uuid: requestProductObj?.created_by }, raw: true, attributes: ['uuid', 'id', 'name', 'name_ar', 'email'] })
            findProductObj.variant_obj = variant_obj2
            let obj = {
                uuid: id,
                warehouse_id,
                outlet_id: requestProductObj?.outlet_id,
                pick_up_latitude: warehouseObj?.latitude,
                warehouse_po_box: warehouseObj?.po_box,
                warehouse_address: warehouseObj?.address,
                pick_up_longitude: warehouseObj?.longitude,
                drop_latitude: outletObj?.latitude,
                drop_longitude: outletObj?.longitude,
                outlet_address: outletObj?.address,
                po_box: outletObj?.po_box,
                vendor_details: req.userData,
                additional_commission_rate_for_retailer: commissionObj?.rate,
                product_arr: [],//////////////////////////////
                retailer_product_arr: [],////////////////////////////////
                order_id: id2,
                user_id: req.userData?.uuid,
                sub_total: sub_total,//////////////////////////////////////
                retailer_sub_total: sub_total,//////////////////////
                country_code: commissionObj?.country_code,
                delivery_charges: delivery_charges,
                payment_method: payment_method,
                payment_status: payment_status,
                status,
                // card_details: card_details||"",
                // card_data: card_data||"",
                // ref_id: ref_id||"",
                // txn_id: txn_id||"",
                order_date: new Date(),
                order_accepted_by_vendor: new Date(),
                delivery_date: deliveryDate,
                shipping_date: deliveryDate,
                out_for_delivery_date: deliveryDate,
                delivery_instructions: delivery_instructions,
                // payment_id: payment_id,
                pickupToDropDistance,
                delivery_method,
            }
            console.log(outletObj, "outleyyyyyyyyyyyyyyyyy")
            //restrucure for email send--------------
            let vendorSubTotal = sub_total
            let retailerSubTotal = sub_total
            // console.log(obj.product_arr, "obj.product_arrobj.product_arr")

            // Avoid circular reference by creating a new object without references to the original objects
            const simplifiedProductObj = {
                ...findProductObj, // Copy properties of findProductObj
                db_product_obj: null, // Avoid self-referencing
                quantity: requestProductObj?.quantity,
                db_price_obj: {
                    price: findProductObj?.price_details,
                },
                amount: Number(findProductObj?.price_details) * Number(requestProductObj?.quantity),
            };
            // Assign values to the arrays
            obj.product_arr.push(simplifiedProductObj);
            obj.retailer_product_arr.push(simplifiedProductObj);

            // Additional properties for email
            obj.sub_total = retailerSubTotal;
            obj.name = retailerUser?.name;
            obj.po_box = outletObj?.po_box;
            obj.outlet_address = outletObj?.address;
            obj.sub_total = retailerSubTotal;
            let newVendorArr = [{ vendor_details: { email: req.userData?.email, name: req.userData?.name }, ...obj }];
            await OrderModel.create(obj);
            /* res
              .status(200)
              .json({
                message: "Order generated",
                statusCode: 201,
                success: true,
              }); */

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Order generated";
            next();
            //return;
            // console.log(fetchVarianWarehouseData, "fetchVarianWarehouseData", tempVariantData)
            // return

            if (findProductObj?.warehouse_arr) {
                let warehouse_Arr = findProductObj?.warehouse_arr?.map((a) => {
                    if (a?.id == warehouse_id) {
                        a.quantity = Number(a.quantity) - Number(requestProductObj?.quantity)
                    }
                    return a
                })
                await ProductsModels.update({ warehouse_arr: warehouse_Arr }, { where: { uuid: findProductObj?.uuid } })
            } else if (variant_obj?.warehouse_arr) {
                // console.log(variant_obj, "variant_objvariant_objvariant_obj")
                let warehouse_Arr = variant_obj?.warehouse_arr?.map((a) => {
                    if (a?.id == warehouse_id) {
                        a.quantity = Number(a.quantity) - Number(requestProductObj?.quantity)
                    }
                    // console.log(a, "aaaaaaaaaaaaaa")
                    return a
                })
                // console.log(warehouse_Arr, "aaaaaaaaaaaaaaaaaaaaaaaa")
                await ProductVariantModel.update({ warehouse_arr: warehouse_Arr }, { where: { uuid: variant_obj?.uuid } })
            }
            // return
            // console.log(newVendorArr, "  newVendorAr ndorArr@@!@", "temVariantData")
            await orderReceivedAndSendEmailToVendor(newVendorArr, vendorSubTotal);
            await orderDetailsSendEmailToRetailer(
                newVendorArr,
                retailerSubTotal,
                req.userData
            );
            await RequestProductModel?.update({ request_status: 'closed' }, { where: { uuid: request_product_id } })
            try {

                const keys = await redis.keys(`${REDIS_KEY.REQUEST_PRODUCT_VENDOR_GET}:${req.userData.uuid}*`);
                if (keys && keys?.length) {
                    await redis.del(...keys);
                }
            } catch (error) {
                console.log(error, 'eeadse thee erth  ee')
            }
        } catch (err) {
            console.log(err, "error in order create api");
            // return res
            //   .status(500)
            //   .json({ message: err?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async order_by_user_id(req, res, next) {
        try {
            let user_id = req.userData.uuid
            let retailer_id = req.query.user_id
            // user_id='17272631100476a1bd5cc091b46b1bf2'
            // retailer_id = "1153c9f49be9419b9e41727766453166"

            // console.log(user_id, "usrididi", retailer_id, "retailer_iddd")
            const page = Number(req.query.page) || 1; // Default to page 1
            // console.log("pageSize", "pageSize pageSize ", req.query.pageSize, "Aaaaaaaaaaa")
            const pageSize = Number(req.query.pageSize) || 100; // Default to 10 records per page
            const offset = (page - 1) * pageSize; // Calculate the number of records to skip

            /********************REDIS GET DATA */
            let keyname = `${REDIS_KEY.ORDER_BY_USER_ID}:${user_id}:${retailer_id}:${page}:${pageSize}`
            let getredissdata = await redis.get(keyname)
            if (getredissdata) {
                let getextract = await JSON.parse(getredissdata)
                if (getextract && getextract.data && getextract.other_details) {
                    res.locals.statusCode = 200;
                    res.locals.success = true;
                    res.locals.message = "fetch data";
                    res.locals.data = getextract.data;
                    res.locals.other_details = getextract.other_details;
                    res.locals.totalRecords = getextract.totalRecords;
                    res.locals.currentPage = getextract.currentPage;
                    res.locals.totalPages = getextract.totalPages
                    next();
                    return
                }
            }
            let whereCondition = `
 user_id = '${retailer_id}' 
 AND JSON_CONTAINS(IFNULL(vendor_details, '{}'), '{"uuid": "${user_id}"}', '$')
  AND status = 'dispatched'
`;

            let get = await dbConnection.query(`
    SELECT id, uuid, order_id, user_id, delivery_date,outlet_id,warehouse_id,warehouse_address ,pick_up_latitude ,warehouse_po_box,pick_up_longitude,drop_latitude,drop_longitude,po_box,outlet_address,payment_method, order_date, status, vendor_details, product_arr, sub_total, status
    FROM orders
    WHERE ${whereCondition}
    ORDER BY order_date DESC  -- Sort by latest order
  LIMIT 1                   -- Fetch only the latest one record
  `, {
                type: dbConnection.QueryTypes.SELECT
            });
            let totalCount = await dbConnection.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE ${whereCondition}
  `, {
                type: dbConnection.QueryTypes.SELECT
            });
            // console.log(2
            //   get, "GEgege"
            // )
            for (let el of get) {
                delete el.delivery_date

                delete el.vendor_details.deviceToken
                // delete el.vendor_details.user_type
                delete el.vendor_details.phone
                // delete el.vendor_details.uuid
                delete el.vendor_details.account_status
                delete el.vendor_details.warehouse_obj

                for (let f of el?.product_arr) {
                    // delete f.db_product_obj?.summary
                    delete f.db_product_obj?.created_by
                    // delete f.db_product_obj?.description
                    // delete f.db_product_obj?.universal_standard_code
                    delete f.db_variant_obj?.created_by
                    delete f.db_variant_obj?.expiry_date
                    delete f.db_variant_obj?.status
                    delete f.db_variant_obj?.discount
                    delete f.db_variant_obj?.discount_type
                    delete f.vendor_details?.packaging_date
                    delete f.vendor_details?.price_details
                    delete f.vendor_details?.discountedPrice
                    delete f.vendor_details?.db_warehouse_obj

                }
            }
            let obj = {
                vat: 5,
                discount: 10,
                vat_percentage: 5,
                vat_total_price: 25,
                total_amount: 1235,
                brank_name: "dubai bank",
                branch: "al madia state",
                iban_number: "ertyuio",
            }
            /* return res.status(200).json({
              message: "fetch data",
              statusCode: 200,
              success: true,
              data: get,
              other_details: obj,
              totalRecords: totalCount[0].count,
              currentPage: page,
              totalPages: Math.ceil(totalCount[0].count / pageSize),
            }); */

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "fetch data";
            res.locals.data = get;
            res.locals.other_details = obj;
            res.locals.totalRecords = totalCount[0].count;
            res.locals.currentPage = page;
            res.locals.totalPages = Math.ceil(totalCount[0].count / pageSize);
            next();
            /*************redis set data */
            let redisobj = {
                data: get,
                other_details: obj,
                totalRecords: totalCount[0].count,
                currentPage: page,
                totalPages: Math.ceil(totalCount[0].count / pageSize)
            }
            await redis.set(keyname, JSON.stringify(redisobj), 'EX', environmentVars.REDISTTL)
            return;
        } catch (err) {
            console.log(err, "aaaaaaaaaaaaaa")
            //return res.status(500).json({ message: err?.message, statusCode: 500, success: false })
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async get_by_order_id(req, res, next) {
        try {
            let order_id = req?.query?.order_id
            // req.userData.user_type = 'retailer'

            console.log('orderIdgett:', order_id, req?.userData?.user_type, "req.userData.user_type,")

            if (!order_id || order_id == "undefined") {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }
            let keyname = `${REDIS_KEY.ORDER_GET_BY_ID}:${order_id}:${req?.userData?.user_type}:${req?.language}`
            let redisData = await redis.get(keyname)
            if (redisData) {
                let extractdata = JSON.parse(redisData)
                // if (extractdata && extractdata?.data) {
                //   res.locals.statusCode = 200;
                //   res.locals.success = true;
                //   res.locals.message = "Fetch data from redis";
                //   res.locals.data = extractdata?.data;
                //   next();
                //   return
                // }
            }
            console.log('usertype111', req?.userData?.user_type);

            let get = await OrderModel.findOne({ where: { order_id: order_id }, raw: true, attributes: { exclude: ['additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] }, })
            //console.log('get.retailer_product_arr>>>>>>>>>>>>>>>>>',get.retailer_product_arr);
            let vatPercentage = 0;
            if (get && Object.keys(get).length > 0) {
                if (req?.userData?.user_type == 'retailer' || req?.userData?.user_type == 'employee') {
                    console.log('if retaile########');
                    get.product_arr = get?.retailer_product_arr?.map((product) => {
                        product.amount = product.amount - product.vat_total;
                        product.price_per_unit = Math.trunc((Number(product?.db_price_obj?.offer_price) + Number(product?.db_price_obj?.commission)) * 100) / 100;

                        product.db_product_obj.brand_id = req.language == "ar" && product?.db_product_obj?.brand_id_ar ? product?.db_product_obj?.brand_id_ar : product?.db_product_obj?.brand_id
                        product.db_product_obj.title = req.language == "ar" && product?.db_product_obj?.title_ar ? product?.db_product_obj?.title_ar : product?.db_product_obj?.title

                        if (product.db_product_obj.vat && product.db_product_obj.vat != 'zero_rates_vat') {
                            vatPercentage = product?.db_product_obj?.vat;
                        } else if (product.db_product_obj.vat && product.db_product_obj.vat == 'zero_rates_vat') {
                            vatPercentage = 0;
                        }
                        //console.log('vatPercentageretailer>>>>>>>>>>>>>>>>>',vatPercentage);
                        return product;
                    })

                    get.sub_total = Number(get.retailer_sub_sub_total) + Number(get.retailer_commission);
                    get.sub_total = Math.trunc(Number(get.sub_total) * 100) / 100;
                    get.vat_total_price = get.retailer_vat;
                    get.discount = 0 // get.retailer_vat;
                    get.discount_value = '0%';//--------------------------------------------------------------------------
                    get.total_amount = get.retailer_sub_total;
                    get.foc_vat = get?.foc_retailer_vat
                    // discount
                    // original_value_obj
                    get.original_value_obj = {
                        sub_total: Math.trunc((Number(get.retailer_sub_sub_total) + Number(get.retailer_commission)) * 100) / 100,
                        subtotal_without_flash: Number(get.retailer_sub_sub_total) + Number(get.retailer_commission),
                        vat_total_price: get.retailer_vat,
                        vat_fee: get.retailer_vat,
                        vat_fee_without_flash: get.retailer_vat,
                        discount: 0,
                        discount_value: '0%',
                        discount_without_flash: '0%',
                        total: get.retailer_sub_total,
                        foc_vat: get?.foc_retailer_vat,
                        total_without_flash: get.retailer_sub_total,
                    }

                    if (get?.retailer_discount_obj?.amountAfterDiscount && get?.retailer_discount_obj?.retailer_vat_after_discount) {

                        get.sub_total = Number(get?.retailer_discount_obj?.retailer_sub_sub_total_after_discount);
                        get.vat_total_price = get?.retailer_discount_obj?.retailer_vat_after_discount;
                        get.discount = get?.retailer_discount_obj?.share
                        get.discount_value = get?.retailer_discount_obj?.couponObj?.value
                        let percentage = Math.trunc((Number(get?.retailer_discount_obj?.couponObj?.value) * 100) / Number(get?.retailer_discount_obj?.retailer_sub_sub_total_after_discount))

                        get.discount_value = `${percentage} %`
                        get.total_amount = get?.retailer_discount_obj?.retailer_sub_total_after_discount;
                        // get.foc_vat = get?.foc_retailer_vat
                    }

                    // console.log(get, 'gggggggggggggggggggggggggggg')
                    // get.total_amount = Number(get.retailer_sub_sub_total) + Number(get.retailer_commission);
                } else if (req?.userData?.user_type == 'vendor') {
                    // console.log('if vendor########');
                    get.product_arr = get.product_arr.map((product) => {
                        product.amount = product.amount - product.vat_total;
                        product.price_per_unit = Number(product?.db_price_obj?.offer_price);

                        product.db_product_obj.brand_id = req.language == "ar" && product?.db_product_obj?.brand_id_ar ? product?.db_product_obj?.brand_id_ar : product?.db_product_obj?.brand_id
                        product.db_product_obj.title = req.language == "ar" && product?.db_product_obj?.title_ar ? product?.db_product_obj?.title_ar : product?.db_product_obj?.title

                        if (product.db_product_obj.vat && product.db_product_obj.vat != 'zero_rates_vat') {
                            vatPercentage = product?.db_product_obj?.vat;
                        } else if (product.db_product_obj.vat && product.db_product_obj.vat == 'zero_rates_vat') {
                            vatPercentage = 0;
                        }
                        //console.log('vatPercentagevendor>>>>>>>>>>>>>>>>>',vatPercentage);
                        return product;
                    })
                    get.total_amount = Number(get.sub_total);
                    get.sub_total = Number(get.vendor_sub_sub_total);;
                    get.vat_total_price = get.vendor_vat;
                    get.foc_vat = get?.foc_vendor_vat
                    // here we dsicuss 
                    get.discount = 0 // get.retailer_vat;
                    get.discount_value = '0%';//-----------


                }

                if (get.vat_total_price > 0) {
                    get.vat_percentage = 5;
                } else {
                    get.vat_percentage = 0;
                }
                console.log('get.vat_percentage>>>>>>>>>>>>>>>>>', get.vat_percentage);

                if (get && get?.status == 'accept') {
                    get.status = "AcceptedByFE";
                } else if (get?.payment_method == 'cash_on_delivery' && req?.userData?.is_guest_user == true) {
                    get.status = "Delivered";

                }
                /************************************guest_user */
                if (get && get?.user_id?.length > 5) {
                    let user_get = await User?.findOne({ where: { uuid: get?.user_id }, raw: true, attributes: ['user_type', 'email', 'uuid'] })
                    // console.log(user_get,'user_getuser_getuser_get')
                    if (user_get && user_get?.user_type == USERS.GUEST_USER) {
                        get.is_guest_user = true
                    } else {
                        get.is_guest_user = false
                    }
                    // get.userObj=user_get
                }

                get.user_type = req?.userData?.user_type
                //get.total_amount = get.sub_total
                get.brank_name = get?.card_data?.[0]?.brank_name || ""
                get.branch = get?.card_data?.[0]?.branch || ""
                get.iban_number = get?.card_data?.[0]?.iban_number || ""

                //collection amount
                let total_amount_round_up = roundToNearestQuarter(get.total_amount)
                get.total_amount_round_up = total_amount_round_up

                // break payment check , is received 
                let findPendingOrder = await Order_pending_amount_model.findOne({
                    where: { order_id: order_id },
                    order: [['id', 'DESC']], // Change 'createdAt' to your timestamp column
                    raw: true,
                });

                let temp_obj = {}
                if (!findPendingOrder) {
                    temp_obj.order_id = order_id,
                        temp_obj.total_amount_round_up = total_amount_round_up,
                        temp_obj.receive_amount = 0,
                        temp_obj.pending_amount = total_amount_round_up
                } else {
                    temp_obj = findPendingOrder
                }
                get.pending_amount_remain_obj = temp_obj
            }
            // in case of credit pending order amount wil  be calculated 

            // console.log('last>>>>#>>>!>>>>>$>>>>>&>>>', get);
            //return res.status(200).json({ message: "Fetch data", statusCode: 200, success: true, data: get })

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Fetch data";
            res.locals.data = get;
            next();
            /*******************redis set data */
            let redisobj = { data: get }
            await redis.set(keyname, JSON.stringify(redisobj), 'EX', environmentVars.REDISTTL)
            return;
        } catch (err) {
            console.log(err, "eor get order y id ")
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async get_by_order_id_new(req, res, next) {
        try {
            let order_id = req.query.order_id
            console.log('orderIdgett:', order_id)
            if (!order_id || order_id == "undefined") {
                // return res.status(400).json({ message: "Order not found", statusCode: 400, success: false })

                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }
            let order_ids = order_id.split("_");
            console.log('usertype', req.userData.user_type);

            let order_list = await OrderModel.findAll({ where: { order_id: { [Op.in]: order_ids } }, raw: true, attributes: { exclude: ['vendor_details', 'additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] }, })
            let get = order_list[0];
            get.product_arr = [];
            get.retailer_product_arr = [];
            if (order_list && order_list.length > 0) {
                for (const ele of order_list) {
                    if (req.userData.user_type == 'retailer') {
                        get.product_arr.push(...ele.retailer_product_arr.map((product) => {
                            product.amount = product.amount - product.vat_total;
                            product.price_per_unit = Number(product?.db_price_obj?.offer_price) + Number(product?.db_price_obj?.commission);
                            return product;
                        }))
                        get.sub_total += Number(ele.retailer_sub_sub_total) + Number(ele.retailer_commission);
                        get.vat_total_price += ele.retailer_vat;
                        get.total_amount += ele.retailer_sub_total;
                    } else if (req.userData.user_type == 'vendor') {
                        get.product_arr.push(...ele.product_arr.map((product) => {
                            product.amount = product.amount - product.vat_total;
                            product.price_per_unit = Number(product?.db_price_obj?.offer_price);
                            return product;
                        }))
                        get.total_amount += Number(ele.sub_total);
                        get.sub_total += Number(ele.vendor_sub_sub_total);;
                        get.vat_total_price += ele.vendor_vat;

                    }
                    get.vat_percentage = 5

                    //get.total_amount = get.sub_total
                    get.brank_name = ele?.card_data?.[0]?.brank_name || null
                    get.branch = ele?.card_data?.[0]?.branch || null
                    get.iban_number = ele?.card_data?.[0]?.iban_number || null
                }
            }

            // console.log('last>>>>>>>>', get);
            //return res.status(200).json({ message: "Fetch data", statusCode: 200, success: true, data: get });
            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Fetch data";
            next();
            return;
        } catch (err) {
            console.log(err, "eor get order y id ")
            // return res.status(500).json({ message: err?.message, statusCode: 500, success: false })

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }


    async generate_invoce_pdf_file_by_order_id(req, res, next) {
        try {
            let order_id = req.query.order_id;
            //let fromDate = req.query.from_date;
            //let toDate = req.query.to_date;
            const userType = req.userData.user_type;
            console.log('loginusertype>>>>>>>>>');
            //console.log(req.userData);

            let get = await OrderModel.findOne({
                where: { order_id: order_id },
                raw: true,
                attributes: { exclude: ['additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] },
            })

            if (userType == 'vendor' && get.vendor_details.uuid == req.userData.uuid) {
                await generateOrderPdfForVendor(req, res, next, order_id, get);
            } else if (userType == 'retailer' && get.user_id == req.userData.uuid) {
                await generateOrderPdfForRetailer(req, res, next, order_id, get);
            } else {
                //return res.status(400).json({ message: "User is unauthorised", statusCode: 400, success: false })
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "User is unauthorised";
                next();
                return;
            }

        } catch (err) {
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async generate_invoce_pdf_file_by_from_to_date(req, res, next) {
        try {
            let fromDate = req.query.from_date;
            let toDate = req.query.to_date;
            let userType = req.userData.user_type;
            //console.log('loginusertype>>>>>>>>>',userType,req.userData.uuid);

            //fetch date by fromdate to date
            if (userType == 'vendor') {
                var salesData = await OrderModel.findAll({
                    where: {
                        'vendor_details.uuid': req.userData.uuid,
                        order_date: {
                            [Op.between]: [fromDate, toDate]  // Add date range condition
                        }
                    },
                    raw: true,
                    attributes: { exclude: ['additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] },
                })
            } else if (userType == 'retailer') {
                var salesData = await OrderModel.findAll({
                    where: {
                        user_id: req.userData.uuid,
                        order_date: {
                            [Op.between]: [fromDate, toDate]  // Add date range condition
                        }
                    },
                    raw: true,
                    attributes: { exclude: ['additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] },
                })
            }

            //console.log(salesData);

            // Group data by day
            const salesReport = salesData.reduce((acc, curr) => {
                const date = curr.order_date.toISOString().split('T')[0]; // Extract the date part

                if (!acc[date]) {
                    acc[date] = { totalSales: 0, orders: 0 }; // Initialize if the date is not already in the report
                }

                acc[date].totalSales += curr.sub_total; // Add the sub_total to the total sales for the date
                acc[date].orders += 1; // Increment the order count for the date

                return acc;
            }, {});

            console.log('Sales Report by Day:', salesReport);
            if (salesReport) {
                await generateOrderPdfByDate(req, res, next, salesReport);
            }

            //return res.status(200).json({ message: "PDF generated successfully", statusCode: 200, success: true})

        } catch (err) {
            //return res.status(500).json({ message: err?.message, statusCode: 500, success: false })

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async generate_html_invoice_pdf(req, res, next) {
        try {

            console.log('invvvvvvvvvvvvvvvvvvvvvvvvvvooooooooooooo');

            // Sample sales data
            const salesData = {
                "2024-10-01": { totalSales: 5000, orders: 45 },
                "2024-10-02": { totalSales: 6000, orders: 50 },
                // add more data
            };

            await generateOrderGRNreportAfterSuccessPayment(res, salesData); //for test
            //-------for pdf test--------------------

            //return res.status(200).json({ message: "PDF generated successfully", statusCode: 200, success: true})

        } catch (err) {
            //return res.status(500).json({ message: err?.message, statusCode: 500, success: false })

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    //not useing
    async payment_status_and_generate_invoice_by_retailer(req, res, next) {
        try {

            let userEmail = req.userData.email;
            let { order_id, payment_status, payment_method, txn_id, payment_id } = req.query;
            //const timestamp = new Date().toISOString(); // Format timestamp as ISO string

            let orderData = await OrderModel.findOne({
                where: { order_id: order_id },
                raw: true,
            });
            if (!orderData) {
                // return res.status(400).json({
                //   message: "Order not found",
                //   statusCode: 400,
                //   success: false,
                // });

                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }

            let retailerUser = await getUserDataById(orderData?.user_id);
            // console.log("retailerEmaillllll:", retailerUser?.email);

            //advance pay method senarios
            if ((payment_method == 'advance_pay' || payment_method == 'Advance Pay') && payment_status == 'success') {

                await OrderModel.update({ payment_status: "complete" }, { where: { order_id: order_id } });
                await this.savePaymentStatus(payment_id);

                await orderReceivedAndSendEmailToVendor(orderData, orderData?.order_id);// order received email send to vendor + send pdf
                await orderDetailsSendEmailToRetailer(retailerUser, orderData, orderData?.order_id);//send order invoice to retailer

                const orderDate = orderData?.order_date.toISOString().split('T')[0];

                let notiObj = {
                    notification_type: 'order-placed',
                    uuId: String(orderData?.uuid),
                    orderId: String(orderData?.order_id),
                    orderDate: String(orderDate),
                    subTotal: String(orderData?.retailer_sub_sub_total),
                    vat_fee: String(orderData?.retailer_vat),
                    discount: String(orderData?.retailer_discount),
                    total: String(orderData?.retailer_sub_total)
                }
                let payload = {
                    notification: {
                        title: 'Your order is successfully placed',
                        body: `Order ID is ${orderData?.order_id}`,
                    },
                    data: notiObj
                }
                let notiJson = JSON.stringify(payload);
                console.log('retailerrrrrr>>>>>', req.userData.deviceToken);
                sendNotification(req.userData.deviceToken, payload)
                let idr = uuidv4();
                idr = idr.replace(/-/g, "");
                NotificationDataModel.create({ uuid: idr, receiverId: req.userData.uuid, subject: notiObj.notification_type, body: notiJson })


                let keyname2 = `notificationList:1:10:${req.userData.uuid}`
                await redis.del(keyname2)
                let notiObjForVendor = {
                    notification_type: 'order-received',
                    uuId: String(orderData?.uuid),
                    orderId: String(orderData?.order_id),
                    orderDate: String(orderDate),
                    warehouseAddress: String(orderData?.warehouse_address)
                }
                let payloadForVendor = {
                    notification: {
                        title: 'New order is placed by SupplyMatch',
                        body: `Order ID is ${orderData?.order_id}`,
                    },
                    data: notiObjForVendor
                }
                //console.log('vendortoken>>>>',v.vendor_details.deviceToken);
                let notiJsonVendor = JSON.stringify(payloadForVendor);
                console.log('vendorrr>>>>>>>', orderData?.vendor_details?.deviceToken);
                sendNotification(orderData?.vendor_details?.deviceToken, payloadForVendor)
                let idv = uuidv4();
                idv = idv.replace(/-/g, "");
                NotificationDataModel.create({ uuid: idv, receiverId: orderData.vendor_details.uuid, subject: notiObjForVendor.notification_type, body: notiJsonVendor })

                let keyname = `notificationList:1:10:${orderData.vendor_details.uuid}`
                await redis.del(keyname)
                //return res.status(200).json({ message: "Order invoice successfully generated and sent to the email", statusCode: 200, success: true })
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Order invoice successfully generated and sent to the email";
                next();
                return;
            } else if ((payment_method == 'advance_pay' || payment_method == 'Advance Pay') && payment_status == 'failed') {
                await OrderModel.update({ payment_status: "failed" }, { where: { order_id: order_id } });
                await this.savePaymentStatus(payment_id);
                await sendPaymentFailedEmailToRetailer(retailerUser?.email, orderData?.order_id) //if payment status is failed send email to retailer

                const orderDate = orderData?.order_date.toISOString().split('T')[0];
                let notiObj = {
                    notification_type: 'payment-failed',
                    uuId: String(orderData?.uuid),
                    orderId: String(orderData?.order_id),
                    orderDate: String(orderDate),
                    subTotal: String(orderData?.retailer_sub_sub_total),
                    vat_fee: String(orderData?.retailer_vat),
                    discount: String(orderData?.retailer_discount),
                    total: String(orderData?.retailer_sub_total)
                }

                let payload = {
                    notification: {
                        title: 'Order payment failed',
                        body: `Payment failed for Order No- ${orderData?.order_id} `,
                    },
                    data: notiObj
                }
                let notiJson = JSON.stringify(payload);
                sendNotification(retailerUser?.deviceToken, payload)
                let idr = uuidv4();
                idr = idr.replace(/-/g, "");
                await NotificationDataModel.create({ uuid: idr, receiverId: retailerUser?.uuid, subject: notiObj.notification_type, body: notiJson })
                //return res.status(200).json({ message: "Order payment failed", statusCode: 200, success: true })

                let keyname = `notificationList:1:10:${retailerUser?.uuid}`
                await redis.del(keyname)
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Order payment failed";
                next();
                return;
            }

        } catch (err) {
            //return res.status(500).json({ message: err?.message, statusCode: 500, success: false })

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async payment_status_and_generate_invoice_by_retailer_new(req, res, next) {
        try {

            let userEmail = req.userData.email;
            let { order_id, payment_status, payment_method, txn_id, payment_id } = req.query;

            if (!order_id || order_id == 'undefined' || order_id == undefined || order_id == null) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }
            //const timestamp = new Date().toISOString(); // Format timestamp as ISO string
            console.log(req.query, ">>>>>>>>>>>>>>>>>>&&&&&&&&&&&&&&Req.queryyyyy");
            order_id = order_id?.split(",");
            console.log(order_id, 'order_idorder_idorder_id')
            // return
            let orderData = await OrderModel.findAll({
                where: { order_id: { [Op.in]: order_id } },
                raw: true,
            });
            // console.log(orderData,"orderDAta")
            // return
            if (!orderData || orderData.length == 0) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }
            let retailerUser = await getUserDataById(orderData[0]?.user_id);
            console.log("orderData:", retailerUser?.email);
            let message;
            let statusCode = 200
            for (const order of orderData) {
                // console.log("order", order)
                //advance pay method senarios
                if ((payment_method == 'advance_pay' || payment_method == 'Advance Pay') && payment_status == 'success') {
                    let obj = {
                        payment_status: "complete",
                        status: order?.status == "requested" ? "orderaccepted" : "new"
                    }
                    if (order?.vendor_details.auto_accept_order == 1) {
                        obj.status = 'orderaccepted'
                    }
                    console.log(obj, "objjjjjjjjjjjjjjjjjjjjjjjj")
                    await OrderModel.update(obj, { where: { order_id: order.order_id } });

                    await this.savePaymentStatus(payment_id);
                    await this.updateWarehouseQuantity(order.order_id);
                    // break
                    // return
                    console.log('SSS>>>>>>>', order.order_id);
                    // if (order?.status === "requested")
                    await this.notifyLogistic(order.order_id)

                    //console.log('SSSSSS>>>>>>>', order);
                    await orderReceivedAndSendEmailToVendor(order, order?.order_id);// order received email send to vendor + send pdf without comission price
                    await orderDetailsSendEmailToRetailer(retailerUser, order, order?.order_id);//send order invoice to retailer

                    //-----send notifiction through cron scheduler----------
                    //Run scheduleOrderCheckAfterThreeMinutes
                    // scheduleOrderCheckAfterThreeMinutes_notifyToEmployees(order?.order_id); // run Scheduler

                    //Run scheduleOrderCheckAfterEightMinutes
                    // scheduleOrderCheckAfterEightMinutes_notifyToAdmin(order?.order_id); // run Scheduler

                    //Run scheduleOrderCheckAfterOneMinutes
                    // scheduleOrderEveryOneMinutes_notifyToVendor(order?.order_id); //run Scheduler

                    //For notification
                    let ProdImage;
                    let ProdName = [];
                    let BrandName = [];
                    for (let el of order?.product_arr) {
                        //console.log('productImagee>>>>',el.db_product_obj.product_images);
                        //console.log('varientImageeee>>>>>',el.db_variant_obj.images);
                        ProdImage = el.db_product_obj.product_images[0] || '';
                        ProdName.push(el.db_variant_obj.title);
                        BrandName.push(el.db_product_obj.brand_id);
                    }

                    const orderDate = order?.order_date.toISOString().split('T')[0];

                    let notiObj = {
                        notification_type: 'order-placed',
                        uuId: String(order?.uuid),
                        orderId: String(order?.order_id),
                        orderDate: String(orderDate),
                        subTotal: String(order?.retailer_sub_sub_total),
                        vat_fee: String(order?.retailer_vat),
                        discount: String(order?.retailer_discount),
                        total: String(order?.retailer_sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }
                    let payload = {
                        notification: {
                            title: 'Your order is successfully placed',
                            body: `Order ID is ${order?.order_id}`,
                        },
                        data: notiObj
                    }
                    //console.log('retailerrrrrr>>>>>', req.userData.deviceToken);
                    let notiJson = JSON.stringify(payload);

                    const notificationCount = await NotificationDataModel.count({
                        where: { receiverId: req.userData.uuid, status: 0 },
                    });
                    await sendNotification(req.userData.deviceToken, payload, notificationCount)
                    let idr = uuidv4();
                    idr = idr.replace(/-/g, "");
                    await NotificationDataModel.create({ uuid: idr, receiverId: req.userData.uuid, subject: notiObj.notification_type, body: notiJson })

                    try {
                        const keys = await redis.keys(`${REDIS_KEY.NOTIFICATION}*`);
                        if (keys && keys?.length) {
                            await redis.del(...keys);
                        }
                    } catch (er) {
                        console.log(er, 'eriin cache redis')
                    }

                    let notiObjForVendor = {
                        notification_type: 'order-received',
                        uuId: String(order?.uuid),
                        orderId: String(order?.order_id),
                        orderDate: String(orderDate),
                        warehouseAddress: String(order?.warehouse_address),
                        total: String(order?.sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }
                    let payloadForVendor = {
                        notification: {
                            title: 'New order is placed by SupplyMatch',
                            body: `Order ID is ${order?.order_id}`,
                        },
                        data: notiObjForVendor
                    }
                    //console.log('vendortoken>>>>',v.vendor_details.deviceToken);
                    let notiJsonVendor = JSON.stringify(payloadForVendor);
                    //console.log('vendorrr>>>>>>>', order?.vendor_details?.deviceToken);
                    const notificationCount2 = await NotificationDataModel.count({
                        where: { receiverId: order.vendor_details.uuid, status: 0 },
                    });
                    await sendNotification(order?.vendor_details?.deviceToken, payloadForVendor, notificationCount2)
                    let idv = uuidv4();
                    idv = idv.replace(/-/g, "");
                    await NotificationDataModel.create({ uuid: idv, receiverId: order.vendor_details.uuid, subject: notiObjForVendor.notification_type, body: notiJsonVendor })
                    try {

                        let keyname2 = `notificationList:1:10:${order.vendor_details.uuid}`
                        await redis.del(keyname2)
                    } catch (error) {
                        console.log(error, 'erropayment statsurerror  ')
                    }
                    message = "Order invoice successfully generated and sent to the email";
                    statusCode = 200;
                    /**------------------------------------Order Count----------------------------- */
                    let super_admin_data = await UserModel.findAll({
                        where: {
                            user_type: 'super_admin',
                            account_status: 'activated', // account_status should be 'activated'
                            is_deleted: 0
                        },
                        raw: true,
                        attributes: ["uuid"],
                    });

                    let io = req.app.get("io");
                    let admin_ids = await super_admin_data?.map((a) => a.uuid);
                    if (admin_ids && admin_ids.length > 0) {
                        admin_ids.forEach((admin_id) => {
                            let message = `New order received: ${order.order_id}`
                            const socketId = io?.userSocketMap?.get(admin_id);
                            console.log("new-order socketId", socketId)
                            io.to(socketId).emit('new-order', {
                                message,
                                type: "order",
                                data: {
                                    order_id: order.order_id,
                                    image: String(ProdImage),
                                    product_name: String(ProdName),
                                    brand_name: String(BrandName),
                                    order_status: order.status,
                                    payment_status: order.payment_status,
                                    delivery_date: order.delivery_date,
                                    retailer_sub_total: order.retailer_sub_total,
                                    sub_total: order.sub_total,
                                    retailer_details: { id: req.userData?.uuid, name: req.userData?.name },
                                    vendor_details: { id: order.vendor_details?.uuid, name: order.vendor_details?.name }
                                }
                            }); //.to(admin_ids)
                        });
                    }


                    await this.sendSocketEvent(io, order?.order_id);

                    /**-------------------------------socket io-------------------------------------- */
                } else if ((payment_method == 'advance_pay' || payment_method == 'Advance Pay') && payment_status == 'failed') {
                    //console.log('FFFFFFFFFFFFFFFFFFFFFFFFFFFF>>>>>>>>>>>>>', order);
                    await OrderModel.update({ payment_status: "failed" }, { where: { order_id: order.order_id } });
                    await this.savePaymentStatus(payment_id);
                    await sendPaymentFailedEmailToRetailer(retailerUser, order?.order_id) //if payment status is failed send email to retailer


                    let ProdImage;
                    let ProdName = [];
                    let BrandName = [];
                    for (let el of order?.product_arr) {
                        //console.log('productImagee>>>>',el.db_product_obj.product_images);
                        //console.log('varientImageeee>>>>>',el.db_variant_obj.images);
                        ProdImage = el.db_product_obj.product_images[0] || '';
                        ProdName.push(el.db_variant_obj.title);
                        BrandName.push(el.db_product_obj.brand_id);
                    }
                    //const prodNameString = ProdName.join(', ');
                    //console.log('prodNameString',prodNameString);
                    //const brandNameString = BrandName.join(', ');
                    //console.log('brandNameString',brandNameString);

                    const orderDate = order?.order_date.toISOString().split('T')[0];
                    let notiObj = {
                        notification_type: 'payment-failed',
                        uuId: String(order?.uuid),
                        orderId: String(order?.order_id),
                        orderDate: String(orderDate),
                        subTotal: String(order?.retailer_sub_sub_total),
                        vat_fee: String(order?.retailer_vat),
                        discount: String(order?.retailer_discount),
                        total: String(order?.retailer_sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }

                    let payload = {
                        notification: {
                            title: 'Order payment failed',
                            body: `Payment failed for Order No- ${order?.order_id} `,
                        },
                        data: notiObj
                    }
                    let notiJson = JSON.stringify(payload);
                    const notificationCount = await NotificationDataModel.count({
                        where: { receiverId: retailerUser?.uuid, status: 0 },
                    });
                    if (retailerUser?.deviceToken) {

                        await sendNotification(retailerUser?.deviceToken, payload, notificationCount)
                    }
                    let idr = uuidv4();
                    idr = idr.replace(/-/g, "");
                    await NotificationDataModel.create({ uuid: idr, receiverId: retailerUser?.uuid, subject: notiObj.notification_type, body: notiJson })

                    message = "Order payment failed";
                    statusCode = 200;
                    try {
                        const keys = await redis.keys(`${REDIS_KEY.NOTIFICATION}*`);
                        if (keys && keys?.length) {
                            await redis.del(...keys);
                        }
                    } catch (er) {
                        console.log(er, 'eriin cache redis')
                    }
                    //return res.status(400).json({ message: "Order payment failed", statusCode: 400, success: false })
                }
            }

            res.status(statusCode).json({ message, statusCode, success: true })
            try {
                const keyPatterns = [`${REDIS_KEY.REQUEST}*`, `${REDIS_KEY.ORDER}*`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }
            return


        } catch (err) {
            console.log(err, "eor orr oro ror oor payemnt status and generate invoie  ")
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }


    async orderAcceptByVendor(req, res, next) {
        try {
            let { order_id, status, warehouse_id } = req.body;
            let usertype = req.userData.user_type;
            console.log('usertypeee: ', usertype, "req.body.", req.body)

            const timestamp = new Date().toISOString(); // Format timestamp as ISO string
            // const genPin = Math.floor(100000 + Math.random() * 900000);
            const genPin = 500000;
            let orderData = await OrderModel.findOne({
                where: { order_id: order_id },
                raw: true,
            });
            if (!orderData) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }

            let retailerUser = await getUserDataById(orderData?.user_id);
            const orderDate = orderData?.order_date.toISOString().split('T')[0];
            const existing_statuses = orderData.order_status_arr || [];

            let ProdImage;
            let ProdName = [];
            let BrandName = [];
            let variant_obj_recover = []

            for (let el of orderData?.product_arr) {
                ProdImage = el.db_product_obj.product_images[0] || '';
                ProdName.push(el.db_variant_obj.title);
                BrandName.push(el.db_product_obj.brand_id);
                let temp = {
                    uuid: el.db_variant_obj?.uuid,
                    warehouse_id: el.db_warehouse_obj.id,
                    quantity: el.quantity
                }
                variant_obj_recover.push(temp)
            }
            // ************** */

            // Add the new status object
            const new_status = {
                status,
                date: timestamp
            };
            let statusMessage = "";
            existing_statuses.push(new_status);
            if (orderData && status == 'orderaccepted') {
                console.log('inside order accepted>>>>>>>>>>>>>>', retailerUser?.email);

                if (warehouse_id) {
                    let warehouseObj = await WarehouseModel?.findOne({ where: { uuid: warehouse_id }, raw: true })
                    if (!warehouseObj) {
                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = "Warehouse not found";
                        next();
                        return;
                    }
                    await OrderModel.update(
                        {
                            status,
                            pin: genPin,
                            order_accepted_by_vendor: timestamp,
                            warehouse_id: warehouseObj?.uuid,
                            pick_up_latitude: warehouseObj?.latitude,
                            pick_up_longitude: warehouseObj?.longitude,
                            warehouse_po_box: warehouseObj?.po_box,
                            warehouse_address: warehouseObj?.address,
                            existing_statuses
                        },
                        { where: { order_id: order_id } }
                    );
                } else {
                    await OrderModel.update(
                        { status, pin: genPin, order_accepted_by_vendor: timestamp, existing_statuses },
                        { where: { order_id: order_id } }
                    );
                }

                console.log('pin updated on db>>>>>>>>>>>>>>', genPin);

                await sendorderReadyForDeliveryToRetailer(retailerUser, orderData);

                let notiObj = {
                    notification_type: 'order-accepted',
                    uuId: String(orderData?.uuid),
                    orderId: String(orderData?.order_id),
                    orderDate: String(orderDate),
                    subTotal: String(orderData?.retailer_sub_sub_total),
                    vat_fee: String(orderData?.retailer_vat),
                    discount: String(orderData?.retailer_discount),
                    total: String(orderData?.retailer_sub_total),
                    image: String(ProdImage),
                    product_name: String(ProdName),
                    brand_name: String(BrandName),
                }
                let payload = {
                    notification: {
                        title: 'Order is accepted by Supplier',
                        body: `Order No- ${orderData.order_id} is accepted by Supplier,It will be delivered soon`,
                    },
                    data: notiObj
                }
                let notiJson = JSON.stringify(payload);
                if (retailerUser?.deviceToken) {
                    const notificationCount = await NotificationDataModel.count({
                        where: { receiverId: retailerUser?.uuid, status: 0 },
                    });
                    sendNotification(retailerUser?.deviceToken, payload, notificationCount)
                    let idr = uuidv4();
                    idr = idr.replace(/-/g, "");
                    await NotificationDataModel.create({ uuid: idr, receiverId: retailerUser?.uuid, subject: notiObj.notification_type, body: notiJson })

                }

                //send notification and whatsapp msg to assigned employee
                const usersData = await User.findAll({
                    where: {
                        [Op.or]: [
                            { uuid: retailerUser?.assign_to, user_type: USERS.EMPLOYEE, is_deleted: 0 },
                            { role: USERS.SUPERVISOR, is_deleted: 0 }
                        ]
                    },
                    raw: true,
                    attributes: ['uuid', 'id', 'name', 'name_ar', 'user_type', 'email', 'phone', 'deviceToken', 'role']
                });

                // console.log(usersData, "usersData--usersData--usersData")

                if (usersData) {
                    await sendNotificationToLogistic(orderData, usersData);
                }
                //send notification and whatsapp msg to logistic

                //For Socket Event
                let io = req.app.get("io");
                io.to("get-new-orders-logistic").emit('get-new-orders', { message: 'New Orders list!', data: orderData });
                //For Socket Event

                // return res.status(200).json({
                //   message: "Order status updated successfully",
                //   statusCode: 200,
                //   success: true,
                // });
                statusMessage = 'Order is accepted by Supplier';

                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Order status updated successfully";
                next();

            } else if (orderData && status == 'cancelled') {
                if (usertype == 'vendor' && ["new", "processing", "orderaccepted"].includes(orderData?.status)) {
                    const chkRes = await OrderModel.update(
                        { status, existing_statuses },
                        { where: { order_id: order_id } }
                    );
                    await sendOrderCancelledEmail(retailerUser, order_id);
                    //---------------
                    let notiObj = {
                        notification_type: 'order-cancelled',
                        uuId: String(orderData?.uuid),
                        orderId: String(orderData?.order_id),
                        orderDate: String(orderDate),
                        subTotal: String(orderData?.retailer_sub_sub_total),
                        vat_fee: String(orderData?.retailer_vat),
                        discount: String(orderData?.retailer_discount),
                        total: String(orderData?.retailer_sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }
                    let payload = {
                        notification: {
                            title: 'Supplier Order Cancellation Notification',
                            body: `Order No- ${orderData.order_id} is cancelled by Supplier.`,
                        },
                        data: notiObj
                    }
                    statusMessage = 'Order is cancelled by Supplier';
                    let notiJson = JSON.stringify(payload);
                    if (retailerUser?.deviceToken) {
                        const notificationCount = await NotificationDataModel.count({
                            where: { receiverId: retailerUser?.uuid, status: 0 },
                        });
                        sendNotification(retailerUser?.deviceToken, payload, notificationCount)
                        let idr = uuidv4();
                        idr = idr.replace(/-/g, "");
                        await NotificationDataModel.create({ uuid: idr, receiverId: retailerUser?.uuid, subject: notiObj.notification_type, body: notiJson })



                    }
                    //---------------
                    /* res.status(200).json({
            
                    //------send whatsapp notification to all purchase emplyee----------
                    const AllEmployeePurchase = await User.findAll({
                      where: { 
                        user_type: 'employee', 
                        role: 'purchase', 
                        is_deleted: 0 
                      },
                      raw: true,
                      attributes: ['uuid', 'id', 'name', 'name_ar', 'user_type', 'role', 'email', 'phone', 'deviceToken']
                    });
            
                    let employeePhoneArr = [];
                    if (AllEmployeePurchase) {
                      for(let emp of AllEmployeePurchase){
                        employeePhoneArr.push(emp.phone);
                      }
                      await vendorCanceledOrderOrderSendNotification(orderData, employeePhoneArr);
                    }
                    //------send whatsapp notification to all purchase emplyee----------
            
                    res.status(200).json({
                      message: 'Order cancelled successfully',
                      statusCode: 200,
                      success: true,
                      order_id: order_id
                    }); */

                    res.locals.statusCode = 200;
                    res.locals.success = true;
                    res.locals.message = 'Order cancelled successfully';
                    res.locals.order_id = order_id;
                    next();
                    /*****************whenvendor ccancel orderthan quantity will be added to warehouse as much order has */
                    let fetchid = variant_obj_recover?.map((a) => a?.uuid)
                    let vartiantDbfetch = await ProductVariantModel?.findAll({ where: { uuid: fetchid }, raw: true, attributes: ['id', 'uuid', 'warehouse_arr', 'does_variant_same', 'product_id'] })
                    let finddoesVariantsame = vartiantDbfetch?.filter((a) => a?.does_variant_same == 1)
                    let nondoesVariantsame = vartiantDbfetch?.filter((a) => a?.does_variant_same == 0)

                    for (let le of variant_obj_recover) {
                        let find = nondoesVariantsame?.find((a) => a?.uuid == le.uuid)
                        if (find) {
                            let tem_w = find?.warehouse_arr
                            tem_w?.forEach((v) => {
                                if (v?.id == le.warehouse_id) {
                                    v.quantity = Number(v.quantity) + Number(le.quantity)
                                    if (Number(v.quantity) < 0) {
                                        v.quantity = 0
                                    }
                                }
                            })
                            // console.log(tem_w, 'tempppppppppppppp',find)
                            if (find && find?.does_variant_same == 0) {
                                await ProductVariantModel?.update({ warehouse_arr: tem_w }, { where: { uuid: find?.uuid } })
                            }
                        }
                    }
                    finddoesVariantsame?.forEach((a) => {
                        let t = variant_obj_recover?.filter((k) => k?.uuid == a?.uuid)
                        if (t && t.length) {
                            let temp_sum = t?.reduce((a, b) => Number(a) + Number(b?.quantity), 0)
                            a.quantity = temp_sum
                        }
                    })
                    if (finddoesVariantsame && finddoesVariantsame?.length > 0) {
                        let ids = finddoesVariantsame?.map((A) => A?.product_id)

                        let fetchdoesvariantsame = await ProductVariantModel?.findAll({
                            where: {
                                does_variant_same: 1,
                                product_id: { [Op.in]: ids }, // Matches product_id in the array
                                status: 'active',
                                status_by_super_admin: 1,
                                approve_by_super_admin: 1
                            },
                            raw: true, attributes: ['product_id', 'uuid', 'does_variant_same', 'warehouse_arr']
                        })

                        let stockdeductarr = {}
                        for (let el of finddoesVariantsame) {
                            if (stockdeductarr[el.product_id]) {
                                stockdeductarr[el.product_id] = Number(stockdeductarr[el.product_id]) + Number(el?.quantity)
                            } else {
                                stockdeductarr[el.product_id] = Number(el.quantity)
                            }
                        }
                        for (let el of fetchdoesvariantsame) {
                            let warehouseArr = el.warehouse_arr;
                            let find1 = finddoesVariantsame?.find((a) => a?.product_id == el.product_id)
                            if (find1 && stockdeductarr[el.product_id]) {
                                let tempware = warehouseArr?.map((ab) => {

                                    if (ab.id == orderData?.warehouse_id) {
                                        ab.quantity = Number(ab.quantity) + stockdeductarr[el.product_id];
                                        if (Number(ab.quantity) < 1) {
                                            ab.quantity = 0
                                        }
                                    }
                                    return ab
                                });
                                await ProductVariantModel?.update(
                                    { warehouse_arr: tempware },
                                    { where: { uuid: el?.uuid } }
                                );
                            }
                        }
                    }

                    //***********************************************************add arehouse quantity as much order has*********************** */
                } else if (usertype == 'retailer' && orderData?.status == 'new') {
                    const chkRes = await OrderModel.update(
                        { status, existing_statuses },
                        { where: { order_id: order_id } }
                    );
                    await sendOrderCancelledByRetailerEmail(orderData, order_id); //retailer cancel his order before accept

                    let notiObj = {
                        notification_type: 'order-cancelled',
                        uuId: String(orderData?.uuid),
                        orderId: String(orderData?.order_id),
                        orderDate: String(orderDate),
                        subTotal: String(orderData?.retailer_sub_sub_total),
                        vat_fee: String(orderData?.retailer_vat),
                        discount: String(orderData?.retailer_discount),
                        total: String(orderData?.retailer_sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }

                    let payload = {
                        notification: {
                            title: 'Order Canceled by Retailer',
                            body: `Order No- ${orderData?.order_id} is Canceled by Retailer.`,
                        },
                        data: notiObj
                    }

                    statusMessage = 'Order is cancelled by Retailer';
                    let notiJson = JSON.stringify(payload);
                    if (orderData?.vendor_details?.deviceToken) {
                        const notificationCount = await NotificationDataModel.count({
                            where: { receiverId: orderData.vendor_details.uuid, status: 0 },
                        });
                        sendNotification(orderData?.vendor_details?.deviceToken, payload, notificationCount)
                        let idv = uuidv4();
                        idv = idv.replace(/-/g, "");
                        await NotificationDataModel.create({ uuid: idv, receiverId: orderData.vendor_details.uuid, subject: notiObj.notification_type, body: notiJson })

                    }
                    /* res.status(200).json({
                      message: 'Order Canceled successfully',
                      statusCode: 200,
                      success: true,
                      order_id: order_id
                    }); */

                    res.locals.statusCode = 200;
                    res.locals.success = true;
                    res.locals.message = "Fetch data";
                    res.locals.order_id = order_id
                    next();
                } else {

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = 'Can not cancel this Order!!';
                    next();
                }
            }

            /**-------------------------------socket io-------------------------------------- */
            let super_admin_data = await UserModel.findAll({
                where: {
                    user_type: 'super_admin',
                    account_status: 'activated', // account_status should be 'activated'
                    is_deleted: 0
                },
                raw: true,
                attributes: ["uuid"],
            });
            let admin_ids = await super_admin_data?.map((a) => a.uuid);

            let io = req.app.get("io");
            if (admin_ids && admin_ids.length > 0) {
                admin_ids.forEach((admin_id) => {
                    let message = `order: ${order_id} is now ${status}`
                    const socketId = io?.userSocketMap?.get(admin_id);
                    if (socketId) io.to(socketId).emit('order-status-update', {
                        message,
                        type: "order",
                        data: {
                            order_id: orderData.order_id,
                            image: String(ProdImage),
                            product_name: String(ProdName),
                            brand_name: String(BrandName),
                            order_status: orderData.status,
                            payment_status: orderData.payment_status,
                            delivery_date: orderData.delivery_date,
                            retailer_sub_total: orderData.retailer_sub_total,
                            sub_total: orderData.sub_total,
                            retailer_details: { id: retailerUser?.uuid, name: retailerUser?.name },
                            vendor_details: { id: orderData.vendor_details?.uuid, name: orderData.vendor_details?.name }
                        }
                    }); //.to(admin_ids)
                });
            }
            const retailerSocketId = io?.userSocketMap?.get(retailerUser?.uuid);
            const vendorSocketId = io?.userSocketMap?.get(orderData.vendor_details?.uuid);
            if (retailerSocketId) io.to(retailerSocketId).emit('order-status-update', { message: statusMessage, type: "order", data: { orderId: String(orderData?.order_id), status } });
            if (vendorSocketId) io.to(vendorSocketId).emit('order-status-update', { message: statusMessage, type: "order", data: { orderId: String(orderData?.order_id), status } });
            /**-------------------------------socket io-------------------------------------- */
            /**-------------------------------socket io-------------------------------------- */

            /**redis  */
            // try {
            //   const keys = await redis.keys(`${REDIS_KEY.NOTIFICATION}:1:10:${orderData.vendor_details.uuid}*`);
            //   if (keys && keys?.length) {
            //     await redis.del(...keys);
            //   }
            // } catch (er) {
            //   console.log(er, 'eriin cache redis')
            // }
            try {
                const keyPatterns = [`${REDIS_KEY.NOTIFICATION}*`, `${REDIS_KEY.REQUEST}*`, `${REDIS_KEY.ORDER}*`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }
            return
        } catch (err) {
            console.log(err, "error in order accepting....");
            //return res.status(500).json({ message: err?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async uploadSignedGRN(req, res, next) {
        try {
            let { order_id, pin, grn_image } = req.body;
            if (!grn_image) {
                return res.status(400).json({ message: "GRN image is required", statusCode: 400, success: false })
            }

            let findData = await OrderModel.findOne({
                where: { order_id: order_id },
                raw: true,
            });
            if (!findData) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }

            if (findData && findData.pin != pin) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Incorrect PIN number";
                next();
                return;
            }

            let retailerUser;
            if (findData?.user_id) {
                retailerUser = await User.findOne({
                    where: { uuid: findData?.user_id },
                    raw: true,
                    attributes: ['uuid', 'id', 'user_type', 'email', 'deviceToken']
                });
            }

            let temp_arr = []
            let grn_image_db = grn_image;
            if (grn_image && grn_image.uri) {
                const nameOf = Date.now() + grn_image.name;
                const photoKey = `${req.userData.uuid}/grn_image/${nameOf}`;
                let obj = { uri: grn_image.uri, fileName: photoKey, type: grn_image.type }
                temp_arr.push(obj)
                grn_image_db = `https://${bucketName}.s3.${region}.amazonaws.com/${photoKey}`
            }
            //console.log(temp_arr, "temp_arrtemp_arrtemp_arrtemp_arrtemp_arr",)
            for (let el of temp_arr) {
                await uploadBase64ImageToS3(el?.uri, el?.fileName, el?.type)
            }

            //console.log('grnimageeeee:',grn_image_db);
            await OrderModel.update(
                { grn_image: grn_image_db, status: 'completed' },
                { where: { order_id: order_id, pin: pin } }
            );

            await sendOrderCompletedEmail(req.userData.email, retailerUser.email, findData);

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = 'GRN uploaded successfully';
            res.locals.order_id = order_id
            next();
            try {
                const keys = await redis.keys(`${REDIS_KEY.ORDER}*`);
                if (keys && keys?.length) {
                    await redis.del(...keys);
                }
            } catch (er) {
                console.log(er, 'eriin cache redis')
            }
            return
        } catch (err) {
            console.log(err, "error occure during grn image upload");
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async raiseComplainOnOrder(req, res, next) {
        try {
            let { order_id, issue } = req.body;
            let usertype = req.userData.user_type;
            let findData = await OrderModel.findOne({
                where: { order_id: order_id, user_id: req.userData.uuid },
                raw: true,
            });
            if (!findData) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }

            if (findData && usertype == "retailer") {
                if (findData?.vendor_details) {
                    const timestamp = Date.now();
                    let id =
                        timestamp + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
                    let obj = {
                        uuid: id,
                        order_id: order_id,
                        retailer_id: req.userData.uuid,
                        issue: issue
                    }
                    let createComplain = await orderComplain.create(obj)
                    let payload = {
                        notification: {
                            title: 'Complain from retailer',
                            body: `There is complain For Order No- ${order_id}.Message from retailer is - ${issue}`,
                        }
                    }
                    res.locals.statusCode = 200;
                    res.locals.success = true;
                    res.locals.message = "Order complain created successfully";
                    next();
                    await sendNotification(findData?.vendor_details.deviceToken, payload, 1);
                    return

                }
            }

        } catch (err) {
            console.log(err, "error occure during order processing....");
            //return res.status(500).json({ message: err?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async initiatePayment(order_id, amount, billing_address) {
        console.log("initiatePayent", order_id, amount, billing_address);
        try {
            let ccav = await new nodeCCAvenue.Configure({
                "working_key": process.env?.WORKING_KEY,
                "access_code": process.env?.ACCESS_CODE,
                "merchant_id": process.env?.MERCHANT_ID
            });
            //if (Array.isArray(order_id)) orderz_id = order_id.join("_");
            console.log("order_id", order_id);
            const timestamp = Date.now();
            let uuid = timestamp + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
            let payment_data = {
                uuid,
                order_id,
                amount,
                currency: "AED",
                payment_status: "Pending"
            }
            let payment_result = await PaymentModel.create(payment_data);
            let payment_id = payment_result.id;
            var orderParams = {
                "redirect_url": encodeURIComponent(`${process.env?.REDIRECT_URL}?payment_id=${payment_id}&order_id=${order_id}`),
                "cancel_url": encodeURIComponent(`${process.env?.CANCEL_URL}?payment_id=${payment_id}&order_id=${order_id}`),
                //"billing_name": billing_name,
                "currency": "AED",
                "order_id": payment_id,
                "amount": amount,
                "language": "en",
                ...billing_address
            };
            console.log(orderParams, 'orderParamsorderParamsorderParams')
            const encryptedOrderData = await ccav.getEncryptedOrder(orderParams);
            console.log(encryptedOrderData, 'encryptedOrderDataencryptedOrderData')
            return ({
                payLink: `${process.env.CCAvenue_URL}?command=initiateTransaction&access_code=${process.env?.ACCESS_CODE}&encRequest=${encryptedOrderData}`,
            });
        } catch (err) {
            console.log(err, "error occure during order processing....");
            return ({ payLink: null });
        }
    }

    async paymentResponse(req, res, next) {
        console.log("paymentResponse")
        try {
            var encryption = req.body.encResp;
            if (!encryption) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Invalid Request";
                next();
                return;
            }

            const ccav = new nodeCCAvenue.Configure({
                "working_key": process.env?.WORKING_KEY,
                "access_code": process.env?.ACCESS_CODE,
                "merchant_id": process.env?.MERCHANT_ID
            });

            var ccavResponse = ccav.redirectResponseToJson(encryption);
            console.log("ccavResponse", ccavResponse);
            if (ccavResponse && Object.keys(ccavResponse).length > 0) {
                let payment_details = await PaymentModel.findOne({ where: { id: ccavResponse["order_id"] } })
                let payment_response = {
                    reference_no: ccavResponse["reference_no"],
                    payment_status: ccavResponse["order_status"] == "Shipped" ? "Success" : ccavResponse["order_status"],
                    failure_message: ccavResponse["error_desc"],
                    response: ccavResponse
                }

                let result = await PaymentModel.update(payment_response, { where: { id: ccavResponse["order_id"] } });
                let order_data = {
                    payment_status: ccavResponse["order_status"] == "Shipped" ? "Success" : ccavResponse["order_status"],
                    card_details: ccavResponse["card_name"],
                    //card_data,
                    txn_id: ccavResponse["tracking_id"],
                    payment_id: result.id
                }
                await OrderModel.update(order_data, { where: { order_id: { [Op.in]: payment_details.order_id } } });
                let emailData = {
                    order_ids: order_ids?.join(","),
                    date: Date.now(),
                    receipt_no: result.id,
                    payer_name: ccavResponse["billing_name"],
                    email: ccavResponse["billing_email"],
                    payment_mode: ccavResponse["payment_mode"],
                    tracking_id: ccavResponse["tracking_id"],
                    currency: ccavResponse["currency"],
                    amount: ccavResponse["Amount"],
                    paid_amount: ccavResponse["order_status"] == "Success" ? ccavResponse["Amount"] : 0,
                    status: ccavResponse["order_status"]
                }
                console.log("emailData", emailData);
                let email_result = await sendPaymentDetailsEmail(ccavResponse["billing_email"], emailData);
                res.locals.statusCode = 200;
                res.locals.success = true;
                res.locals.message = "Payment data updated successfully";
                next();
                try {
                    const keyPatterns = [`${REDIS_KEY.REQUEST}*`, `${REDIS_KEY.ORDER}*`];
                    for (const pattern of keyPatterns) {
                        const keys = await redis.keys(pattern);
                        if (keys?.length) {
                            await redis.del(...keys);
                        }
                    }
                } catch (error) {
                    console.error('Error while cl earing Re dis keys:', error);
                }

            } else {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Invalid Request";
                next();
                return;
            }
            return
        } catch (error) {
            console.log(error, "error occure during payment processing....");
            // return res.status(500).json({ message: error?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = error?.message;
            next();
            return;
        }
    }

    async initiatePaymentForSingleOrder(req, res, next) {
        try {
            let order_id = req.params.order_id;
            let findData = await OrderModel.findOne({
                where: { uuid: order_id, user_id: req.userData.uuid, payment_status: { [Op.not]: "complete" } },
                raw: true,
                attributes: ["id", "sub_total"]
            });
            if (!findData) {
                // return res.status(400).json({
                //   message: "Order not found",
                //   statusCode: 400,
                //   success: false,
                // });


                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }
            let ccav = await new nodeCCAvenue.Configure({
                "working_key": process.env?.WORKING_KEY,
                "access_code": process.env?.ACCESS_CODE,
                "merchant_id": process.env?.MERCHANT_ID
            });

            const orderParams = {
                "redirect_url": encodeURIComponent(`${process.env?.REDIRECT_URL}?access_code=${process.env?.ACCESS_CODE}&working_key=${process.env?.WORKING_KEY}`),
                "cancel_url": encodeURIComponent(`${process.env?.CANCEL_URL}?access_code=${process.env?.ACCESS_CODE}&working_key=${process.env?.WORKING_KEY}`),
                "billing_name": req.userData.name,
                "currency": "AED",
                "order_id": findData?.id,
                "amount": findData?.sub_total,
                "language": "en"
            };
            const encryptedOrderData = await ccav.getEncryptedOrder(orderParams);
            /* res.status(200).send({
              message: "Payment initiated successfully",
              statusCode: 200,
              success: true,
              payLink: `${process.env.CCAvenue_URL}?command=initiateTransaction&access_code=${process.env?.ACCESS_CODE}&encRequest=${encryptedOrderData}`
            }); */

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Payment initiated successfully";
            res.locals.payLink = `${process.env.CCAvenue_URL}?command=initiateTransaction&access_code=${process.env?.ACCESS_CODE}&encRequest=${encryptedOrderData}`;
            next();
            try {
                const keyPatterns = [`${REDIS_KEY.REQUEST}*`, `${REDIS_KEY.ORDER}*`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }

            return;

        } catch (error) {
            console.log(error, "error occure during payment processing....");
            // return res.status(500).json({ payLink: null, message: error?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = error?.message;
            next();
            return;
        }
    }

    async paymentSuccess(req, res, next) {
        try {
            let io = req.app.get("io")
            const retailerSocketId = io?.userSocketMap?.get("1732082724487e5a2ac489cc04de6831");
            io.to(retailerSocketId).emit('order-status-update', { message: "Status Updated", type: "order", data: { orderId: "OD1735644185", status: "outfordelivery" } });
            /* res.status(200).send({
              message: "Payment completed successfully",
              statusCode: 200,
              success: true,
            });; */

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Payment completed successfully";
            next();
            try {
                const keyPatterns = [`${REDIS_KEY.REQUEST}*`, `${REDIS_KEY.ORDER}*`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }

            return;
        } catch (error) {
            console.log(error, "error occure during payment processing....");
            //return res.status(500).json({ payLink: null, message: error?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = error?.message;
            res.locals.payLink = null;
            next();
            return;
        }
    }

    async paymentCancel(req, res, next) {
        try {
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = "Oops!, Payment cancelled!";
            next();
            return;
        } catch (error) {
            console.log(error, "error occure during payment processing....");
            //return res.status(500).json({ payLink: null, message: error?.message, success: false, statusCode: 500 });
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = error?.message;
            res.locals.payLink = null;
            next();
            return;
        }
    }

    async paymentStatus(req, res, next) {
        try {
            let order_id = req.params.order_id;
            let ccav = await new nodeCCAvenue.Configure({
                "working_key": process.env?.WORKING_KEY,
                "access_code": process.env?.ACCESS_CODE,
                "merchant_id": process.env?.MERCHANT_ID
            });
            let order_string = JSON.stringify({ order_no: order_id });
            const encryptedOrderData = await ccav.encrypt(order_string, process.env?.WORKING_KEY);
            console.log("encryptedOrderData", encryptedOrderData)
            //let encryptedOrderData = await this.encrypt(order_string, process.env?.WORKING_KEY);
            let orderStatusLink = `${process.env.CCAvenue_STATUS_URL}?command=orderStatusTracker&access_code=${process.env?.ACCESS_CODE}&enc_request=${encryptedOrderData}&request_type=JSON&version=1.1`
            await axios.post(orderStatusLink).then((response) => {
                if (response.data) {
                    let split_json_response = this.redirectResponseToJson(response.data, ccav);
                    let final_response = ccav.decrypt(split_json_response.enc_response);
                    final_response = JSON.parse(final_response)
                    // res.status(200).send({
                    //   message: "Payment status",
                    //   statusCode: 200,
                    //   success: true,
                    //   data: final_response
                    // });

                    res.locals.statusCode = 200;
                    res.locals.success = true;
                    res.locals.message = "Payment status";
                    res.locals.data = final_response;
                    next();
                    //return;
                } else {
                    // res.status(200).send({
                    //   message: "Payment status",
                    //   statusCode: 200,
                    //   success: true,
                    //   data: {}
                    // });

                    res.locals.statusCode = 200;
                    res.locals.success = true;
                    res.locals.message = "Payment status";
                    res.locals.data = {};
                    next();
                    // return;
                }
            }).catch((err) => {
                console.log("catch err", err)
            });

        } catch (error) {
            console.log(error, "error occure during payment processing....");
            //return res.status(500).json({ message: error?.message, success: false, statusCode: 500 });

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = error?.message;
            next();
            return;
        }
    }

    async savePaymentStatus(payment_id) {
        //console.log("savePaymentStatus", order_id)
        try {
            let ccav = await new nodeCCAvenue.Configure({
                "working_key": process.env?.WORKING_KEY,
                "access_code": process.env?.ACCESS_CODE,
                "merchant_id": process.env?.MERCHANT_ID
            });
            let order_string = JSON.stringify({ order_no: payment_id });
            const encryptedOrderData = await ccav.encrypt(order_string, process.env?.WORKING_KEY);
            //console.log("encryptedOrderData", encryptedOrderData)
            let orderStatusLink = `${process.env.CCAvenue_STATUS_URL}?command=orderStatusTracker&access_code=${process.env?.ACCESS_CODE}&enc_request=${encryptedOrderData}&request_type=JSON&version=1.1`
            await axios.post(orderStatusLink).then(async (response) => {
                //console.log("response.data", response.data)
                if (response.data) {
                    let split_json_response = this.redirectResponseToJson(response.data, ccav);
                    let final_response = ccav.decrypt(split_json_response.enc_response);
                    final_response = JSON.parse(final_response);
                    //console.log("final_response", final_response);
                    let payment_data = {
                        // uuid,
                        // order_id,
                        // amount: final_response?.order_amt,
                        // currency: final_response?.order_currncy,
                        reference_no: final_response?.reference_no,
                        payment_status: final_response?.order_status == "Shipped" ? "Success" : final_response?.order_status,
                        failure_message: final_response?.error_desc,
                        response: final_response
                    }
                    //   console.log(payment_data, 'payment_datapayment_data', payment_id, 'payment_idpayment_id')
                    await PaymentModel.update(payment_data, { where: { id: payment_id } });
                }
            }).catch((err) => {
                console.log("catch err", err)
            });

        } catch (error) {
            console.log(error, "error occure during payment processing....");
        }
    }

    redirectResponseToJson(ccavResponse) {
        if (ccavResponse) {
            const responseArray = ccavResponse.split('&');
            const stringify = JSON.stringify(responseArray);
            const removeQ = stringify.replace(/['"]+/g, '');
            const removeS = removeQ.replace(/[[\]]/g, '');
            return removeS.split(',').reduce((o, pair) => {
                pair = pair.split('=');
                return o[pair[0]] = pair[1], o;
            }, {});
        } else {
            this.throwError('CCAvenue encrypted response');
        }
    }

    async getInvoice(req, res, next) {
        try {
            let order_id = req.params?.order_id;
            // console.log(req.params,'req.paamnsnsns',req.userData)
            // return
            let order_details = await OrderModel.findOne({ where: { order_id: order_id }, raw: true, attributes: { exclude: ['additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] }, })
            let pdfBuffer;
            if (!order_details) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }
            if (order_details.status == 'cancelled') {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Pdf can not be generated for cancelled order";
                next();
                return;
            }
            // req.userData.employee_obj={}
            // req.userData.employee_obj.user_type = 'employee'
            // req.userData.user_type = 'retailer'
            if (req.userData?.employee_obj && req.userData?.employee_obj?.user_type == USERS.EMPLOYEE) {
                pdfBuffer = await generateInvoicePDF_emp(order_details, order_id);
                // return
            } else if (req.userData.user_type == 'vendor') {
                pdfBuffer = await generateInvoicePdfForVendor(order_details, order_id);
            }
            else {
                pdfBuffer = await generateInvoicePdfForRetailer(order_details, order_id);
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${order_id}_invoice.pdf`);
            res.end(pdfBuffer);

            /* res.status(200).send({
              message: "Invoice",
              statusCode: 200,
              success: true,
              data: pdfBuffer
            }); */


        } catch (err) {
            console.log(err?.message, "?.message,?.message,")
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async raiseTaxInvoice(req, res, next) {
        try {
            let order_id = req.params?.order_id;
            let order_details = await OrderModel.findOne({ where: { order_id: order_id }, raw: true, attributes: { exclude: ['vendor_details', 'additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] }, })
            let result;
            //if (req.userData.user_type == 'vendor' || req.userData.user_type == 'vendor_sub_user') {
            result = await generateTaxInvoicePdf(order_details, order_id);
            let update_result = await OrderModel.update({ tax_invoice_raise: 1 }, { where: { order_id: order_id } })

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Success";
            next();
            try {
                const keyPatterns = [`${REDIS_KEY.ORDER}*`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }

            return;

        } catch (err) {
            //return res.status(500).json({ message: err?.message, statusCode: 500, success: false })

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async retryPayment(req, res, next) {
        try {
            let { order_id, payment_method, payment_mode, bank_name, cheque_no, pay_date, doc_image } = req.body;
            console.log("req.body", req.body);
            order_id = order_id?.split(",");
            let orderArr = await OrderModel.findAll({
                where: { order_id: { [Op.in]: order_id }, payment_status: { [Op.not]: "complete" }, status: { [Op.in]: ["pending", "new", "requested"] } },
                attributes: [
                    "uuid",
                    "order_id",
                    "warehouse_id",
                    "vendor_details",
                    "product_arr",
                    "sub_total",
                    "payment_method",
                    "payment_mode",
                    "payment_status",
                    "status",
                    "country_code",
                    "outlet_id",
                    "order_date",
                    "retailer_sub_total",
                    "retailer_sub_sub_total",
                    "sub_total"
                ],
                raw: true,
            });
            //console.log("orderObj", orderObj);
            if (orderArr.length == 0) {
                // return res.status(400).json({
                //   message: "Order not found : ",
                //   statusCode: 400,
                //   success: false,
                // });

                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }
            let all_order_payment_total = 0;
            let all_order_uuids = [];
            let user_details = await UserDetailsModel.findOne({ where: { user_id: req?.userData?.uuid }, attributes: ["credit_amount"] });
            // let SM_credit = parseFloat(user_details?.credit_amount).toFixed(2);
            let SM_credit = Math.trunc(Number(user_details?.credit_amount) * 1000) / 1000;
            SM_credit = SM_credit?.toFixed(2)
            // console.log(SM_credit,'SM_creditSM_credit')
            // return
            for (const orderObj of orderArr) {
                let outletObj = await OutletModel.findOne({
                    where: { uuid: orderObj?.outlet_id },   //,user_id:req.userData.uuid
                    raw: true,
                });
                if (!outletObj) {
                    // return res.status(400).json({
                    //   message: "Outlet not found : ",
                    //   statusCode: 400,
                    //   success: false,
                    // });

                    // res.locals.statusCode = 400;
                    // res.locals.success = false;
                    // res.locals.message = "Outlet not found : ";
                    // next();
                    // return;
                }
                const keys = [];//product_id -----
                const variantKey = [];
                const warehouse_array = [];
                for (let product of orderObj?.product_arr) {
                    keys.push(product?.db_product_obj?.uuid);
                    variantKey.push(product?.db_variant_obj?.uuid);
                }
                let simplrProductArr = await ProductsModels.findAll({
                    where: { uuid: keys, status_by_super_admin: 1, status: "active", is_deleted: 0 },
                    raw: true,
                    attributes: [
                        "id",
                        "uuid",
                        "brand_id",
                        "description",
                        "summary",
                        "category_id",
                        "subcategory_id",
                        "subcategory_id_level3",
                        "subcategory_id_level4",
                        "condition",
                        "title",
                        "universal_standard_code",
                        "status",
                        "created_by",
                        "vat",
                        "product_images"
                    ],
                });
                let variantDbArr = await ProductVariantModel.findAll({
                    where: { uuid: variantKey, status: 'active', status_by_super_admin: 1 },
                    raw: true,
                });

                let tempVariantData = [...variantDbArr];
                // console.log(variantDbArr," variantDbArrvariantDb rr")
                // return
                tempVariantData = JSON.parse(JSON.stringify(tempVariantData));
                for (let el of variantDbArr) {
                    for (let le of el.warehouse_arr) {
                        warehouse_array.push(le?.id);
                    }
                }
                let findWArhouseDb = await WarehouseModel.findAll({
                    where: { uuid: warehouse_array },
                    raw: true,
                });

                let t = [];
                let flashSalesData = await FlashSalesModel.findAll({
                    where: {
                        variant_id: variantKey,
                        status: 1,
                        quantity: {
                            [Op.gt]: 0
                        },
                        end_date: {
                            [Op.gte]: new Date()
                        }
                    },
                    raw: true
                })
                // return
                let vatAndFee = 0;
                let discountFee = 0;

                for (let el of orderObj?.product_arr) {
                    el.product_id = el?.db_product_obj?.uuid
                    el.variant_id = el?.db_variant_obj?.uuid
                    el.quantity = el?.quantity
                    let inFlash = false
                    let findData = variantDbArr?.find((elem) => elem?.uuid == el?.variant_id);
                    if (!findData) {
                        return res
                            .status(400)
                            .json({ message: `This variant ${el.variant_id} is not exist` });
                    }
                    let findProduct = simplrProductArr?.find((a) => a?.uuid == el.product_id);
                    if (!findData.images || findData?.images?.length == 0) findData.images = findProduct?.product_images;

                    let foundFlash = flashSalesData.find((item) => (item.variant_id == el.variant_id && Number(item.quantity) >= Number(findData?.minimum_order_quantity)));
                    el.price = findData.price_details
                    el.price_details = findData.price_details
                    el.commission_type = findData.commission_type
                    el.commission_value = findData.commission_value
                    el.vat = findProduct?.vat
                    let variantNameFind = findData?.title3

                    if (findData?.mainVariant?.name) {
                        variantNameFind = findData?.mainVariant?.value
                    } if (findData?.variant1?.name) {
                        variantNameFind = variantNameFind + ": " + findData?.variant1?.value
                    } if (findData?.variant2?.name) {
                        variantNameFind = variantNameFind + ": " + findData?.variant2?.value
                    }
                    if (el?.quantity < findData?.minimum_order_quantity) {
                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = `Minimum order quantity is ${findData?.minimum_order_quantity} of this variant ${variantNameFind}`;
                        next();
                        return;
                    }
                    if (foundFlash && foundFlash.quantity != 0 && el?.quantity <= foundFlash.quantity) {  //&& foundFlash.quantity>=el?.quantity
                        console.log("flashdatahiii----->>>>>>")
                        let flashDbPrice = 0
                        if (foundFlash.aqad_price != null) {
                            flashDbPrice = foundFlash.aqad_price
                        } else {
                            flashDbPrice = foundFlash.offer_price
                        }
                        let flashObj = {
                            quantity: sequelize.literal(`quantity - ${el?.quantity}`),
                            sold_quantity: sequelize.literal(`sold_quantity + ${el?.quantity}`)
                        };
                        if (el?.quantity > foundFlash.quantity) {
                            /* return res.status(400).json({
                              // message: `In Flash sale only ${foundFlash.quantity} quantity available for this variant ${el?.variant_id}`,
                              message: `In Flash sale only ${foundFlash.quantity} quantity available for this variant ${variantNameFind}`,
                              statusCode: 400,
                              succcess: false,
                            }); */

                            res.locals.statusCode = 400;
                            res.locals.success = false;
                            res.locals.message = `In Flash sale only ${foundFlash.quantity} quantity available for this variant ${variantNameFind}`;
                            next();
                            return;
                        } else {
                            if (foundFlash.quantity == el?.quantity) flashObj.status = 0;
                            el.db_price = Number(flashDbPrice);
                        }
                        //let updateQuantity = await FlashSalesModel.update(flashObj, { where: { variant_id: el?.variant_id } });
                        inFlash = true
                    } else {
                        if (findData.discount_type == "fixed") {
                            let discountedPrice = Number(findData.price_details) - Number(findData.discount);
                            el.db_price = Number(discountedPrice);

                        } else if (findData.discount_type == "percentage") {
                            let discountedPrice = Number(findData.price_details) - (Number(findData.price_details) * Number(findData.discount) / 100);
                            el.db_price = discountedPrice;
                        } else {
                            el.db_price = Number(findData.price_details);
                        }
                    }
                    el.inFlash = inFlash;
                    let productData = simplrProductArr?.find(
                        (h) => h?.uuid == el.product_id
                    );
                    if (!productData) {
                        return res
                            .status(400)
                            .json({ message: `This product ${el.product_id} is not exist` });
                    }

                    let warhousefind = findData?.warehouse_arr;
                    el.db_variant_title = findData?.title;
                    // const foundRecord = flashSalesData.find((item) => item.variant_id == el.variant_id);
                    delete findData?.warehouse_arr;
                    delete findData?.created_at;
                    delete findData?.updated_at;
                    warhousefind = warhousefind?.sort((a, b) => b?.quantity - a.quantity);
                    let Ui_quantity = el.quantity;
                    let totalWwrehouseQuantity = warhousefind?.reduce(
                        (a, b) => Number(a) + Number(b?.quantity),
                        0
                    );
                    if (el.quantity > totalWwrehouseQuantity) {
                        // return res.status(400).json({
                        //   // message: `This variant ${el?.variant_id}, only have ${totalWwrehouseQuantity} quantity`,
                        //   message: `This variant ${variantNameFind}, only have ${totalWwrehouseQuantity} quantity`,
                        //   statusCode: 400,
                        //   succcess: false,
                        // });

                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = `This variant ${variantNameFind}, only have ${totalWwrehouseQuantity} quantity`;
                        next();
                        return;
                    }
                    // console.log(Ui_quantity, "Ui_quantity ", "el", "asda", warhousefind, "asdads", findData)
                    // return
                    if (Ui_quantity >= findData?.minimum_order_quantity && warhousefind?.length) {
                        if (Ui_quantity <= warhousefind[0]?.quantity) {
                            let elem = warhousefind[0];
                            let warehouseData = findWArhouseDb?.find((q) => q.uuid == elem?.id);
                            let obj = {
                                ui_data: { ...el, quantity: Ui_quantity },
                                db_warehouse_obj: { ...elem },
                                variant_db: findData,
                                findProductOBj: productData,
                            };
                            if (warehouseData) {
                                obj.db_warehouse_obj.pick_up_latitude = warehouseData?.latitude;
                                obj.db_warehouse_obj.pick_up_longitude = warehouseData?.longitude;
                                obj.db_warehouse_obj.warehouse_address = warehouseData?.address;
                                obj.db_warehouse_obj.warehouse_po_box = warehouseData?.po_box;
                                obj.db_warehouse_obj.warehouse_id = warehouseData?.uuid;
                            }
                            t = [...t, obj];
                        } else {
                            for (let elem of warhousefind) {
                                let uiDataCopy = JSON.parse(JSON.stringify(el));
                                let warehouse_dat = findWArhouseDb?.find(
                                    (q) => q.uuid == elem?.id
                                );
                                let obj = {
                                    ui_data: uiDataCopy,
                                    db_warehouse_obj: elem,
                                    variant_db: findData,
                                    findProductOBj: productData,
                                };
                                if (warehouse_dat) {
                                    obj.db_warehouse_obj.pick_up_latitude = warehouse_dat?.latitude;
                                    obj.db_warehouse_obj.pick_up_longitude = warehouse_dat?.longitude;
                                    obj.db_warehouse_obj.warehouse_address = warehouse_dat?.address;
                                    obj.db_warehouse_obj.warehouse_po_box = warehouse_dat?.po_box;
                                    obj.db_warehouse_obj.warehouse_id = warehouse_dat?.uuid;
                                }
                                if (Ui_quantity > elem?.quantity) {
                                    obj.ui_data.quantity = elem?.quantity;
                                    Ui_quantity = Ui_quantity - elem.quantity;
                                    t = [...t, obj];
                                } else if (
                                    Ui_quantity < elem?.quantity &&
                                    Ui_quantity >= findData?.minimum_order_quantity
                                ) {
                                    obj.ui_data.quantity = Ui_quantity;
                                    t = [...t, obj];
                                    Ui_quantity = elem.quantity - Ui_quantity;
                                } else if (
                                    Ui_quantity == elem?.quantity &&
                                    Ui_quantity >= findData?.minimum_order_quantity
                                ) {
                                    obj.ui_data.quantity = Ui_quantity;
                                    t = [...t, obj];
                                }
                            }
                        }
                    }
                }

                const conditions = t.map(ele => {
                    if (ele?.ui_data?.commission_type == null || ele?.ui_data?.commission_value == null) return ({
                        start_range: { [Op.lte]: ele?.ui_data?.db_price },
                        end_range: { [Op.gte]: ele?.ui_data?.db_price },
                        status: "active"
                    })
                }
                );

                const commissionData = await CommissionModel.findAll({
                    where: { [Op.or]: conditions },
                    attributes: ['id', 'uuid', 'rate', 'start_range', 'end_range', 'commission_type'],
                    raw: true
                });
                let subtotal = 0;
                let total = 0
                t = t?.map((ele) => {
                    let commission_type = ele.ui_data.commission_type;
                    let commission_value = ele.ui_data.commission_value;
                    if (commission_type == null && commission_value == null) {
                        let findCommissionObj = commissionData?.find((v) => Number(ele.ui_data.db_price) >= v.start_range && Number(ele.ui_data.db_price) <= v.end_range);

                        commission_type = findCommissionObj?.commission_type;
                        commission_value = Number(findCommissionObj.rate);
                    }
                    let commission_on_single_unit = 0;
                    let vat_on_commission = 0;
                    let vat_on_single_unit = 0;
                    if (commission_type == 'fixed') {
                        commission_on_single_unit = Number(commission_value);
                    } else if (commission_type == 'percentage') {
                        commission_on_single_unit = (Number(ele.ui_data.db_price) * Number(commission_value) / 100).toFixed(2);
                    }
                    if (Number(ele.ui_data.vat)) {
                        vat_on_commission = Number(commission_on_single_unit) * Number(ele.ui_data.vat) / 100;
                        vat_on_single_unit = (Number(ele.ui_data.db_price) * Number(ele.ui_data.vat) / 100).toFixed(2);
                    }
                    ele.ui_data.vat_on_single_unit = vat_on_single_unit;
                    ele.ui_data.commission_on_single_unit = commission_on_single_unit;
                    ele.ui_data.vat_on_commission = vat_on_commission;
                    ele.ui_data.db_price_after_commission = Number(ele.ui_data.db_price) + Number(commission_on_single_unit);
                    ele.ui_data.total_pricee_pay = Number(ele.ui_data.db_price_after_commission) + Number(vat_on_single_unit) + Number(vat_on_commission);
                    ele.ui_data.vendor_total_price_pay = Number(ele.ui_data.db_price) + Number(vat_on_single_unit);

                    subtotal = Number(subtotal) + (Number(ele.ui_data.db_price) + Number(commission_on_single_unit)) * Number(ele.ui_data.quantity);
                    total = Number(total) + Number(ele.ui_data.total_pricee_pay) * Number(ele.ui_data.quantity)
                    return ele;
                });
                let fetchVendorId = simplrProductArr?.map((el) => el.created_by);
                let vendorDbData = await User.findAll({
                    where: { uuid: fetchVendorId },
                    raw: true,
                    attributes: [
                        "id",
                        "uuid",
                        "user_type",
                        "name",
                        "email",
                        "phone",
                        "account_status",
                        'deviceToken'
                    ],
                });
                let vendorArr = [];
                let getAqadCommission = await CommissionModel.findOne({
                    where: { country_code: orderObj?.country_code },
                    raw: true,
                });
                for (let el of t) {
                    el.db_price_obj = {
                        price: el?.ui_data?.price,
                        offer_price: el?.ui_data?.db_price,
                        vat: el?.ui_data?.vat_on_single_unit,
                        commission: el?.ui_data?.commission_on_single_unit,
                        vat_on_commission: el?.ui_data?.vat_on_commission,
                    };
                    let findVendorObj = vendorArr?.find(
                        (s) => (s?.vendor_details?.uuid == el.findProductOBj?.created_by && s?.warehouse_id == el?.db_warehouse_obj?.id)
                    );

                    let getVednorObj = vendorDbData?.find(
                        (e) => e?.uuid == el.findProductOBj?.created_by
                    );
                    if (getVednorObj) {
                        getVednorObj.warehouse_obj = el.db_warehouse_obj;
                    }
                    delete el?.variant_db?.size_id;
                    delete el?.variant_db?.color_id;
                    delete el?.variant_db?.discountedPrice;
                    delete el?.variant_db?.compare_price_at;
                    delete el?.variant_db?.is_vat_inclusive;
                    delete el?.variant_db?.manufacture_price;
                    delete el?.variant_db?.status_by_super_admin;
                    delete el?.variant_db?.is_deleted;
                    delete el?.variant_db?.other_value;
                    delete el?.variant_db?.material_id;

                    if (!findVendorObj) {
                        let randomNumber = String(Date.now() + Math.floor(10000000 + Math.random() * 90000000 + Math.random() * 80000)).slice(0, -3); // Generates an 8-digit random number
                        let id = `OD` + randomNumber;

                        const deliveryDate = this.getDeliveryTime();
                        let pickupToDropDistance = await getDistance(
                            el?.db_warehouse_obj?.pick_up_latitude,
                            el?.db_warehouse_obj?.pick_up_longitude,
                            outletObj?.latitude,
                            outletObj?.longitude
                        );
                        // return
                        let status = "new";
                        if (orderObj?.status == "requested") {
                            status = payment_method == "advance_pay" ? "requested" : "orderaccepted";
                        } else {
                            status = payment_method == "advance_pay" ? "pending" : "new";
                        }
                        let obj = {
                            warehouse_address: el?.db_warehouse_obj?.warehouse_address,
                            warehouse_po_box: el?.db_warehouse_obj?.warehouse_po_box,
                            warehouse_id: el?.db_warehouse_obj?.warehouse_id,
                            outlet_address: outletObj?.address,
                            outlet_id: outletObj?.uuid,
                            pickupToDropDistance: pickupToDropDistance || "",
                            po_box: outletObj?.po_box,
                            drop_latitude: outletObj?.latitude,
                            drop_longitude: outletObj?.longitude,
                            vendor_details: getVednorObj,
                            delivery_date: deliveryDate,
                            shipping_date: deliveryDate,
                            out_for_delivery_date: deliveryDate,
                            vendor_id: el.findProductOBj?.created_by,
                            inFlash: el.inFlash,
                            payment_method,
                            status: status,
                            payment_status: "pending",
                            payment_mode
                        };
                        // console.log(el, "asdadadssdsddddddddddddddddd")
                        // console.log(el.ui_data,'el.ui_datadatatatat')
                        // console.log(Math.trunc(Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit)).toString(),'el11111111')
                        // console.log(Math.trunc(Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit)),'toString() remove')

                        // console.log(
                        // Math.trunc(Number(el?.ui_data?.quantity) * (Number(el?.ui_data?.vat_on_single_unit) + Number(el?.ui_data?.vat_on_commission))).toString(),"2222222222222222")
                        // console.log(
                        // Math.trunc(Number(el?.ui_data?.quantity) * (Number(el?.ui_data?.vat_on_single_unit) + Number(el?.ui_data?.vat_on_commission))),"2.toString()22222")
                        vendorArr.push({
                            ...obj,
                            product_arr: [
                                {
                                    db_product_obj: el.findProductOBj,
                                    db_variant_obj: el.variant_db,
                                    db_price_obj: el?.db_price_obj,
                                    db_warehouse_obj: el?.db_warehouse_obj,
                                    quantity: Number(el?.ui_data?.quantity),
                                    // amount: (Number(el?.ui_data?.vendor_total_price_pay) * Number(el.ui_data?.quantity)).toFixed(2),
                                    // vat_total: (Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit)).toFixed(2),
                                    // discount_total: el?.ui_data?.inFlash == false ? 0 : ((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)).toFixed(2),
                                    amount: (Math.trunc(Number(el?.ui_data?.vendor_total_price_pay) * Number(el.ui_data?.quantity) * 100) / 100).toString(),
                                    vat_total: (Math.trunc(Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit) * 100) / 100).toString(),
                                    discount_total: el?.ui_data?.inFlash == false
                                        ? "0"
                                        : (Math.trunc((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity) * 100) / 100).toString(),

                                    in_flash: el?.ui_data?.inFlash,
                                },
                            ],

                            retailer_product_arr: [
                                {
                                    db_product_obj: el.findProductOBj,
                                    db_variant_obj: el.variant_db,
                                    db_price_obj: el?.db_price_obj,
                                    db_warehouse_obj: el?.db_warehouse_obj,
                                    quantity: el?.ui_data?.quantity,
                                    // amount: (Number(el?.ui_data?.quantity) * Number(el?.ui_data?.total_pricee_pay)).toFixed(2),
                                    // vat_total: (Number(el?.ui_data?.quantity) * (Number(el?.ui_data?.vat_on_single_unit) + Number(el?.ui_data?.vat_on_commission))).toFixed(2),
                                    // discount_total: el?.ui_data?.inFlash == false ? 0 : ((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)).toFixed(2),
                                    // commission_total: ((Number(el?.ui_data?.commission_on_single_unit)) * Number(el?.ui_data?.quantity)).toFixed(2),
                                    amount: (Math.trunc(Number(el?.ui_data?.quantity) * Number(el?.ui_data?.total_pricee_pay) * 100) / 100).toString(),
                                    vat_total: (Math.trunc(Number(el?.ui_data?.quantity) *
                                        (Number(el?.ui_data?.vat_on_single_unit) + Number(el?.ui_data?.vat_on_commission)) * 100) / 100).toString(),
                                    discount_total: el?.ui_data?.inFlash == false
                                        ? "0"
                                        : (Math.trunc((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity) * 100) / 100).toString(),
                                    commission_total: (Math.trunc(Number(el?.ui_data?.commission_on_single_unit) * Number(el?.ui_data?.quantity) * 100) / 100).toString(),

                                    in_flash: el?.ui_data?.inFlash,
                                },
                            ],
                        });
                    } else {
                        //console.log("else findVendorObj?.vendor_details?.uuid",findVendorObj?.vendor_details?.uuid)
                        findVendorObj.product_arr.push({
                            db_product_obj: el.findProductOBj,
                            db_variant_obj: el.variant_db,
                            db_price_obj: el?.db_price_obj,
                            db_warehouse_obj: el?.db_warehouse_obj,
                            quantity: Number(el?.ui_data?.quantity),
                            // amount: (Number(el?.ui_data?.vendor_total_price_pay) * Number(el.ui_data?.quantity)).toFixed(2),
                            // vat_total: (Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit)).toFixed(2),
                            // discount_total: el?.ui_data?.inFlash == false ? 0 : ((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)).toFixed(2),
                            amount: (Math.trunc(Number(el?.ui_data?.vendor_total_price_pay) * Number(el?.ui_data?.quantity) * 100) / 100).toString(),
                            vat_total: (Math.trunc(Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit) * 100) / 100).toString(),
                            discount_total: el?.ui_data?.inFlash == false
                                ? "0"
                                : (Math.trunc((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity) * 100) / 100).toString(),

                            in_flash: el?.ui_data?.inFlash,
                        });

                        findVendorObj.retailer_product_arr.push({
                            db_product_obj: el.findProductOBj,
                            db_variant_obj: el.variant_db,
                            db_price_obj: el?.db_price_obj,
                            db_warehouse_obj: el?.db_warehouse_obj,
                            quantity: el?.ui_data?.quantity,
                            // amount: (Number(el?.ui_data?.quantity) * Number(el?.ui_data?.total_pricee_pay)).toFixed(2),
                            // vat_total: (Number(el?.ui_data?.quantity) * (Number(el?.ui_data?.vat_on_single_unit) + Number(el?.ui_data?.vat_on_commission))).toFixed(2),
                            // discount_total: el?.ui_data?.inFlash == false ? 0 : ((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)).toFixed(2),
                            // commission_total: ((Number(el?.ui_data?.commission_on_single_unit)) * Number(el?.ui_data?.quantity)).toFixed(2),
                            amount: (Math.trunc(Number(el?.ui_data?.quantity) * Number(el?.ui_data?.total_pricee_pay) * 100) / 100).toString(),
                            vat_total: (Math.trunc(Number(el?.ui_data?.quantity) * (Number(el?.ui_data?.vat_on_single_unit) + Number(el?.ui_data?.vat_on_commission)) * 100) / 100).toString(),
                            discount_total: el?.ui_data?.inFlash == false
                                ? "0"
                                : (Math.trunc((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity) * 100) / 100).toString(),
                            commission_total: (Math.trunc(Number(el?.ui_data?.commission_on_single_unit) * Number(el?.ui_data?.quantity) * 100) / 100).toString(),

                            in_flash: el?.ui_data?.inFlash,
                        });
                    }
                    //console.log(vendorArr, "ssssss")
                }

                const newVendorArr = groupByLocationNew(vendorArr);
                let payment_total = 0;
                // newVendorArr.forEach((order) => {
                //   order.additional_commission_rate_for_retailer = getAqadCommission?.rate;
                //   order.sub_total = 0;
                //   order.vendor_sub_sub_total = 0;
                //   order.vendor_vat = 0;
                //   order.retailer_sub_total = 0;
                //   order.retailer_sub_sub_total = 0;
                //   order.retailer_vat = 0;
                //   order.retailer_commission = 0;
                //   order.retailer_discount = 0;
                //   for (let product_ele of order.product_arr) {
                //     order.sub_total += Number(product_ele.amount);
                //     order.vendor_sub_sub_total += Number(product_ele.amount) - Number(product_ele.vat_total); //+ Number(product_ele.discount_total);
                //     order.vendor_vat += Number(product_ele.vat_total);
                //   }
                //   for (let retailer_product_ele of order.retailer_product_arr) {
                //     order.retailer_sub_total += Number(retailer_product_ele.amount);
                //     order.retailer_sub_sub_total += Number(retailer_product_ele.amount) - Number(retailer_product_ele.vat_total) - Number(retailer_product_ele.commission_total); //+ Number(retailer_product_ele.discount_total)
                //     order.retailer_vat += Number(retailer_product_ele.vat_total);
                //     order.retailer_commission += Number(retailer_product_ele.commission_total);
                //     order.retailer_discount += Number(retailer_product_ele.discount_total);
                //   }


                //   order.sub_total = Number(order.sub_total).toFixed(2);
                //   order.vendor_sub_sub_total = Number(order.vendor_sub_sub_total).toFixed(2);
                //   order.vendor_vat = Number(order.vendor_vat).toFixed(2);
                //   let approximation_value = this.customRound(order.retailer_sub_total);
                //   order.approximation_margin = Number(approximation_value - order.retailer_sub_total).toFixed(2);
                //   order.retailer_sub_total = approximation_value;
                //   order.retailer_sub_sub_total = Number(order.retailer_sub_sub_total).toFixed(2);
                //   order.retailer_vat = Number(order.retailer_vat).toFixed(2);
                //   order.retailer_commission = Number(order.retailer_commission).toFixed(2);
                //   order.retailer_discount = Number(order.retailer_discount).toFixed(2);

                //   vatAndFee = vatAndFee + Number(order.retailer_vat).toFixed(2);

                //   payment_total += approximation_value;
                // });
                newVendorArr.forEach((order) => {
                    order.additional_commission_rate_for_retailer = getAqadCommission?.rate;
                    order.sub_total = 0;
                    order.vendor_sub_sub_total = 0;
                    order.vendor_vat = 0;
                    order.retailer_sub_total = 0;
                    order.retailer_sub_sub_total = 0;
                    order.retailer_vat = 0;
                    order.retailer_commission = 0;
                    order.retailer_discount = 0;

                    for (let product_ele of order.product_arr) {
                        order.sub_total += Number(product_ele.amount);
                        order.vendor_sub_sub_total += Number(product_ele.amount) - Number(product_ele.vat_total);
                        order.vendor_vat += Number(product_ele.vat_total);
                    }

                    for (let retailer_product_ele of order.retailer_product_arr) {
                        order.retailer_sub_total += Number(retailer_product_ele.amount);
                        order.retailer_sub_sub_total += Number(retailer_product_ele.amount) - Number(retailer_product_ele.vat_total) - Number(retailer_product_ele.commission_total);
                        order.retailer_vat += Number(retailer_product_ele.vat_total);
                        order.retailer_commission += Number(retailer_product_ele.commission_total);
                        order.retailer_discount += Number(retailer_product_ele.discount_total);
                    }
                    // console.log(order,'orderrrrrrrrrrrrrrrrrrrrrrrrr')
                    // Apply Math.trunc() to remove decimal places without rounding and convert to string
                    // order.sub_total = Math.trunc(order.sub_total).toString();
                    // order.vendor_sub_sub_total = Math.trunc(order.vendor_sub_sub_total).toString();
                    // order.vendor_vat = Math.trunc(order.vendor_vat).toString();

                    // // let approximation_value = this.customRound(order.retailer_sub_total);
                    // let approximation_value = order.retailer_sub_total;
                    // order.approximation_margin = Math.trunc(approximation_value - order.retailer_sub_total).toString();
                    // order.retailer_sub_total = Math.trunc(approximation_value).toString();
                    // order.retailer_sub_sub_total = Math.trunc(order.retailer_sub_sub_total).toString();
                    // order.retailer_vat = Math.trunc(order.retailer_vat).toString();
                    // order.retailer_commission = Math.trunc(order.retailer_commission).toString();
                    // order.retailer_discount = Math.trunc(order.retailer_discount).toString();

                    // vatAndFee = Math.trunc(vatAndFee + Number(order.retailer_vat)).toString();
                    // payment_total += Math.trunc(approximation_value);

                    order.sub_total = (Math.trunc(order.sub_total * 100) / 100).toString();
                    order.vendor_sub_sub_total = (Math.trunc(order.vendor_sub_sub_total * 100) / 100).toString();
                    order.vendor_vat = (Math.trunc(order.vendor_vat * 100) / 100).toString();

                    // let approximation_value = this.customRound(order.retailer_sub_total);
                    let approximation_value = order.retailer_sub_total;
                    order.approximation_margin = (Math.trunc((approximation_value - order.retailer_sub_total) * 100) / 100).toString();
                    order.retailer_sub_total = (Math.trunc(approximation_value * 100) / 100).toString();
                    order.retailer_sub_sub_total = (Math.trunc(order.retailer_sub_sub_total * 100) / 100).toString();
                    order.retailer_vat = (Math.trunc(order.retailer_vat * 100) / 100).toString();
                    order.retailer_commission = (Math.trunc(order.retailer_commission * 100) / 100).toString();
                    order.retailer_discount = (Math.trunc(order.retailer_discount * 100) / 100).toString();

                    vatAndFee = (Math.trunc((vatAndFee + Number(order.retailer_vat)) * 100) / 100).toString();
                    payment_total += Math.trunc(approximation_value * 100) / 100;

                });

                // res.json({newVendorArr});
                // return

                /**-------------------------------Credit Amount Validation-------------------------------------------- */

                if (payment_method == "goods_on_credit" || payment_method == "goods on credit") {
                    if (!user_details?.credit_amount || Number(user_details.credit_amount) < Number(payment_total)) {
                        // res.status(400).json({
                        //   message: `Insufficient credit balance to place the order.`,
                        //   statusCode: 400,
                        //   succcess: false,
                        // });
                        // return;

                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = `Insufficient credit balance to place the order.`;
                        next();
                        return;
                    } else {
                        SM_credit = parseFloat(SM_credit - Number(payment_total)).toFixed(2);
                    }
                }
                /**-------------------------------Credit Amount Validation-------------------------------------------- */
                await OrderModel.update(newVendorArr[0], { where: { order_id: orderObj?.order_id } });
                let order_uuids = [order_id];


                if (payment_method != "advance_pay") {
                    this.updateWarehouseQuantity(order_id);
                }
                /**-------------------------------Credit Amount Calculation-------------------------------------------- */
                if (payment_method == "goods_on_credit" || payment_method == "goods on credit") {
                    const timestamp = Date.now();
                    let uuid = timestamp + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
                    await UserDetailsModel.update({ 'credit_amount': SM_credit }, { where: { user_id: req.userData.uuid } });
                    let transaction_data = {
                        uuid,
                        user_id: req?.userData?.uuid,
                        order_id: order_uuids,
                        amount: payment_total,
                        transaction_type: "Debit",
                    }
                    await UserCreditTransactionModel.create(transaction_data);
                    let doc_image_url;
                    if (doc_image && Object.keys(doc_image).length > 0) {
                        let image_name = `${Date.now()}_${doc_image?.name}`;
                        const docImagePhotoKey = `${req?.userData?.user_type}/${req?.userData?.uuid}/goods_credit_cheque/${image_name}`;
                        doc_image_url = `https://${bucketName}.s3.${region}.amazonaws.com/${docImagePhotoKey}`;
                        await uploadBase64ImageToS3(doc_image?.uri, doc_image?.name, doc_image?.type, 'user');
                    }

                    const timestamp2 = Date.now();
                    let cheque_uuid = timestamp2 + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
                    let credit_data = {
                        uuid: cheque_uuid,
                        user_id: req?.userData?.uuid,
                        order_id: order_uuids,
                        amount: payment_total,
                        bank_name,
                        cheque_no,
                        pay_date,
                        doc_image: doc_image_url,
                        status: "order_created",
                    }
                    await GoodsOnCreditModel.create(credit_data);
                }
                /**-------------------------------Credit Amount Calculation-------------------------------------------- */
                all_order_payment_total += Number(payment_total);
                all_order_uuids.push(orderObj?.order_id)
            }

            let payment_url = null;
            if (payment_method == "advance_pay") {
                let billing_address = {
                    "delivery_name": req.userData?.name,
                    "delivery_address": "Dubai",
                    "delivery_city": "Dubai",
                    "delivery_state": "Dubai",
                    "delivery_zip": "123456",
                    "delivery_country": "United Arab Emirates",
                    "delivery_tel": "971542112539"
                }
                payment_url = await this.initiatePayment(all_order_uuids, all_order_payment_total, billing_address);
            }

            /* res.status(200)
              .json({
                message: "Payment Initiated",
                statusCode: 200,
                success: true,
                payLink: payment_url?.payLink || null,
                order_ids: all_order_uuids,
                SM_credit
              }); */

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Payment Initiated";
            res.locals.payLink = payment_url?.payLink || null;
            res.locals.order_ids = all_order_uuids;
            res.locals.SM_credit = SM_credit;
            next();
            /**-------------------------------socket io-------------------------------------- */
            if (payment_method != "advance_pay") {
                let io = req.app.get("io");
                await this.sendSocketEvent(io, order_id);
            }
            /**-------------------------------socket io-------------------------------------- */
            /****************redis data  */
            try {
                const keyPatterns = [`${REDIS_KEY.REQUEST}*`, `${REDIS_KEY.ORDER}*`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }

            //For send notification start
            //console.log("orderArraa>>>>>>>>", orderArr);
            /*if (payment_method != "advance_pay") {
              let ProdImage;
              let ProdName = [];
              let BrandName = [];
              let orderuuId = '';
              let getOrderId = '';
              let retailerSubTotal = '';
              let orderDate = null;
              for (let odr of orderArr) {
                orderDate = odr?.order_date.toISOString().split('T')[0];
                orderuuId = odr?.uuid;
                getOrderId = odr?.order_id;
                retailerSubTotal = odr?.retailer_sub_total;
                for (let el of odr?.product_arr) {
                  //console.log('productImagee>>>>',el.db_product_obj.product_images);
                  //console.log('varientImageeee>>>>>',el.db_variant_obj.images);
                  ProdImage = el.db_product_obj.product_images[0] || '';
                  ProdName.push(el.db_variant_obj.title);
                  BrandName.push(el.db_product_obj.brand_id);
                }
              }
         
              let notiObj = {
                notification_type: 'payment-retry-success',
                uuId: String(orderuuId),
                orderId: String(getOrderId),
                orderDate: String(orderDate),
                total: String(retailerSubTotal),
                image: String(ProdImage),
                product_name: String(ProdName),
                brand_name: String(BrandName),
              }
              let payload = {
                notification: {
                  title: 'Payment has been successfully submitted',
                  body: `Order ID is ${getOrderId}`,
                },
                data: notiObj
              }
              let notiJson = JSON.stringify(payload);
              //console.log(req.userData,'retailertoken>>>>>>>>',req.userData.deviceToken);
              if (req?.userData && req?.userData?.deviceToken) {
                sendNotification(req.userData.deviceToken, payload)
                let idr = uuidv4();
                idr = idr.replace(/-/g, "");
                NotificationDataModel.create({ uuid: idr, receiverId: req.userData.uuid, subject: notiObj.notification_type, body: notiJson })
              }
            }*/
            //For send notification start

        } catch (err) {
            console.log(err, "error in retry payment api");
        }
    }

    async updateWarehouseQuantity(order_id) {
        try {
            let orderObj = await OrderModel.findOne({
                where: { order_id, payment_status: { [Op.in]: ["complete", "pending"] }, status: { [Op.in]: ["new", "orderaccepted"] } },
                attributes: [
                    "warehouse_id",
                    "product_arr",
                    "payment_method",
                    "payment_mode",
                    "payment_status",
                    "status",
                    "country_code",
                    "outlet_id",
                    "vendor_details"
                ],
                raw: true,
            });

            if (!orderObj) {
                console.log("Order not found update Warehouse quantity...... ");
                return;
            }

            const variantKey = [];
            let keys = []
            let order_details = []

            for (let product of orderObj?.product_arr) {
                variantKey.push(product?.db_variant_obj?.uuid);
                keys.push(product?.db_variant_obj?.product_id)
                order_details.push({ quantity: product?.quantity, product_id: product?.db_product_obj?.uuid })
            }

            let variantDbArr = await ProductVariantModel.findAll({
                where: { uuid: variantKey, status: 'active', status_by_super_admin: 1 },
                raw: true,
            });

            let fetchVarianWarehouseData = orderObj?.product_arr?.map((a) => ({
                uuid: a?.db_variant_obj?.uuid,
                warehouse_id: a?.db_warehouse_obj?.warehouse_id,
                quantity: a?.quantity,
                in_flash: a?.in_flash
            }))

            // console.log(fetchVarianWarehouseData, "fetchVarianWarehouseData222222")
            let warehouse_array = orderObj?.product_arr?.map((a) => a?.db_warehouse_obj?.warehouse_id)
            let findWArhouseDb = await WarehouseModel.findAll({
                where: { uuid: warehouse_array },
                raw: true,
            });

            let vendorId = orderObj?.vendor_details?.uuid;
            //console.log('vendorId>>>>>>>>>>>>>',vendorId);
            let p_linking = []

            let findVendor = await User.findOne({ where: { uuid: vendorId }, raw: true });
            let tempObjVariantSame = []
            for (let le of fetchVarianWarehouseData) {
                let findVariant = variantDbArr.find((a) => a?.uuid == le.uuid)
                // console.log(findVariant.uuid,'findVariantfindVariant')
                if (findVariant) {
                    findVariant?.warehouse_arr?.forEach((ab) => {
                        if (ab?.id == le.warehouse_id) {
                            ab.quantity = Number(ab.quantity) - Number(le.quantity);
                            if (Number(ab.quantity) < 1) {
                                ab.quantity = 0
                            }
                            let wareHouse = findWArhouseDb.find((b) => b?.uuid == le.warehouse_id)

                            //let findVendor = vendorData.find((a) => a?.uuid == ab.created_by)
                            if (ab.quantity == 0) {
                                let op = "Finished"
                                sendWarehouseQuantityEmail(findVariant, op, wareHouse, findVendor);
                            } else if (ab.quantity < Number(findVariant?.minimum_order_quantity)) {
                                let op = "Less";
                                sendWarehouseQuantityEmail(findVariant, op, wareHouse, findVendor);
                            }
                        }
                        // return;
                    });
                    //console.log("retry payment le?.in_flash", le?.in_flash)
                    //for flash sale quantity deduction
                    if (le?.in_flash == true) {
                        let flashObj = {
                            quantity: sequelize.literal(`quantity - ${le?.quantity}`),
                            sold_quantity: sequelize.literal(`sold_quantity + ${le?.quantity}`)
                        };
                        //console.log("retry payment flashObj", flashObj)
                        let updateQuantity = await FlashSalesModel.update(flashObj, { where: { variant_id: le?.uuid } });
                    }
                }
                if (findVariant && findVariant?.does_variant_same == 0) {
                    // console.log(le?.uuid, 'le?.uuidle?.uuidle?.uuid')
                    // console.log(findVariant?.warehouse_arr, 'findVariant?.warehouse_arr')

                    if (findVariant && findVariant?.add_variant == 1) {
                        p_linking.push(findVariant)

                    } else {
                        await ProductVariantModel?.update(
                            { warehouse_arr: findVariant?.warehouse_arr },
                            { where: { uuid: le?.uuid } }
                        )
                    }
                } else {
                    tempObjVariantSame.push({ ...le, product_id: findVariant?.product_id, does_variant_same: findVariant?.does_variant_same })
                }
                // return;
            }

            ///LINKING PRODUCT DEDUCT QUANTITY //////////////////////////////////////////////
            if (p_linking && p_linking?.length > 0) {
                let simplrProductArr = await ProductsModels.findAll({
                    where: { uuid: keys, status_by_super_admin: 1, status: "active", is_deleted: 0 },
                    raw: true,
                    attributes: [
                        "id",
                        "uuid",
                        "product_identical",
                        "is_primary",
                        "unit_value",
                    ],
                });

                // console.log(p_linking, 'p_linkingp_linkingp_linking')
                await deduct_quantity(p_linking, simplrProductArr, order_details)


            }
            ////////////////////////////////////////////////////////////

            let stockdeductarr = {}
            for (let el of tempObjVariantSame) {
                if (stockdeductarr[el.product_id]) {
                    stockdeductarr[el.product_id] = Number(stockdeductarr[el.product_id]) + Number(el?.quantity)
                } else {
                    stockdeductarr[el.product_id] = Number(el.quantity)
                }
            }

            let product_ids = tempObjVariantSame?.map((a) => a?.product_id)

            let fetchSameVariant = await ProductVariantModel.findAll({
                where: {
                    does_variant_same: 1,
                    product_id: { [Op.in]: product_ids }, // Matches product_id in the array
                    // uuid: { [Op.notIn]: not_includes_variantid }, // Excludes uuid in the array
                    status: 'active',
                    status_by_super_admin: 1,
                    approve_by_super_admin: 1
                },
                raw: true, attributes: ['uuid', 'product_id', 'warehouse_arr', 'does_variant_same', 'status', 'status_by_super_admin', 'approve_by_super_admin']
            });
            // console.log(fetchSameVariant,'fetchSameVfetchSameVariant')
            for (let el of fetchSameVariant) {
                let warehouseArr = el.warehouse_arr;
                let find1 = tempObjVariantSame?.find((a) => a?.product_id == el.product_id)
                if (find1 && stockdeductarr[el.product_id]) {
                    let tempware = warehouseArr?.map((ab) => {
                        if (ab?.id == find1.warehouse_id) {
                            ab.quantity = Number(ab.quantity) - stockdeductarr[el.product_id]
                        }
                        return ab
                    });
                    // console.log(tempware, 'tempwaretempware')
                    // console.log(el?.uuid, 'el?.uuidel')
                    await ProductVariantModel?.update(
                        { warehouse_arr: tempware },
                        { where: { uuid: el?.uuid } }
                    );
                }
            }
        } catch (error) {
            console.log(error, "erroupdatearehoueQuantiyror")
        }
    }

    async sendSocketEvent(io, order_id) {
        console.log(order_id, "sndScket[Event")
        // Counter for the 'new-order' event
        let newOrderEmitCount = 0;
        let order_details = await this.getOrderDetailsForSocket(order_id);
        let retailer_id = order_details?.data?.user_id;
        let vendor_id = order_details?.data?.vendor_details?.uuid;
        const vendorSocketId = io?.userSocketMap?.get(order_details?.data?.vendor_details?.uuid);
        io.to(vendorSocketId).emit('new-order', { message: "New Order Added", type: "order", data: order_details });
        // Increment the counter
        newOrderEmitCount++;
        console.log(`'new-order' emitted. Total count: ${newOrderEmitCount}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let order_query = {
            order_date: {
                [Op.gte]: today,
                [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            user_id: retailer_id
        };

        let vendor_order_query = {
            order_date: {
                [Op.gte]: today,
                [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            "vendor_details.uuid": vendor_id
        };

        let total_today_order = await OrderModel.count({
            where: order_query
        });
        try {
            let vendor_total_today_order = await OrderModel.count({
                where: vendor_order_query
            });

            io.to(vendorSocketId).emit('new-order-count', { message: "New Order Added", type: "order", data: { today_order_count: vendor_total_today_order } });
        } catch (error) {
            console.log(error, "errorroro in vendor_total_today_order")
        }
        const retailerSocketId = io?.userSocketMap?.get(retailer_id);
        io.to(retailerSocketId).emit('new-order-count', { message: "New Order Added", type: "order", data: { today_order_count: total_today_order } });

        let retailer_current_orders = await this.getRetailerCurrentOrderForSocket(order_id);
        let vendor_current_orders = await this.getVendorCurrentOrderForSocket(order_id);
        io.to(retailerSocketId).emit('current-order', { message: "Current Orders", type: "order", data: retailer_current_orders });
        io.to(vendorSocketId).emit('current-order', { message: "Current Orders", type: "order", data: vendor_current_orders });

        /**-------------------------------socket io-------------------------------------- */
    }

    async notifyLogistic(order_id) {
        let orderData = await OrderModel.findOne({
            where: { order_id: order_id },
            raw: true,
        });

        let retailerUser = await getUserDataById(orderData?.user_id);
        const orderDate = orderData?.order_date.toISOString().split('T')[0];
        const existing_statuses = orderData.order_status_arr || [];

        // await sendorderReadyForDeliveryToRetailer(retailerUser, orderData);

        let ProdImage;
        let ProdName = [];
        let BrandName = [];
        for (let el of orderData?.product_arr) {
            ProdImage = el.db_product_obj.product_images[0] || '';
            ProdName.push(el.db_variant_obj.title);
            BrandName.push(el.db_product_obj.brand_id);
        }

        let notiObj = {
            notification_type: 'order-accepted',
            uuId: String(orderData?.uuid),
            orderId: String(orderData?.order_id),
            orderDate: String(orderDate),
            subTotal: String(orderData?.retailer_sub_sub_total),
            vat_fee: String(orderData?.retailer_vat),
            discount: String(orderData?.retailer_discount),
            total: String(orderData?.retailer_sub_total),
            image: String(ProdImage),
            product_name: String(ProdName),
            brand_name: String(BrandName),
        }
        let payload = {
            notification: {
                title: 'Order is accepted by Supplier',
                body: `Order No- ${orderData.order_id} is accepted by Supplier,It will be delivered soon`,
            },
            data: notiObj
        }
        let notiJson = JSON.stringify(payload);
        if (retailerUser?.deviceToken && orderData?.vendor_details?.auto_accept_order == 1) {
            const notificationCount = await NotificationDataModel.count({
                where: { receiverId: retailerUser?.uuid, status: 0 },
            });
            // console.log(retailerUser?.deviceToken,'retailerUser?.deviceToken')
            sendNotification(retailerUser?.deviceToken, payload, notificationCount)
            let idr = uuidv4();
            idr = idr.replace(/-/g, "");
            await NotificationDataModel.create({ uuid: idr, receiverId: retailerUser?.uuid, subject: notiObj.notification_type, body: notiJson })

            let keyname = `notificationList:1:10:${retailerUser?.uuid}`
            await redis.del(keyname)
        }

        //send notification and whatsapp msg to logistic
        // const logisticData = await User.findAll({
        //   where: { user_type: 'logistic', is_deleted: 0 },
        //   raw: true,
        //   attributes: ['uuid', 'id', 'name', 'name_ar', 'user_type', 'email', 'phone', 'deviceToken']
        // });
        // if (logisticData) {
        //   await sendNotificationToLogistic(orderData, logisticData);
        // }

        let usersData = await User.findAll({
            where: {
                [Op.or]: [
                    { uuid: retailerUser?.assign_to, user_type: USERS.EMPLOYEE, is_deleted: 0 },
                    { role: USERS.SUPERVISOR, is_deleted: 0 }
                ]
            },
            raw: true,
            attributes: ['uuid', 'id', 'name', 'name_ar', 'user_type', 'email', 'phone', 'deviceToken', 'role']
        });
        // console.log(usersData, 'usersData,usersData,usersData,')
        // console.log(orderData?.vendor_details, 'orderData?.vendor_details?.,usersData,')
        if (orderData?.vendor_details?.auto_accept_order == 1) {
            if (usersData) {
                await sendNotificationToLogistic(orderData, usersData);
            }
        } else {
            let sales_employee = usersData?.find((a) => a?.uuid == retailerUser?.assign_to)
            console.log(sales_employee, 'sales_employeesales_employee')
            let orderObj = {
                msgOne: ` ${sales_employee?.name || ""}.`,
                msgTwo: `${retailerUser?.company_name}`,
                msgThree: `${order_id}`,
                msgFour: orderData.warehouse_address,
                msgFive: ` ${retailerUser?.company_address}`,
                msgSix: `AED: ${Math.trunc(Number(orderData.retailer_sub_total) * 100) / 100}`,
            };
            let send_obj = {
                WhatsAppmsg_template: environmentVars.NEW_ORDER_GENERATE_NOTIFICATION_EMP,
                to: sales_employee?.phone,
                data: orderObj
            }

            if (sales_employee && sales_employee?.phone) {
                console.log(send_obj, '  when paynt is receid ,send_ noti a sales emp')
                await send_whatsApp_noti_assigned_employee(send_obj); //send message
            }
            let super_arr = usersData?.filter((a) => a?.role == USERS.SUPERVISOR)

            for (let fetch_supervisor of super_arr) {

                orderObj.msgOne = ` ${fetch_supervisor?.name}.`
                send_obj.to = fetch_supervisor?.phone
                if (fetch_supervisor && fetch_supervisor?.name) {
                    console.log(send_obj, 'payment red send_noti supervisor')
                    await send_whatsApp_noti_assigned_employee(send_obj); //send message
                }
            }

        }

        // console.log(usersData, "usersData--usersData--usersData")


        //send notification and whatsapp msg to logistic

        // //For Socket Event
        // let io = req.app.get("io");
        // io.to("get-new-orders-logistic").emit('get-new-orders', { message: 'New Orders list!', data: orderData });
        // //For Socket Event
    }

    //retry payment for requested order
    async retryPaymentForRequestOrder(req, res, next) {
        try {
            let { order_id, payment_method, payment_mode, bank_name, cheque_no, pay_date, doc_image } = req.body;
            console.log("req.body", req.body);
            let orderObj = await OrderModel.findOne({
                where: { order_id, payment_status: { [Op.not]: "complete" }, status: { [Op.in]: ["pending", "new", "requested"] }, request_id: { [Op.not]: null } },
                attributes: [
                    "order_id",
                    "warehouse_id",
                    "vendor_details",
                    "product_arr",
                    "sub_total",
                    "payment_method",
                    "payment_mode",
                    "payment_status",
                    "status",
                    "country_code",
                    "outlet_id",
                    "request_id"
                ],
                raw: true,
            });
            console.log("orderObj", orderObj);
            if (!orderObj) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found : ";
                next();
                return;
            }
            let outletObj = await OutletModel.findOne({
                where: { uuid: orderObj?.outlet_id },   //,user_id:req.userData.uuid
                raw: true,
            });
            if (!outletObj) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Outlet not found : ";
                next();
                return;
            }
            const keys = [];//product_id -----
            const variantKey = [];
            const warehouse_array = [];
            for (let product of orderObj?.product_arr) {
                keys.push(product?.db_product_obj?.uuid);
                variantKey.push(product?.db_variant_obj?.uuid);
            }
            let simplrProductArr = await ProductsModels.findAll({
                where: { uuid: keys, status_by_super_admin: 1, status: "active", is_deleted: 0 },
                raw: true,
                attributes: [
                    "id",
                    "uuid",
                    "brand_id",
                    "description",
                    "summary",
                    "category_id",
                    "subcategory_id",
                    "subcategory_id_level3",
                    "subcategory_id_level4",
                    "condition",
                    "title",
                    "universal_standard_code",
                    "status",
                    "created_by",
                    "vat"
                ],
            });
            let variantDbArr = await ProductVariantModel.findAll({
                where: { uuid: variantKey, status: 'active', status_by_super_admin: 1 },
                raw: true,
            });
            let tempVariantData = [...variantDbArr];
            // console.log(variantDbArr," variantDbArrvariantDb rr")
            // return
            tempVariantData = JSON.parse(JSON.stringify(tempVariantData));
            for (let el of variantDbArr) {
                for (let le of el.warehouse_arr) {
                    warehouse_array.push(le?.id);
                }
            }
            let findWArhouseDb = await WarehouseModel.findAll({
                where: { uuid: warehouse_array },
                raw: true,
            });
            let t = [];
            for (let el of orderObj?.product_arr) {
                let findData = variantDbArr?.find((elem) => elem?.uuid == el?.db_variant_obj?.uuid);
                if (!findData) {
                    return res
                        .status(400)
                        .json({ message: `This variant ${el.variant_id} is not exist` });
                }
                let variantNameFind = findData?.title3
                if (el?.quantity < findData?.minimum_order_quantity) {
                    // res.status(400).json({
                    //   message: `Minimum order quantity is ${findData?.minimum_order_quantity} of this variant ${variantNameFind}`,
                    //   statusCode: 400,
                    //   succcess: false,
                    // });
                    // return;

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Minimum order quantity is ${findData?.minimum_order_quantity} of this variant ${variantNameFind}`;
                    next();
                    return;
                }
                let productData = simplrProductArr?.find(
                    (h) => h?.uuid == el?.db_product_obj?.uuid
                );
                if (!productData) {
                    return res
                        .status(400)
                        .json({ message: `This product ${el.product_id} is not exist` });
                }
                let warhousefind = findData?.warehouse_arr;
                el.db_variant_title = findData?.title;
                warhousefind = warhousefind?.sort((a, b) => b?.quantity - a.quantity);
                let Ui_quantity = el.quantity;
                let totalWwrehouseQuantity = warhousefind?.reduce(
                    (a, b) => Number(a) + Number(b?.quantity),
                    0
                );
                if (el.quantity > totalWwrehouseQuantity) {
                    // return res.status(400).json({
                    //   // message: `This variant ${el?.variant_id}, only have ${totalWwrehouseQuantity} quantity`,
                    //   message: `This variant ${variantNameFind}, only have ${totalWwrehouseQuantity} quantity`,
                    //   statusCode: 400,
                    //   succcess: false,
                    // });

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This variant ${variantNameFind}, only have ${totalWwrehouseQuantity} quantity`;
                    next();
                    return;
                }
                // console.log(Ui_quantity, "Ui_quantity ", "el", "asda", warhousefind, "asdads", findData)
                // return
                if (Ui_quantity >= findData?.minimum_order_quantity && warhousefind?.length) {
                    if (Ui_quantity <= warhousefind[0]?.quantity) {
                        let elem = warhousefind[0];
                        let warehouseData = findWArhouseDb?.find((q) => q.uuid == elem?.id);
                        let obj = {
                            ui_data: { ...el, quantity: Ui_quantity },
                            db_warehouse_obj: { ...elem },
                            variant_db: findData,
                            findProductOBj: productData,
                        };
                        if (warehouseData) {
                            obj.db_warehouse_obj.pick_up_latitude = warehouseData?.latitude;
                            obj.db_warehouse_obj.pick_up_longitude = warehouseData?.longitude;
                            obj.db_warehouse_obj.warehouse_address = warehouseData?.address;
                            obj.db_warehouse_obj.warehouse_po_box = warehouseData?.po_box;
                            obj.db_warehouse_obj.warehouse_id = warehouseData?.uuid;
                        }
                        t = [...t, obj];
                    } else {
                        for (let elem of warhousefind) {
                            let uiDataCopy = JSON.parse(JSON.stringify(el));
                            let warehouse_dat = findWArhouseDb?.find(
                                (q) => q.uuid == elem?.id
                            );
                            let obj = {
                                ui_data: uiDataCopy,
                                db_warehouse_obj: elem,
                                variant_db: findData,
                                findProductOBj: productData,
                            };
                            if (warehouse_dat) {
                                obj.db_warehouse_obj.pick_up_latitude = warehouse_dat?.latitude;
                                obj.db_warehouse_obj.pick_up_longitude = warehouse_dat?.longitude;
                                obj.db_warehouse_obj.warehouse_address = warehouse_dat?.address;
                                obj.db_warehouse_obj.warehouse_po_box = warehouse_dat?.po_box;
                                obj.db_warehouse_obj.warehouse_id = warehouse_dat?.uuid;
                            }
                            if (Ui_quantity > elem?.quantity) {
                                obj.ui_data.quantity = elem?.quantity;
                                Ui_quantity = Ui_quantity - elem.quantity;
                                t = [...t, obj];
                            } else if (
                                Ui_quantity < elem?.quantity &&
                                Ui_quantity >= findData?.minimum_order_quantity
                            ) {
                                obj.ui_data.quantity = Ui_quantity;
                                t = [...t, obj];
                                Ui_quantity = elem.quantity - Ui_quantity;
                            } else if (
                                Ui_quantity == elem?.quantity &&
                                Ui_quantity >= findData?.minimum_order_quantity
                            ) {
                                obj.ui_data.quantity = Ui_quantity;
                                t = [...t, obj];
                            }
                        }
                    }
                }
            }
            /**-------------------------------Credit Amount Validation-------------------------------------------- */
            let user_details = await UserDetailsModel.findOne({ where: { user_id: req?.userData?.uuid }, attributes: ["credit_amount"] });
            let SM_credit = parseFloat(user_details?.credit_amount).toFixed(2);
            if (payment_method == "goods_on_credit" || payment_method == "goods on credit") {
                if (!user_details?.credit_amount || Number(user_details.credit_amount) < Number(orderObj?.sub_total)) {
                    // res.status(400).json({
                    //   message: `Insufficient credit balance to place the order.`,
                    //   statusCode: 400,
                    //   succcess: false,
                    // });
                    // return;

                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Insufficient credit balance to place the order.`;
                    next();
                    return;
                } else {
                    SM_credit = parseFloat(SM_credit - Number(orderObj?.sub_total)).toFixed(2);
                }
            }
            /**-------------------------------Credit Amount Validation-------------------------------------------- */
            await OrderModel.update({
                payment_method,
                status: payment_method == "advance_pay" ? "requested" : "orderaccepted",
                payment_mode
            }, { where: { order_id } });
            let order_uuids = [order_id];
            let payment_url = null;
            if (payment_method == "advance_pay") {
                let billing_address = {
                    "delivery_name": req.userData?.name,
                    "delivery_address": "Dubai",
                    "delivery_city": "Dubai",
                    "delivery_state": "Dubai",
                    "delivery_zip": "123456",
                    "delivery_country": "United Arab Emirates",
                    "delivery_tel": "971542112539"
                }
                payment_url = await this.initiatePayment(order_uuids, orderObj?.sub_total, billing_address);
            }
            /* res
              .status(200)
              .json({
                message: "Payment Initiated",
                statusCode: 200,
                success: true,
                payLink: payment_url?.payLink || null,
                order_ids: order_uuids,
                SM_credit
              }); */

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Payment Initiated";
            res.locals.payLink = payment_url?.payLink || null;
            res.locals.order_ids = order_uuids;
            res.locals.SM_credit = SM_credit;
            next();
            if (payment_method != "advance_pay") {
                this.updateWarehouseQuantity(order_id);
            }
            /**-------------------------------Credit Amount Calculation-------------------------------------------- */
            if (payment_method == "goods_on_credit" || payment_method == "goods on credit") {
                const timestamp = Date.now();
                let uuid = timestamp + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
                await UserDetailsModel.update({ 'credit_amount': SM_credit }, { where: { user_id: req.userData.uuid } });
                let transaction_data = {
                    uuid,
                    user_id: req?.userData?.uuid,
                    order_id: order_uuids,
                    amount: orderObj?.sub_total,
                    transaction_type: "Debit",
                }
                await UserCreditTransactionModel.create(transaction_data);
                let doc_image_url;
                if (doc_image && Object.keys(doc_image).length > 0) {
                    let image_name = `${Date.now()}_${doc_image?.name}`;
                    const docImagePhotoKey = `${req?.userData?.user_type}/${req?.userData?.uuid}/goods_credit_cheque/${image_name}`;
                    doc_image_url = `https://${bucketName}.s3.${region}.amazonaws.com/${docImagePhotoKey}`;
                    await uploadBase64ImageToS3(doc_image?.uri, doc_image?.name, doc_image?.type, 'user');
                }
                const timestamp2 = Date.now();
                let cheque_uuid = timestamp2 + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
                let credit_data = {
                    uuid: cheque_uuid,
                    user_id: req?.userData?.uuid,
                    order_id: order_uuids,
                    amount: orderObj?.sub_total,
                    bank_name,
                    cheque_no,
                    pay_date,
                    doc_image: doc_image_url,
                    status: "order_created",
                }
                await GoodsOnCreditModel.create(credit_data);
            }
            /**-------------------------------Credit Amount Calculation-------------------------------------------- */
            /**-------------------------------socket io-------------------------------------- */

            let io = req.app.get("io");
            await this.sendSocketEvent(io, order_id);
            /**-------------------------------socket io-------------------------------------- */
            /***************************redis delete order data */
            try {
                const keys = await redis.keys(`${REDIS_KEY.ORDER}*`);
                if (keys && keys?.length) {
                    await redis.del(...keys);
                }
            } catch (er) {
                console.log(er, 'eriin cace edis')
            }
        } catch (err) {
            console.log(err, "error in retry payment api");
        }
    }

    async test_pdf_design(req, res, next) {
        try {
            //let order_id = 'OD1735924981';
            let order_id = 'OD1735920788';
            let orderData = await OrderModel.findOne({
                where: { order_id: order_id },
                raw: true,
            });
            await orderReceivedAndSendEmailToVendor(orderData, order_id);

            return res.status(200).json({ message: `success` });
        } catch (err) {
            console.log(err, "error in testtt");
        }
    }

    async getInvoice_emp(req, res, next) {
        try {
            let order_id = req.params?.order_id;
            // console.log(req.params,'req.paamnsnsns',req.userData)
            // return
            let order_details = await OrderModel.findOne({ where: { status: order_id }, raw: true, attributes: { exclude: ['additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] }, })
            let pdfBuffer;
            // if (order_details.status == 'cancelled') {
            //   //res.status(400).send({ message: "Pdf can not be generated for cancelled order", statusCode: 400, success: false });

            //   res.locals.statusCode = 400;
            //   res.locals.success = false;
            //   res.locals.message = "Pdf can not be generated for cancelled order";
            //   next();
            //   return;
            // }
            if (req.userData?.employee_obj && req.userData?.employee_obj?.user_type == USERS.EMPLOYEE) {
                pdfBuffer = await generateInvoicePDF_emp(order_details, order_id);
                // return
            } else if (req.userData.user_type == 'vendor') {
                pdfBuffer = await generateInvoicePdfForVendor(order_details, order_id);
            }
            else {
                pdfBuffer = await generateInvoicePdfForRetailer(order_details, order_id);
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${order_id}_invoice.pdf`);
            res.end(pdfBuffer);

            /* res.status(200).send({
              message: "Invoice",
              statusCode: 200,
              success: true,
              data: pdfBuffer
            }); */


        } catch (err) {
            //return res.status(500).json({ message: err?.message, statusCode: 500, success: false })

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async accepted_order_downlaod_for_emp(req, res, next) {
        try {
            let get = await OrderModel?.findAll({
                where: { status: ORDER_STATUS.ORDERACCEPTED },
                raw: true,
                order: [['id', 'DESC']],
                attributes: ['uuid', 'order_id', 'user_id', 'order_date', 'delivery_date', 'payment_method', 'retailer_product_arr', 'delivery_charges', 'retailer_sub_total', 'status']
            })
            let fetchretaileid = get?.map((a) => a?.user_id)
            let getuser = await User?.findAll({
                where: { uuid: fetchretaileid }, raw: true, attributes: ['id', 'uuid',
                    'user_type',
                    'profile_photo',
                    'name',
                    'email',
                    'phone',
                    'company_name',
                    'vat_certificate_number',
                    'company_address']
            })
            // let retailerData = {
            //   company_address: req.userData.company_address||"company_address",
            //   name: "aaaaaaaaaaa",
            //   company_address: "zxxxxxxxxxxxx",
            //   email: "Aqadsupplier1@gmail.com",
            //   phone: "917530815210"
            // }
            get?.forEach((a) => {
                let find = getuser?.find((r) => r?.uuid == a.user_id)
                a.retailerData = find
            })
            await orderDetailsSendEmailToemploy(get); //send order invoice to retailer

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = 'Check mail';
            // res.locals.data = get;
            next();
        } catch (err) {
            console.log(err, 'accepted_nlaod_for_emp')
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }


    async getInvoice_temp(req, res, next) {
        try {
            let order_id = req.params?.order_id;
            // console.log(req.params,'req.paamnsnsns',req.userData)
            // return
            let order_details = await OrderModel.findOne({ where: { order_id: order_id }, raw: true, attributes: { exclude: ['additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] }, })
            let pdfBuffer;
            if (!order_details) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }
            pdfBuffer = await tempgenerateInvoicePdfForRetailer(order_details, order_id);
            // pdfBuffer = await generateInvoicePdfForRetailer(order_details, order_id);
            //doubtttttttttttttttt
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${order_id}_invoice.pdf`);
            res.end(pdfBuffer);

            /* res.status(200).send({
              message: "Invoice",
              statusCode: 200,
              success: true,
              data: pdfBuffer
            }); */


        } catch (err) {
            console.log(err?.message, "?.message,?.message,")
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }

    async getbilltemp(req, res, next) {
        try {
            let order_id = req.params?.order_id;
            // console.log(req.params,'req.paamnsnsns',req.userData)
            // return
            let order_details = await OrderModel.findOne({ where: { order_id: order_id }, raw: true, attributes: { exclude: ['additional_commission_rate_for_retailer', "card_details", 'card_data', 'apiHit', 'lastHitTime'] }, })
            let pdfBuffer;
            if (!order_details) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = "Order not found";
                next();
                return;
            }

            pdfBuffer = await generateInvoicePDF_emp(order_details, order_id);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${order_id}_invoice.pdf`);
            res.end(pdfBuffer);

        } catch (err) {
            console.log(err?.message, "?.message,?.message,")
            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = err?.message;
            next();
            return;
        }
    }


    async get_data_emp(req, res, next) {
        try {
            let user_id = [req.userData.employee_id];
            let token_obj = req.userData
            let { retailer_id, searchKeyword, employee_id, user_type, order_id } = req.query;
            // searchKeyword = 'OD1742293082'
            // let searchKeyword = req.query.searchKeyword//product title or brancd or orderid

            console.log('userrrrrrrr: ', req.query);
            // console.log('req.userData:::::<<>>>> ', req.userData);
            const statusQuery = req.query.status || null;
            const page = req.query.page || 1;
            const pageSize = req.query.pageSize || 10;
            const offset = (page - 1) * pageSize;

            let whereCondition = {};
            if (statusQuery && statusQuery.length > 0) {
                whereCondition.status = {
                    [Op.in]: statusQuery,
                };
            }
            /***supervisor here can get  data */
            if (employee_id && employee_id?.length > 5 && employee_id != 'undefined') {
                user_id = [employee_id]
            }
            if (user_type && user_type == USERS.GUEST_USER) {
                whereCondition.outlet_id = null
            } else if (user_type && user_type == USERS.RETAILER) {
                whereCondition.outlet_id = { [Op.ne]: null };
            } else {
                whereCondition.outlet_id = null  // favourale for guest user
            }

            // if (token_obj?.user_type == USERS.EMPLOYEE && token_obj?.role == USERS.SUPERVISOR) {

            //   let all_emp_user_linked = await User?.findAll({ where: { assign_to: token_obj?.uuid }, raw: true, attributes: ['uuid'] })
            //   // console.log(all_emp_user_linked, 'all_emp_user_linkedall_emp_user_linked')
            //   if (all_emp_user_linked && all_emp_user_linked?.length) {
            //     let uuids = all_emp_user_linked?.map((A) => A?.uuid)
            //     // console.log(uuids,'uuidsuuidsuuidsuuidsuuids')
            //     user_id.push(...uuids)
            //   }
            // }

            //------------------redis get data
            let keyname = `${REDIS_KEY.ORDER_GET_DATA}:${user_id}:${retailer_id}:${searchKeyword}:${statusQuery}:${page}:${pageSize}:${req.userData.user_type}:${req.language}`
            let getredis = await redis.get(keyname)
            if (getredis) {
                let extactdata = JSON.parse(getredis)
                // if (extactdata && extactdata.data) {
                //   res.locals.statusCode = 200;
                //   res.locals.success = true;
                //   res.locals.message = "Fetch Data from redis";
                //   res.locals.data = extactdata.data
                //   res.locals.pagination = extactdata.pagination
                //   next();
                //   return;
                // }
            }

            if (searchKeyword) {
                searchKeyword = searchKeyword.toLowerCase()
                whereCondition = {
                    ...whereCondition,
                    [Op.and]: {
                        [Op.or]: [Sequelize.literal(
                            `LOWER(JSON_EXTRACT(retailer_product_arr, '$[0].db_product_obj.title')) LIKE '%${searchKeyword}%'`
                        ),
                        Sequelize.where(
                            Sequelize.fn('LOWER', Sequelize.col('order_id')),
                            {
                                [Op.like]: `%${searchKeyword}%`
                            }
                        )]
                    }
                }

            }
            if (order_id && order_id?.length > 10) {
                whereCondition.uuid = order_id
            }

            let totalItems;

            console.log("req.userData?.user_type", req.userData?.user_type, whereCondition, 'whereCondition,', user_id);
            // if (req.userData && req.userData?.user_type == 'retailer') {
            if (statusQuery && statusQuery?.length > 0) {
                whereCondition = { status: statusQuery }
            }

            let get = await OrderModel.findAll({
                where: {
                    ...whereCondition,
                    //[Op.and]: [{ [Op.or]: [Sequelize.where(col('orders.order_id'), col('orders.common_order_id')), { 'common_order_id': null }] }],
                    emp_id: { [Op.in]: user_id },
                },
                include: [
                    {
                        model: UserModel,
                        as: "UserObj", // Define an alias (optional)
                        attributes: ["uuid", "name", "email", "phone"], // Select only necessary fields
                    },
                ],
                /* include: [
                  {
                    model: OrderModel,
                    as: 'common_orders', // Alias defined in the association
                    attributes: ['order_id', 'retailer_product_arr'], // Select specific fields for the manager
         
                  },
                ],
                subQuery: false, */
                //attributes: { exclude: ["card_data", "card_details", 'apiHit', 'product_arr'] },
                attributes: ["id", "uuid", "user_id", "order_id", "order_date", ["retailer_sub_total", "totalAmount"], 'product_arr', 'emp_id', 'retailer_product_arr', 'status', 'request_id', 'outlet_id', 'retailer_discount_obj'],
                order: [['created_at', 'DESC']],
                limit: pageSize,
                offset: offset,
            });
            // console.log(get, "getabccccccccc", whereCondition, "whereConditionwhereCondition")

            totalItems = await OrderModel.count({
                where: {
                    ...whereCondition,
                    //[Op.and]: [{ [Op.or]: [Sequelize.where(col('orders.order_id'), col('orders.common_order_id')), { 'common_order_id': null }] }],
                    emp_id: {
                        [Op.in]: user_id
                    }
                },
            });

            let get2 = JSON.parse(JSON.stringify(get))
            get2 = get2?.map((a) => {
                a.product_arr = a.retailer_product_arr
                // console.log(a?.retailer_discount_obj,'a?.retailtailer_discount_obj')
                if (a?.retailer_discount_obj && a?.retailer_discount_obj != null && a?.retailer_discount_obj?.retailer_sub_total_after_discount && Number(a?.retailer_discount_obj?.retailer_sub_total_after_discount) > 0) {
                    a.totalAmount = a?.retailer_discount_obj?.retailer_sub_total_after_discount?.toString()
                }
                a.totalAmount = Math.trunc(Number(a?.totalAmount) * 100) / 100
                a.totalAmount = a.totalAmount?.toString()
                // console.log(a.totalAmount, 'a.totalAmounta.totalAmount')
                a.product_arr = a?.product_arr?.map((ele) => {
                    ele.db_product_obj.brand_id = req.language == "ar" && ele?.db_product_obj?.brand_id_ar ? ele?.db_product_obj?.brand_id_ar : ele?.db_product_obj?.brand_id
                    ele.db_product_obj.title = req.language == "ar" && ele?.db_product_obj?.title_ar ? ele?.db_product_obj?.title_ar : ele?.db_product_obj?.title
                    return ele;
                })
                // if (a?.status == 'accept') {
                //   a.status = 'AcceptedByFE';
                // }

                delete a.retailer_product_arr
                return a
            })

            // console.log(totalItems, "totalItemstotalItemstotalItems", get)
            const totalPages = Math.ceil(totalItems / pageSize);
            //----------redis set data------------------------
            let redisobj = {
                data: get2,
                pagination: {
                    currentPage: page,
                    pageSize: pageSize,
                    totalItems: totalItems,    //totalItems
                    totalPages: totalPages,
                }
            }

            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Fetch Data";
            res.locals.data = get2
            res.locals.pagination = {
                currentPage: page,
                pageSize: pageSize,
                totalItems: totalItems,    //totalItems
                totalPages: totalPages,
            }
            next();
            await redis.set(keyname, JSON.stringify(redisobj), 'EX', environmentVars.REDISTTL)
            return;
        } catch (error) {
            console.error(error, 'get order_data_emp___');

            res.locals.statusCode = 500;
            res.locals.success = false;
            res.locals.message = error.message;
            next();
            return;
        }

    }

    async formatDate2(dateString) {
        let date = new Date(dateString);
        let day = String(date.getDate()).padStart(2, '0'); // Ensure 2-digit day
        let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        let year = date.getFullYear();
        // console.log(`${day}${month}-${year}`, '`${day}${month}${year}`')
        return `${day}-${month}-${year}`; // Format: DDMMYYYY
    }

    async get_by_retailer_id(req, res, next) {
        try {
            let { user_id } = req.query
            let page = req.query.page ? parseInt(req.query.page) : 1;  // Get the current page from request, default to 1
            let pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 150; // Get page size from request, default to 10
            let offset = (page - 1) * pageSize; // Calculate offset

            // Count total items for pagination
            let totalItems = await OrderModel.count({
                where: {
                    user_id: user_id,
                    emp_id: { [Op.ne]: null },
                    [Op.or]: [
                        { status: { [Op.in]: ['orderaccepted', 'outfordelivery'] } },
                        {
                            status: { [Op.in]: ['completed', 'delivered'] },
                            payment_status: 'pending'
                        }
                    ],
                }
            });

            let order_arr = await OrderModel.findAll({
                where: {
                    user_id: user_id, // Correct way to use an array in Sequelize
                    emp_id: { [Op.ne]: null },
                    [Op.or]: [
                        { status: { [Op.in]: ['orderaccepted', 'outfordelivery'] } }, // Directly include these statuses
                        {
                            status: { [Op.in]: ['completed', 'delivered'] },
                            payment_status: 'pending' // Only include if payment_status is pending
                        }
                    ],
                },
                raw: true,
                attributes: ['user_id', 'uuid', 'status', 'emp_id', 'assign_to', 'payment_status', 'vendor_details', 'warehouse_address', 'retailer_product_arr', 'order_id', 'user_id', 'outlet_address', 'retailer_sub_total', 'retailer_sub_sub_total', 'retailer_vat', 'retailer_discount', 'retailer_commission', 'payment_method', 'payment_mode', 'payment_status', 'status', 'order_accepted_by_vendor', 'order_date', 'id'],
                order: [['id', 'DESC']],
                limit: pageSize,  // Limit the number of results per page
                offset: offset    // Skip previous pages' results
            });

            let totalPages = Math.ceil(totalItems / pageSize); // Calculate total pages

            for (let le of order_arr) {
                if (le.order_accepted_by_vendor) {
                    let t = await this.formatDate2(le.order_accepted_by_vendor)
                    le.formatted_time_vendor_accept = t
                }
                le.total_amount = le.retailer_sub_total
                // let sub_total= retailer_sub_sub_total
                if (le.order_date) {
                    let t = await this.formatDate2(le.order_date)
                    le.formatted_order_date = t
                }

                // Ensure all values are treated as numbers to avoid concatenation issues
                let retailer_sub_sub_total = parseFloat(le.retailer_sub_sub_total) || 0;
                let retailer_vat = parseFloat(le.retailer_vat) || 0;
                let retailer_discount = parseFloat(le.retailer_discount) || 0;
                let retailer_commission = parseFloat(le.retailer_commission) || 0;

                // Calculate sub_total and ensure only two decimal places using Math.trunc
                let sub_total = retailer_sub_sub_total + retailer_vat + retailer_commission - retailer_discount;
                le.sub_total = Math.trunc(sub_total * 100) / 100; // Keeps only two decimal places
            }
            res.locals.statusCode = 200;
            res.locals.success = true;
            res.locals.message = "Fetch Data";
            res.locals.pagination = {
                currentPage: page,
                pageSize: pageSize,
                totalRecords: totalItems,    //totalItems
                totalPages: totalPages,
            };
            res.locals.data = order_arr
            next();
            return;

        } catch (er) {
            console.log(er, 'er in get_by_retailer_id')
            return res.status(500).json({ message: er?.message, statusCode: 500, success: false })
        }
    }

    //now user want to edit the order -->add new product , edit quantity of existing products
    async editOrder(req, res, next) {
        try {
            let {
                order_detail,
                sub_total,
                payment_method,
                payment_id,
                delivery_instructions,
                status,
                retailer_id,
                //emp_id,
                bank_name,
                cheque_no,
                order_id
            } = req.body;

            let emp_id = req.userData?.employee_id || null;
            // order_id = 'OD1743248193',

            // console.log('edit----OrderLatest ', 'firstttttttttttreq.body ', req.body);
            // return; 

            let token_data = req.userData
            // console.log(token_data,'eeeeee')
            // return
            /****************verify otp */
            let getOtp = await UserOtp?.findOne({ where: { email: token_data?.employee_obj?.email }, raw: true })
            // console.log(getOtp, 'getOtp getOtp getOtp ')
            if (getOtp && getOtp?.status != 'active') {
                // res.locals.statusCode = 400;
                // res.locals.success = false;
                // res.locals.message = "Verify otp first.";
                // next();
                // return

            }
            let outletObj = {}

            const keys = [];//product_id -----
            const variantKey = [];
            const warehouse_array = [];

            //fetch order data from order table 
            let order_obj = await OrderModel?.findOne({ where: { uuid: order_id }, raw: true })
            if (!order_obj) {
                return res.status(400).json({ message: "Order data not found", statusCode: 400, success: false })

            } else if (order_obj && !['against_delivery', 'goods_on_credit', 'bill_to_bill']?.includes(order_obj?.payment_method)) {
                return res.status(400).json({ message: `Order cannot be edited, payment method : ${order_obj?.payment_method}`, statusCode: 400, success: false })
                // return res.status(400).json({ message: `Order cannot be edited`, statusCode: 400, success: false })

            } else if (order_obj && !['new', 'orderaccepted', 'pending']?.includes(order_obj?.status)) {
                return res.status(400).json({ message: `Order cannot be edited, current order status is : ${order_obj?.status}`, statusCode: 400, success: false })

            } else if (order_obj?.payment_method == ORDER_STATUS.GOODS_ON_CREDIT && Number(order_obj?.collect_money) > 0) {
                return res.status(400).json({ message: `Order cannot be edited, Already taken some amount AED ${order_obj?.collect_money}`, statusCode: 400, success: false })

            }

            for (let le of order_detail) {
                keys.push(le?.product_id);
                variantKey.push(le?.variant_id);
            }

            let simplrProductArr = await ProductsModels.findAll({
                where: { uuid: keys },
                raw: true,
                attributes: [
                    "id",
                    "uuid",
                    "brand_id",
                    "title",
                    "title_ar",
                    "universal_standard_code",
                    "status",
                    "status_by_super_admin",
                    "approve_by_super_admin",
                    "created_by",
                    "vat",
                    "product_images",
                    'is_deleted',
                    'bill_title',
                    'product_identical',
                    'unit_value',
                    "is_primary",
                ],
            });

            //**********cehk same vendor product must be present */
            let findDifferentVendor = simplrProductArr?.find((a) => a?.created_by != order_obj?.vendor_details?.uuid)
            if (findDifferentVendor && findDifferentVendor?.uuid) {
                res.locals.statusCode = 400;
                res.locals.success = false;
                res.locals.message = `Different vendor's product not allowed`;
                next();
                return;
            }
            //********************************************************** */
            // console.log(simplrProductArr.length,"simplrProductArrsimplrProductArr")
            // return
            // return here is the validation
            for (let le of simplrProductArr) {
                if (le.status == 'inactive') {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This product ${le?.title} is not active `;
                    next();
                    return;
                } else if (le.status_by_super_admin == 0) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This product ${le?.title} is deactivated `;
                    next();
                    return;
                } else if (le.approve_by_super_admin == 0) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This product ${le?.title} is not approved `;
                    next();
                    return;
                } else if (le.is_deleted == 1) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This product ${le?.title} is deleted `;
                    next();
                    return;
                }
            }

            let variantDbArr = await ProductVariantModel.findAll({
                where: { uuid: variantKey },
                raw: true,
                attributes: {
                    exclude: ['packaging_type', 'packaging_type_ar', 'input_field',]
                }
            });

            let warehouseFrequency = {}; // To store warehouse frequencies across variants
            let warehouseMapping = {};  // To store warehouse details by their ID

            //   for (let le of variantDbArr) {
            //   if (le.status == 'inactive') {
            //     return res.status(400).json({ message: `This product's variant ${le?.title} is inactive`, statusCode: 400, success: false })
            //   } else if (le.status_by_super_admin == 0) {

            //     return res.status(400).json({ message: `This product's variant ${le?.title} is deactivated`, statusCode: 400, success: false })
            //   } else if (le.approve_by_super_admin == 0) {
            //     return res.status(400).json({ message: `This product's variant ${le?.title} is not approved`, statusCode: 400, success: false })
            //   } else if (le.is_deleted == 1) {
            //     return res.status(400).json({ message: `This product's variant ${le?.title} is deleted`, statusCode: 400, success: false })
            //   }
            // }
            // return

            // let tempVariantData = [...variantDbArr];

            // tempVariantData = JSON.parse(JSON.stringify(tempVariantData));

            for (let el of variantDbArr) {
                el.warehouse_arr_2 = el.warehouse_arr
                warehouseMapping[el?.id] = null;

                for (let le of el.warehouse_arr) {
                    warehouse_array.push(le?.id);

                    //to find common warehouse among variants
                    if (!warehouseFrequency[le?.id]) {
                        warehouseFrequency[le?.id] = 1;
                    } else {
                        warehouseFrequency[le?.id]++;
                        // Store warehouse details
                        warehouseMapping[el?.id] = le?.id;
                    }
                }
            }

            let findWArhouseDb = await WarehouseModel.findAll({
                where: { uuid: warehouse_array },
                raw: true,
            });

            let t = [];

            let flashSalesData = await FlashSalesModel.findAll({
                where: {
                    variant_id: variantKey,
                    //uttam added this code
                    status: 1,
                    quantity: {
                        [Op.gt]: 0 // Check if quantity is greater than the 0
                    },
                    end_date: {
                        [Op.gte]: new Date() // Check if expiry_date is greater than the current date
                    }
                },
                raw: true
            })

            // return

            let vatAndFee = 0;
            let discountFee = 0;

            for (let el of order_detail) {
                let inFlash = false
                let findData = variantDbArr?.find((elem) => elem?.uuid == el?.variant_id);

                if (!findData) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `This variant ${el.variant_id} is not exist`;
                    next();
                    return;
                }

                let findProduct = simplrProductArr?.find((a) => a?.uuid == el.product_id);

                if (!findData.images || findData?.images?.length == 0) findData.images = findProduct?.product_images;

                let foundFlash = flashSalesData.find((item) => (item.variant_id == el.variant_id && Number(item.quantity) >= Number(findData?.minimum_order_quantity)));
                // findData.price_details = Math.floor(Number(findData.price_details) * 100) / 100

                findData.price_details = Math.trunc(Number(findData.price_details) * 10000) / 10000

                el.price = findData.price_details
                el.price_details = findData.price_details
                el.commission_type = findData.commission_type
                el.commission_value = findData.commission_value
                el.vat = findProduct?.vat
                // return
                let variantNameFind = findData?.title

                if (findData?.mainVariant?.name) {
                    variantNameFind = variantNameFind + " :" + findData?.mainVariant?.value
                } if (findData?.variant1?.name) {
                    variantNameFind = variantNameFind + ": " + findData?.variant1?.value
                } if (findData?.variant2?.name) {
                    variantNameFind = variantNameFind + ": " + findData?.variant2?.value
                }

                // console.log(el, "ellllllllllllwwwwwwwww")
                if (Number(el?.quantity) < Number(findData?.minimum_order_quantity) && el?.is_foc != true) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Minimum order quantity is ${findData?.minimum_order_quantity} of this variant ${variantNameFind}...`;
                    next();
                    return;
                }

                if (foundFlash && foundFlash.quantity != 0 && el?.quantity <= foundFlash.quantity) {  //&& foundFlash.quantity>=el?.quantity
                    //console.log("flashdatahiii----->>>>>>")
                    let flashDbPrice = 0
                    if (foundFlash.aqad_price != null) {
                        // foundFlash.aqad_price = Math.floor(Number(foundFlash.aqad_price) * 100) / 100
                        foundFlash.aqad_price = Math.trunc(Number(foundFlash.aqad_price) * 10000) / 10000

                        flashDbPrice = foundFlash.aqad_price
                    } else {
                        // foundFlash.offer_price = Math.floor(Number(foundFlash.offer_price) * 100) / 100
                        foundFlash.offer_price = Math.trunc(Number(foundFlash.offer_price) * 10000) / 10000
                        flashDbPrice = foundFlash.offer_price
                    }
                    let flashObj = {
                        quantity: sequelize.literal(`quantity - ${el?.quantity}`),
                        sold_quantity: sequelize.literal(`sold_quantity + ${el?.quantity}`)
                    };

                    if (el?.quantity > foundFlash.quantity) {
                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = `In Flash sale only ${foundFlash?.quantity} quantity available for this variant ${variantNameFind}`;
                        next();
                        return;

                    } else {
                        if (foundFlash.quantity == el?.quantity) flashObj.status = 0;
                        el.db_price = Number(flashDbPrice);
                    }
                    // let updateQuantity = await FlashSalesModel.update(flashObj, { where: { variant_id: el?.variant_id } });
                    inFlash = true
                } else {
                    if (findData?.discount_type == "fixed") {
                        let discountedPrice = Number(findData?.price_details) - Number(findData?.discount);
                        el.db_price = Number(discountedPrice);

                    } else if (findData.discount_type == "percentage") {
                        let discountedPrice = Number(findData.price_details) - (Number(findData.price_details) * Number(findData.discount) / 100);
                        el.db_price = discountedPrice;
                    } else {
                        el.db_price = Number(findData.price_details);
                    }
                }
                el.inFlash = inFlash;
                let productData = simplrProductArr?.find(
                    (h) => h?.uuid == el.product_id
                );
                if (!productData) {
                    return res
                        .status(400)
                        .json({ message: `This product ${el.product_id} is not exist` });
                }

                let warhousefind = findData?.warehouse_arr || findData?.warehouse_arr_2;
                // console.log(findData,"finddididididididdi")
                el.db_variant_title = findData?.title;
                // const foundRecord = flashSalesData.find((item) => item.variant_id == el.variant_id);
                delete findData?.warehouse_arr;
                delete findData?.created_at;
                delete findData?.updated_at;
                warhousefind = warhousefind?.sort((a, b) => b?.quantity - a.quantity);
                let Ui_quantity = el.quantity;
                let totalWwrehouseQuantity = warhousefind?.reduce(
                    (a, b) => Number(a) + Number(b?.quantity),
                    0
                );

                if (el.quantity > totalWwrehouseQuantity) {

                    /************if order already has same qunatity then no problem  */
                    let findV = order_obj?.retailer_product_arr?.find((t) => t?.db_variant_obj?.uuid == el?.variant_id)
                    warhousefind[0].quantity = el.quantity
                    if (Number(el.quantity) > Number(findV?.quantity)) {
                        // console.log(findV ,'order_obj?.retailer_product_arr','retailer_product_arr retailer_product_arr ',el)
                        res.locals.statusCode = 400;
                        res.locals.success = false;
                        res.locals.message = `This Product ${variantNameFind}, only have ${totalWwrehouseQuantity} quantity, id: ${findData?.id}`;
                        next();
                        return;
                    }
                }

                // console.log(el.is_foc, "Ui_quantity ", "el", "asda", warhousefind, "asdads", findData)
                // return

                if (el.is_foc == true && warhousefind?.length || (Ui_quantity >= findData?.minimum_order_quantity && warhousefind?.length)) {

                    if (Ui_quantity <= warhousefind[0]?.quantity) {
                        let commonWarehouse = warehouseMapping[findData?.id];
                        let elem = commonWarehouse == null ? warhousefind[0] : warhousefind.find((a) => a.id == commonWarehouse);
                        // console.log("findData?.id", findData?.id)
                        // console.log("commonWarehouse", commonWarehouse)
                        // console.log("elem", elem)
                        // return;
                        let warehouseData = findWArhouseDb?.find((q) => q.uuid == elem?.id);
                        let obj = {
                            ui_data: { ...el, quantity: Ui_quantity },
                            db_warehouse_obj: { ...elem },
                            variant_db: findData,
                            findProductOBj: productData,
                        };
                        if (warehouseData) {
                            obj.db_warehouse_obj.pick_up_latitude = warehouseData?.latitude;
                            obj.db_warehouse_obj.pick_up_longitude = warehouseData?.longitude;
                            obj.db_warehouse_obj.warehouse_address = warehouseData?.address;
                            obj.db_warehouse_obj.warehouse_po_box = warehouseData?.po_box;
                            obj.db_warehouse_obj.warehouse_id = warehouseData?.uuid;
                        }
                        t = [...t, obj];
                    } else {
                        for (let elem of warhousefind) {
                            let uiDataCopy = JSON.parse(JSON.stringify(el));
                            let warehouse_dat = findWArhouseDb?.find(
                                (q) => q.uuid == elem?.id
                            );
                            let obj = {
                                ui_data: uiDataCopy,
                                db_warehouse_obj: elem,
                                variant_db: findData,
                                findProductOBj: productData,
                            };
                            if (warehouse_dat) {
                                obj.db_warehouse_obj.pick_up_latitude = warehouse_dat?.latitude;
                                obj.db_warehouse_obj.pick_up_longitude = warehouse_dat?.longitude;
                                obj.db_warehouse_obj.warehouse_address = warehouse_dat?.address;
                                obj.db_warehouse_obj.warehouse_po_box = warehouse_dat?.po_box;
                                obj.db_warehouse_obj.warehouse_id = warehouse_dat?.uuid;
                            }
                            if (Ui_quantity > elem?.quantity) {
                                obj.ui_data.quantity = elem?.quantity;
                                Ui_quantity = Ui_quantity - elem.quantity;
                                t = [...t, obj];
                            } else if (
                                Ui_quantity < elem?.quantity &&
                                Ui_quantity >= findData?.minimum_order_quantity
                            ) {
                                obj.ui_data.quantity = Ui_quantity;
                                t = [...t, obj];
                                Ui_quantity = elem.quantity - Ui_quantity;
                            } else if (
                                Ui_quantity == elem?.quantity &&
                                Ui_quantity >= findData?.minimum_order_quantity
                            ) {
                                obj.ui_data.quantity = Ui_quantity;
                                t = [...t, obj];
                            }
                        }
                    }
                }
            }
            // res.json({a:"a",order_detail})
            // return
            // order_detail = order_detail?.filter((a) => Number(a.db_price));
            order_detail = order_detail?.filter((a) => Math.trunc(Number(a.db_price) * 100) / 100)// Number(a.db_price));
            //console.log(order_detail, "amountprice---->>>>2131");

            const conditions = order_detail.map(amount => {
                if (amount.commission_type == null || amount.commission_value == null) return ({
                    start_range: { [Op.lte]: amount.db_price },
                    end_range: { [Op.gte]: amount.db_price },
                    status: "active"
                })
            });


            const commissionData = await CommissionModel.findAll({
                where: { [Op.or]: conditions },
                attributes: ['id', 'uuid', 'rate', 'start_range', 'end_range', 'commission_type'],
                raw: true
            });

            let subtotal = 0;
            let total = 0

            t = t?.map((ele) => {
                let commission_type = ele.ui_data.commission_type;
                let commission_value = ele.ui_data.commission_value;
                if (commission_type == null && (commission_value == null || commission_value == '')) {
                    let findCommissionObj = commissionData?.find((v) => Number(ele.ui_data.db_price) >= v.start_range && Number(ele.ui_data.db_price) <= v.end_range);

                    commission_type = findCommissionObj?.commission_type;
                    commission_value = Number(findCommissionObj?.rate);
                }
                let commission_on_single_unit = 0;
                let vat_on_commission = 0;
                let vat_on_single_unit = 0;

                if (commission_type == 'fixed') {
                    commission_on_single_unit = Number(commission_value);
                } else if (commission_type == 'percentage') {
                    commission_on_single_unit = Math.trunc((Number(ele.ui_data.db_price) * Number(commission_value) / 100) * 100000) / 100000;
                    commission_on_single_unit = commission_on_single_unit.toFixed(3);
                }

                if (Number(ele.ui_data.vat)) {
                    vat_on_commission = Math.trunc((Number(commission_on_single_unit) * Number(ele.ui_data.vat) / 100) * 100000) / 100000;
                    vat_on_single_unit = Math.trunc((Number(ele.ui_data.db_price) * Number(ele.ui_data.vat) / 100) * 100000) / 100000;
                    // vat_on_single_unit = vat_on_single_unit.toFixed(3);
                }
                //  console.log(vat_on_single_unit,'vatvat_on_single_unitvat_on_single_unit')
                ele.ui_data.vat_on_single_unit = vat_on_single_unit;
                ele.ui_data.commission_on_single_unit = commission_on_single_unit;
                ele.ui_data.vat_on_commission = vat_on_commission;
                ele.ui_data.db_price_after_commission = Math.trunc((Number(ele.ui_data.db_price) + Number(commission_on_single_unit)) * 100000) / 100000;

                ele.ui_data.total_pricee_pay = Number(ele.ui_data.db_price_after_commission) + Number(vat_on_single_unit) + Number(vat_on_commission);
                ele.ui_data.total_pricee_pay = Math.trunc(Number(ele.ui_data.total_pricee_pay) * 10000) / 10000

                ele.ui_data.vendor_total_price_pay = Number(ele.ui_data.db_price) + Number(vat_on_single_unit);
                ele.ui_data.vendor_total_price_pay = Math.trunc(Number(ele.ui_data.vendor_total_price_pay) * 100000) / 100000;

                subtotal = Number(subtotal) + (Number(ele.ui_data.db_price) + Number(commission_on_single_unit)) * Number(ele.ui_data.quantity);
                total = Number(total) + Number(ele.ui_data.total_pricee_pay) * Number(ele.ui_data.quantity)
                //  CREATION NEW KEYS FOR CALCULATION******************************************
                // ele.new_retailer_total_price_with_com =Math.trunc (Number(ele.ui_data.price_details) * Number(ele.ui_data.quantity)*1000)/1000
                return ele;
            });

            let fetchVendorId = simplrProductArr?.map((el) => el.created_by);

            let vendorDbData = await User.findAll({
                where: { uuid: fetchVendorId },
                raw: true,
                attributes: [
                    "id",
                    "uuid",
                    "user_type",
                    "name",
                    "email",
                    "phone",
                    "account_status",
                    "company_name",
                    "company_address",
                    "company_logo",
                    "deviceToken",
                    'auto_accept_order'
                ],
            });

            let vendorArr = [];

            let common_order_id = null;

            // res.json({a:"2a",t})
            // return

            /****************if req.userData.user_type==vendor then fetch retailer_ and its assign_to */
            // let fetchRetailerObj;
            // if (req.userData.user_type == USERS.VENDOR) {
            //   fetchRetailerObj = await User?.findOne({ where: { uuid: retailer_id }, raw: true, attributes: ['uuid', 'user_type', 'id', 'name', 'assign_to'] })
            // }

            for (let el of t) {
                el.db_price_obj = {
                    price: el?.ui_data?.price,
                    offer_price: el?.ui_data?.db_price,
                    vat: el?.ui_data?.vat_on_single_unit,
                    commission: el?.ui_data?.commission_on_single_unit,
                    vat_on_commission: el?.ui_data?.vat_on_commission,
                };
                let findVendorObj = vendorArr?.find(
                    (s) => (s?.vendor_details?.uuid == el.findProductOBj?.created_by && s?.warehouse_id == el?.db_warehouse_obj?.id)
                );
                //console.log(el.findProductOBj, 'el.findProductOBj ');

                let getVednorObj = vendorDbData?.find(
                    (e) => e?.uuid == el.findProductOBj?.created_by
                );
                //return;
                if (getVednorObj) {
                    getVednorObj.warehouse_obj = el.db_warehouse_obj;
                }
                delete el?.variant_db?.size_id;
                delete el?.variant_db?.color_id;
                delete el?.variant_db?.discountedPrice;
                delete el?.variant_db?.compare_price_at;
                delete el?.variant_db?.is_vat_inclusive;
                delete el?.variant_db?.manufacture_price;
                delete el?.variant_db?.status_by_super_admin;
                delete el?.variant_db?.is_deleted;
                delete el?.variant_db?.other_value;
                delete el?.variant_db?.material_id;

                if (!findVendorObj) {
                    let randomNumber = String(Date.now() + Math.floor(10000000 + Math.random() * 90000000 + Math.random() * 80000)).slice(0, -3); // Generates an 8-digit random number
                    let id = `OD` + randomNumber;
                    if (common_order_id == null) common_order_id = id;
                    const deliveryDate = this.getDeliveryTime();
                    // console.log("deliveryDate", deliveryDate);
                    // return;

                    //deliveryDate.setDate(deliveryDate.getDate() + 7);
                    let pickupToDropDistance = await getDistance(
                        el?.db_warehouse_obj?.pick_up_latitude,
                        el?.db_warehouse_obj?.pick_up_longitude,
                        outletObj?.latitude,
                        outletObj?.longitude
                    );
                    // return


                    // let emp_id = req.userData?.assign_to
                    // if (req.userData.employee_obj && req.userData.employee_obj?.uuid && req.userData.employee_obj?.user_type == USERS.EMPLOYEE) {
                    //   emp_id = req.userData?.userDetails?.assign_to
                    // } 
                    // else if (req.userData.user_type == USERS.VENDOR) {
                    //   emp_id = fetchRetailerObj?.assign_to
                    // }
                    // console.log(getVednorObj,'emp_ iddddd','req.userData?.employee_id',"usera",' req.userData.assign_to,req.userData')
                    // return 
                    let order_status = 'new'
                    let pin = 500000
                    // if (payment_method == 'advance_pay' || payment_method == 'advance pay') {
                    //   order_status = 'pending'
                    // } else if (getVednorObj && getVednorObj?.auto_accept_order == 1) {
                    //   order_status = 'orderaccepted'
                    // }
                    let obj = {
                        warehouse_address: el?.db_warehouse_obj?.warehouse_address,
                        warehouse_po_box: el?.db_warehouse_obj?.warehouse_po_box,
                        warehouse_id: el?.db_warehouse_obj?.warehouse_id,
                        outlet_address: outletObj?.address,
                        outlet_id: outletObj?.uuid,
                        pickupToDropDistance: pickupToDropDistance || "",
                        drop_latitude: outletObj?.latitude,
                        drop_longitude: outletObj?.longitude,
                        vendor_details: getVednorObj,
                        uuid: order_obj?.order_id,
                        order_id: order_obj?.order_id,
                        created_by: order_obj?.created_by,
                        user_id: order_obj?.user_id,
                        email: order_obj?.email,
                        name: order_obj?.name,
                        delivery_date: deliveryDate,
                        shipping_date: deliveryDate,
                        out_for_delivery_date: deliveryDate,
                        vendor_id: el.findProductOBj?.created_by,
                    };
                    if (order_status == 'orderaccepted') {
                        obj.pin = pin
                    }

                    vendorArr.push({
                        ...obj,
                        product_arr: [
                            {
                                db_product_obj: el.findProductOBj,
                                db_variant_obj: el.variant_db,
                                db_price_obj: el?.db_price_obj,
                                is_foc: el?.ui_data?.is_foc || false,
                                db_warehouse_obj: el?.db_warehouse_obj,
                                quantity: Number(el?.ui_data?.quantity),

                                amount: Math.trunc((Number(el?.ui_data?.vendor_total_price_pay) * Number(el?.ui_data?.quantity)) * 10000) / 10000,
                                vat_total: Math.floor((Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit)) * 100000) / 100000,
                                discount_total: el?.ui_data?.inFlash == false
                                    ? 0
                                    : Math.floor(((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)) * 1000) / 1000,

                                // amount: (Number(el?.ui_data?.vendor_total_price_pay) * Number(el?.ui_data?.quantity)).toFixed(2),
                                // discount_total: el?.ui_data?.inFlash == false ? 0 : ((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)).toFixed(2),
                                in_flash: el?.ui_data?.inFlash,
                            },
                        ],
                        retailer_product_arr: [
                            {
                                db_product_obj: el.findProductOBj,
                                db_variant_obj: el.variant_db,
                                db_price_obj: el?.db_price_obj,
                                is_foc: el?.ui_data?.is_foc || false,
                                db_warehouse_obj: el?.db_warehouse_obj,
                                quantity: el?.ui_data?.quantity,

                                amount: Math.trunc((Number(el?.ui_data?.quantity) * Number(el?.ui_data?.total_pricee_pay)) * 10000) / 10000,
                                vat_total: Math.floor((Number(el?.ui_data?.quantity) *
                                    (Number(el?.ui_data?.vat_on_single_unit) + Number(el?.ui_data?.vat_on_commission))) * 100000) / 100000,

                                discount_total: el?.ui_data?.inFlash == false
                                    ? 0
                                    : Math.floor(((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)) * 10000) / 10000,
                                commission_total: Math.floor((Number(el?.ui_data?.commission_on_single_unit) * Number(el?.ui_data?.quantity)) * 10000) / 10000,

                                in_flash: el?.ui_data?.inFlash,
                            },
                        ],
                    });
                } else {
                    //console.log("else findVendorObj?.vendor_details?.uuid",findVendorObj?.vendor_details?.uuid)
                    findVendorObj.product_arr.push({
                        db_product_obj: el.findProductOBj,
                        db_variant_obj: el.variant_db,
                        db_price_obj: el?.db_price_obj,
                        db_warehouse_obj: el?.db_warehouse_obj,
                        quantity: Number(el?.ui_data?.quantity),
                        is_foc: el?.ui_data?.is_foc || false,
                        amount: Math.trunc((Number(el?.ui_data?.vendor_total_price_pay) * Number(el?.ui_data?.quantity)) * 1000) / 1000,
                        vat_total: Math.floor((Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit)) * 1000) / 1000,
                        discount_total: el?.ui_data?.inFlash == false
                            ? 0
                            : Math.floor(((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)) * 100) / 100,

                        // vat_total: (Number(el?.ui_data?.quantity) * Number(el?.ui_data?.vat_on_single_unit)).toFixed(2),
                        in_flash: el?.ui_data?.inFlash,
                    });

                    findVendorObj.retailer_product_arr.push({
                        db_product_obj: el.findProductOBj,
                        db_variant_obj: el.variant_db,
                        db_price_obj: el?.db_price_obj,
                        db_warehouse_obj: el?.db_warehouse_obj,
                        quantity: el?.ui_data?.quantity,
                        is_foc: el?.ui_data?.is_foc || false,
                        amount: Math.trunc((Number(el?.ui_data?.quantity) * Number(el?.ui_data?.total_pricee_pay)) * 1000) / 1000,
                        vat_total: Math.floor((Number(el?.ui_data?.quantity) *
                            (Number(el?.ui_data?.vat_on_single_unit) + Number(el?.ui_data?.vat_on_commission))) * 1000) / 1000,

                        discount_total: el?.ui_data?.inFlash == false
                            ? 0
                            : Math.floor(((Number(el?.ui_data?.price) - Number(el?.ui_data?.db_price)) * Number(el?.ui_data?.quantity)) * 1000) / 1000,

                        commission_total: Math.floor((Number(el?.ui_data?.commission_on_single_unit) * Number(el?.ui_data?.quantity)) * 1000) / 1000,

                        // commission_total: ((Number(el?.ui_data?.commission_on_single_unit)) * Number(el?.ui_data?.quantity)).toFixed(2),
                        in_flash: el?.ui_data?.inFlash,
                    });
                }
            }

            // res.json({ vendorArr })
            // return

            const newVendorArr = groupByLocationNew(vendorArr);
            // console.log(newVendorArr, "groupByLocationNew------>>>>>>>>>>")

            // res.json({ newVendorArr })
            // return

            let payment_total = 0;
            let total_amount_check = 0

            newVendorArr.forEach((order) => {
                order.additional_commission_rate_for_retailer = 10;
                order.sub_total = 0;
                order.vendor_sub_sub_total = 0;
                order.vendor_vat = 0;
                order.retailer_sub_total = 0;
                order.retailer_sub_sub_total = 0;
                order.retailer_vat = 0;
                order.retailer_commission = 0;
                order.retailer_discount = 0;
                order.foc_vendor_vat = 0
                order.foc_retailer_vat = 0
                for (let product_ele of order.product_arr) {
                    if (product_ele && product_ele?.is_foc == true) {
                        order.foc_vendor_vat += Number(product_ele.vat_total);
                    } else {

                        order.sub_total += Number(product_ele.amount);
                        order.vendor_sub_sub_total += Number(product_ele.amount) - Number(product_ele.vat_total); //+ Number(product_ele.discount_total);
                        order.vendor_vat += Number(product_ele.vat_total);
                    }
                }
                for (let retailer_product_ele of order.retailer_product_arr) {
                    if (retailer_product_ele && retailer_product_ele?.is_foc == true) {
                        order.foc_retailer_vat += Math.trunc(Number(retailer_product_ele.vat_total) * 10000) / 10000;;
                    } else {
                        order.retailer_sub_total += Math.trunc(Number(retailer_product_ele.amount) * 10000) / 10000;

                        order.retailer_sub_sub_total += Number(retailer_product_ele.amount) - Number(retailer_product_ele.vat_total) - Number(retailer_product_ele.commission_total); //+ Number(retailer_product_ele.discount_total)

                        order.retailer_vat += Math.floor(Number(retailer_product_ele.vat_total) * 10000) / 10000;;

                        order.retailer_commission += Number(retailer_product_ele.commission_total);
                        order.retailer_discount += Number(retailer_product_ele.discount_total);
                    }
                }
                if (Number(order.foc_retailer_vat) > 0) {
                    order.retailer_sub_total += Math.trunc(Number(order.foc_retailer_vat) * 10000) / 10000;
                }

                order.sub_total = Math.trunc(Number(order.sub_total) * 100) / 100;
                order.vendor_sub_sub_total = Math.trunc(Number(order.vendor_sub_sub_total) * 100) / 100;

                order.vendor_vat = Math.trunc(Number(order.vendor_vat) * 1000) / 1000;//

                // let approximation_value = 0 //this.customRound(order.retailer_sub_total);
                order.retailer_sub_total = Math.trunc(Number(order.retailer_sub_total) * 10000) / 10000
                let approximation_value = order.retailer_sub_total;
                // order.approximation_margin = Number(approximation_value - order.retailer_sub_total).toFixed(2);
                // order.retailer_sub_total = approximation_value.toFixed(2);

                order.approximation_margin = 0;
                order.retailer_sub_sub_total = Math.trunc(Number(order.retailer_sub_sub_total) * 1000) / 1000;

                order.retailer_vat = Math.trunc(Number(order.retailer_vat) * 1000) / 1000;

                order.retailer_commission = Math.trunc(Number(order.retailer_commission) * 1000) / 1000;
                order.retailer_discount = Math.trunc(Number(order.retailer_discount) * 1000) / 1000;

                vatAndFee = vatAndFee + Number(order.retailer_vat);

                payment_total += approximation_value;
                payment_total = Math.trunc(Number(payment_total) * 1000) / 1000;

                total_amount_check = Number(total_amount_check) + Number(order.retailer_sub_total)

            });
            // res.json({ newVendorArr })
            // return
            let update_obj = {
                product_arr: newVendorArr[0]?.product_arr,
                retailer_product_arr: newVendorArr[0]?.retailer_product_arr,
                sub_total: Math.trunc(Number(newVendorArr[0]?.sub_total) * 100) / 100,
                vendor_sub_sub_total: Math.trunc(Number(newVendorArr[0]?.vendor_sub_sub_total) * 100) / 100,
                vendor_vat: Math.trunc(Number(newVendorArr[0]?.vendor_vat) * 1000) / 1000,
                retailer_sub_total: Math.trunc(Number(newVendorArr[0]?.retailer_sub_total) * 100) / 100,
                retailer_sub_sub_total: Math.trunc(Number(newVendorArr[0]?.retailer_sub_sub_total) * 100) / 100,
                retailer_vat: Math.trunc(Number(newVendorArr[0]?.retailer_vat) * 1000) / 1000,
                retailer_commission: Math.trunc(Number(newVendorArr[0]?.retailer_commission) * 1000) / 1000,
                retailer_discount: Math.trunc(Number(newVendorArr[0]?.retailer_discount) * 1000) / 1000,
                foc_vendor_vat: Math.trunc(Number(newVendorArr[0]?.foc_vendor_vat) * 10000) / 10000,
                foc_retailer_vat: Math.trunc(Number(newVendorArr[0]?.foc_retailer_vat) * 1000) / 1000,
                approximation_margin: Math.trunc(Number(newVendorArr[0]?.approximation_margin) * 1000) / 1000,
            }
            if (order_obj && order_obj?.status == 'orderaccepted') {
                update_obj.status = 'new'
            }

            /***coupon validation */
            let retailer_coupon_obj = order_obj.retailer_discount_obj
            // console.log(update_obj, 'update_obj!!!!', retailer_coupon_obj, "retailer_coupon_objretailer_coupon_obj")

            let retailer_discount_obj = {}

            if (retailer_coupon_obj && retailer_coupon_obj?.couponObj?.id && (Number(retailer_coupon_obj?.couponObj?.min_purchase) <= Number(update_obj?.retailer_sub_sub_total))) {

                // if (Number(retailer_coupon_obj?.couponObj?.min_purchase) > Number(update_obj?.retailer_sub_sub_total)) {
                //   res.locals.statusCode = 400;
                //   res.locals.success = false;
                //   res.locals.message = `Minimum order should be AED ${retailer_coupon_obj?.couponObj?.min_purchase} to avail discount`;
                //   next();
                //   return;
                // }

                let value = 0
                // if (couponObj?.type == 'fixed') {
                value = retailer_coupon_obj?.couponObj?.value
                // } else if (couponObj?.type == 'percentage') {
                //   value = Number(subTotalRetailerAmount) * couponObj?.value / 100
                //   if (Number(value) > Number(couponObj?.amount_limit)) {
                //     value = Number(couponObj?.amount_limit)
                //   }
                // }
                // console.log(value, "valeeeee111")
                // value = Math.trunc(Number(value) * 100) / 100

                payment_total = 0
                total_amount_check = 0
                subtotal = 0
                vatAndFee = 0
                discountFee = 0
                total = 0

                console.log(value, "valeeeee")
                // return

                // console.log(a?.retailer_sub_sub_total, 'a?.retailer_subtotal', value, 'valueee', subTotalRetailerAmount, '###456#')
                let retailer_sub_total = Number(update_obj?.retailer_sub_sub_total) + Number(update_obj?.retailer_commission)
                let share = value

                retailer_discount_obj.share = share
                retailer_discount_obj.couponObj = retailer_coupon_obj?.couponObj
                retailer_discount_obj.retailer_commission = update_obj?.retailer_commission

                console.log(share, 'sharess222')

                let deductSharediscount = Number(retailer_sub_total) - Number(share)
                deductSharediscount = Math.trunc(Number(deductSharediscount) * 10000) / 10000

                retailer_discount_obj.amountAfterDiscount = deductSharediscount
                // console.log(deductSharediscount, 'deductShrediscount')

                let vat = 0
                vat = Number(deductSharediscount) * 5 / 100
                vat = Math.trunc(Number(vat) * 100) / 100

                let retailer_total_value = deductSharediscount + vat

                retailer_total_value = Math.trunc(Number(retailer_total_value) * 10000) / 10000
                retailer_total_value = Number(retailer_total_value) //+ Number(a.retailer_commission)
                retailer_total_value = Math.trunc(Number(retailer_total_value) * 10000) / 10000

                retailer_total_value = Number(retailer_total_value) + Number(update_obj.foc_retailer_vat)
                retailer_total_value = Math.trunc(Number(retailer_total_value) * 1000) / 1000

                // console.log(retailer_total_value, 'retailer_total_valueretailer_total_value')

                // a.retailer_discount = share
                retailer_discount_obj.retailer_sub_total_after_discount = retailer_total_value
                retailer_discount_obj.retailer_sub_sub_total_after_discount = deductSharediscount
                retailer_discount_obj.retailer_vat_after_discount = vat

                let approximation_value = retailer_total_value;
                payment_total += approximation_value;
                payment_total = Math.trunc(Number(payment_total) * 100) / 100;

                retailer_discount_obj.payment_total_after_discount = payment_total
                // console.log(payment_total, 'aaaaaaaaaaaaaaaaaaaaaaaaaa')

                total_amount_check = Number(total_amount_check) + Number(retailer_total_value)
                total_amount_check = Math.trunc(Number(total_amount_check) * 100) / 100
                retailer_discount_obj.total_amount_check_after_discount = total_amount_check

                // a.retailer_discount_obj = retailer_discount_obj

                //********************************************************************* */
                // subtotal = Number(subtotal) + Number(deductSharediscount)
                // subtotal = Math.trunc(Number(subtotal) * 1000) / 1000

                // vatAndFee = Number(vatAndFee) + Number(vat)
                // vatAndFee = Math.trunc(Number(vatAndFee) * 1000) / 1000


                // discountFee = Number(discountFee) + Number(share)
                // discountFee = Math.trunc(Number(discountFee) * 1000) / 1000

                // total = Number(total) + Number(retailer_total_value)
                // total = Math.trunc(Number(total) * 1000) / 1000


                console.log(value, "valee2222")
            }

            if (retailer_discount_obj?.couponObj?.id) {
                update_obj.retailer_discount_obj = retailer_discount_obj
            }

            console.log(Number(retailer_coupon_obj?.couponObj?.min_purchase), '22', Number(update_obj?.retailer_sub_sub_total))

            if (Number(retailer_coupon_obj?.couponObj?.min_purchase) > Number(update_obj?.retailer_sub_sub_total)) {
                update_obj.retailer_discount_obj = {}
                // res.locals.statusCode = 400;
                // res.locals.success = false;
                // res.locals.message = `Minimum order should be AED ${retailer_coupon_obj?.couponObj?.min_purchase} to avail discount`;
                // next();
                // return;
            }
            // res.json({ update_obj, newVendorArr })
            // return
            /**-------------------------------Credit Amount Validation-------------------------------------------- */

            let user_details = await UserDetailsModel.findOne({ where: { user_id: req?.userData?.uuid }, attributes: ["credit_amount"] });
            let SM_credit = parseFloat(user_details?.credit_amount).toFixed(2);

            if (payment_method == "goods_on_credit" || payment_method == "goods on credit") {

                if (!user_details?.credit_amount || Number(user_details.credit_amount) < Number(payment_total)) {
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Insufficient credit balance to place the order.`;
                    next();
                    return;
                } else {
                    SM_credit = parseFloat(SM_credit - Number(payment_total)).toFixed(2);
                }
            }

            /**-------------------------------Credit Amount Validation-------------------------------------------- */

            if (payment_method == 'bill_to_bill') {

                let findcreditAmount = await UserDetailsModel?.findOne({ where: { user_id: req.userData?.uuid }, raw: true, attributes: ['uuid', 'user_id', 'credit_amount'] })

                if (findcreditAmount && findcreditAmount?.credit_amount && Number(findcreditAmount?.credit_amount) < Number(total_amount_check)) {
                    // console.log(req.userData.uuid,'req bofill bo',total_amount_check,findcreditAmount?.credit_amount,'findcreditAmount?.credit_amount')
                    res.locals.statusCode = 400;
                    res.locals.success = false;
                    res.locals.message = `Insufficient credit balance to edit the order...`;
                    next();
                    return;
                }
            }

            // res.json({ update_obj, retailer_discount_obj: order_obj.retailer_discount_obj });
            // return
            let order_result = await OrderModel.update(update_obj, { where: { uuid: order_id } });
            res.status(200).json({ message: "Order edit success", statusCode: 200, success: true })
            // return
            // let order_uuids = [];
            // for (let item of order_result) {
            //   order_uuids.push(item.uuid);
            // }
            // console.log(req.userData.user_type,"lll",order_obj?.user_id, "order_obj?.user_idorder_obj?.user_id")
            await CartModel?.destroy({ where: { user_id: order_obj?.user_id } })
            // if (req.userData.user_type == 'retailer') {
            try {

                const keyPatterns = [`${REDIS_KEY.CART}:${req?.userData?.uuid}*`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }
            // }
            //console.log("payment_method", payment_method);
            /* res.json({ payment_url, newVendorArr });
            //console.log(orderBill, "orderBill--->>>>")
            return; */


            /**************************revert quantity to db  **************************************************/
            //db_data_fetch
            let db_product_arr = order_obj?.product_arr?.map((a) => ({
                uuid: a?.db_variant_obj?.uuid,
                id: a?.db_variant_obj?.id,
                quantity: a.quantity,
                does_variant_same: a?.db_variant_obj?.does_variant_same,
                product_id: a?.db_variant_obj?.product_id,
                warehouse_id: a?.db_warehouse_obj?.id,
            })) || []

            let p_linking = []

            //  console.log(db_product_arr, '#$db_product_arr!@')
            let revert_data_p = [...new Set(db_product_arr?.map(a => a?.product_id))]
            // console.log(revert_data_p, 'revert_data_prevert_data_p')

            //fetch varaiant db data 
            let revert_price_v = await ProductVariantModel?.findAll({ where: { product_id: revert_data_p, }, raw: true, attributes: ['id', 'does_variant_same', 'product_id', 'warehouse_arr', 'uuid', 'add_variant'] })

            console.log(revert_price_v, "revert_price_vrevert_price_v")
            // console.log(db_product_arr,"db_product_arrdb_product_arrdb_product_arr")

            for (let le of revert_price_v) {

                let findp = db_product_arr?.filter((a) => a?.product_id == le.product_id)

                let amoun_total = findp?.reduce((a, b) => Number(a) + Number(b?.quantity), 0)
                let warehouse_id_of = findp[0]?.warehouse_id

                // let quantity_of = findp[0]?.quantity

                if (findp && findp[0]?.does_variant_same == 1) {
                    // console.log(findp, "ffindpfindp")
                    // console.log(le, "elelelel")
                    le?.warehouse_arr?.forEach((v) => {
                        if (v?.id == warehouse_id_of) {
                            v.quantity = Number(v?.quantity) + Number(amoun_total)
                        }
                    })
                    // console.log(le, "lelel elel elelele")
                    await ProductVariantModel?.update({ warehouse_arr: le?.warehouse_arr }, { where: { id: le.id } })
                    // console.log(le,"@@@@@@@")
                } else {
                    // console.log(le, "lelel$$$$$$4lele", db_product_arr)
                    let findv = db_product_arr?.find((a) => a?.uuid == le.uuid)
                    // console.log(findv, 'findvfindvfindv')

                    if (findv) {
                        le?.warehouse_arr?.forEach((v) => {
                            if (v?.id == findv.warehouse_id) {
                                v.quantity = Number(v?.quantity) + Number(findv.quantity)
                            }
                        })
                        // console.log(le, "lelel elel !!!!!!")
                        if (le.add_variant == 1) {
                            p_linking.push(le)
                        } else {

                            await ProductVariantModel?.update({ warehouse_arr: le?.warehouse_arr }, { where: { id: le.id } })
                        }
                    }
                }
            }

            //////////PRODUCT LINKING QUANTIY REVERT******************************************************************
            if (p_linking && p_linking?.length > 0) {

                await revert_quantity(p_linking, simplrProductArr, db_product_arr)
            }
            //...........................................................................
            // return
            /*****************************revert quantity to db  ************************************************/
            // if (order_obj?.payment_method != "advance_pay") {
            let fetchVarianWarehouseData = newVendorArr
                ?.map((a) => a?.product_arr)
                .flat()
                .map((a) => ({
                    uuid: a?.db_variant_obj?.uuid,
                    warehouse_id: a?.db_warehouse_obj?.warehouse_id,
                    quantity: a?.quantity,
                    in_flash: a?.in_flash
                }))
                .filter((a) => a.uuid && a.warehouse_id && a.quantity !== undefined);
            // console.log(fetchVarianWarehouseData, 'fetchVarianWarehouseDatafetchVarianWarehouseData')
            // return

            let tempVariantData = await ProductVariantModel.findAll({
                where: { uuid: variantKey },
                raw: true,
                attributes: {
                    exclude: ['packaging_type', 'packaging_type_ar', 'input_field',]
                }
            });

            let vendorIds = tempVariantData.map(a => a.created_by)
            let vendorData = await User.findAll({ where: { uuid: vendorIds }, raw: true })

            let tempObjVariantSame = []
            let p_linking1 = []

            for (let le of fetchVarianWarehouseData) {
                let findVariant = tempVariantData.find((a) => a?.uuid == le.uuid)
                if (findVariant && findVariant?.does_variant_same == 1) {
                    tempObjVariantSame.push({ ...le, product_id: findVariant?.product_id, does_variant_same: findVariant?.does_variant_same })
                }
                // console.log(findVariant?.warehouse_arr,"variant--->>>",le)
                if (findVariant) {
                    findVariant?.warehouse_arr?.forEach((ab) => {
                        if (ab?.id == le.warehouse_id) {
                            ab.quantity = Number(ab.quantity) - Number(le.quantity);
                            if (Number(ab.quantity) < 1) {
                                ab.quantity = 0
                            }
                            let wareHouse = findWArhouseDb.find((b) => b?.uuid == le.warehouse_id)

                            let findVendor = vendorData.find((a) => a?.uuid == findVariant.created_by)
                            if (ab.quantity == 0) {
                                let op = "Finished"
                                //  console.log(findVendor,'findVendfindVendorariant')

                                sendWarehouseQuantityEmail(findVariant, op, wareHouse, findVendor);
                            } else if (ab.quantity < Number(findVariant?.minimum_order_quantity)) {
                                let op = "Less";
                                sendWarehouseQuantityEmail(findVariant, op, wareHouse, findVendor);
                            }
                        }
                    });

                    //for flash sale quantity deduction
                    if (le?.in_flash == true) {
                        let flashObj = {
                            quantity: sequelize.literal(`quantity - ${le?.quantity}`),
                            sold_quantity: sequelize.literal(`sold_quantity + ${le?.quantity}`)
                        };
                        let updateQuantity = await FlashSalesModel.update(flashObj, { where: { variant_id: le?.uuid } });
                    }
                }
                //   console.log(findVariant.warehouse_arr, "findVariantfindVariant", "le")
                // return
                if (findVariant && findVariant?.does_variant_same == 0) {
                    if (findVariant && findVariant?.add_variant == 1) {
                        p_linking1.push(findVariant)

                    } else {
                        await ProductVariantModel?.update(
                            { warehouse_arr: findVariant?.warehouse_arr },
                            { where: { uuid: le?.uuid } }
                        );
                    }
                }
            }

            //product linking functionality         
            if (p_linking1 && p_linking1?.length > 0) {
                // console.log(p_linking, 'p_linkingp_linkingp_linking')
                await deduct_quantity(p_linking1, simplrProductArr, order_detail)


            }
            //  console.log(tempObjVariantSame, 'tempObjVariantSame')
            /*********************MINUS QUANTITY FROM WAREHOUSE************** */
            let stockdeductarr = {}
            for (let el of tempObjVariantSame) {
                if (stockdeductarr[el.product_id]) {
                    stockdeductarr[el.product_id] = Number(stockdeductarr[el.product_id]) + Number(el?.quantity)
                } else {
                    stockdeductarr[el.product_id] = Number(el.quantity)
                }
            }
            // console.log(stockdeductarr,'stockdeductarrWQWQWQ')
            //  return
            // /***************does variant same functionality */
            let product_ids = tempObjVariantSame?.map((a) => a?.product_id)
            // let not_includes_variantid = tempObjVariantSame?.map((a) => a?.uuid)

            let fetchSameVariant = await ProductVariantModel.findAll({
                where: {
                    does_variant_same: 1,
                    product_id: { [Op.in]: product_ids }, // Matches product_id in the array
                    // uuid: { [Op.notIn]: not_includes_variantid }, // Excludes uuid in the array
                    status: 'active',
                    status_by_super_admin: 1,
                    approve_by_super_admin: 1
                },
                raw: true, attributes: ['uuid', 'product_id', 'warehouse_arr', 'does_variant_same', 'status', 'status_by_super_admin', 'approve_by_super_admin']
            });
            //console.log(fetchSameVariant,'fetchSameVariantfetchSameVariant')
            // return 
            for (let el of fetchSameVariant) {
                let warehouseArr = el.warehouse_arr;
                let find1 = tempObjVariantSame?.find((a) => a?.product_id == el.product_id)
                if (find1 && stockdeductarr[el.product_id]) {
                    let tempware = warehouseArr?.map((ab) => {
                        if (ab?.id == find1.warehouse_id) {
                            ab.quantity = Number(ab.quantity) - stockdeductarr[el.product_id]
                            if (Number(ab.quantity) < 1) {
                                ab.quantity = 0
                            }
                        }
                        return ab
                    });
                    // console.log(tempware,"tempppppppp")
                    await ProductVariantModel?.update(
                        { warehouse_arr: tempware },
                        { where: { uuid: el?.uuid } }
                    );
                }
            }
            // console.log(fetchSameVariant,'fetchSameVariantfetchSameVariant')
            // return
            // }
            let io = req.app.get("io");
            //------email and notification send to vendor and retailer------
            // console.log("newVendorArr.length", newVendorArr.length)


            let retailerDatafetch = {}
            // if (req.userData.user_type == USERS.VENDOR) {
            //   retailerDatafetch = await UserModel?.findOne({ where: { uuid: retailer_id }, raw: true, attributes: ['uuid', 'company_name', 'user_type', 'name', 'email', 'company_address', 'assign_to', 'phone'] })
            // } else
            // if (req.userData && req.userData.employee_obj?.uuid && req.userData.employee_obj?.user_type == USERS.EMPLOYEE&&req.userData?.userDetails?.uuid) {
            //   retailerDatafetch = await UserModel?.findOne({ where: { uuid: req.userData?.userDetails?.uuid }, raw: true, attributes: ['uuid', 'company_name', 'user_type', 'name', 'email', 'company_address', 'assign_to', 'phone'] })
            // } else {
            retailerDatafetch = await UserModel?.findOne({ where: { uuid: order_obj?.user_id }, raw: true, attributes: ['uuid', 'company_name', 'user_type', 'name', 'email', 'company_address', 'assign_to', 'phone'] })
            // }


            //fetch assigned employee
            let sales_employee = {}
            if (retailerDatafetch && retailerDatafetch?.assign_to) {
                sales_employee = await UserModel?.findOne({ where: { uuid: retailerDatafetch?.assign_to }, raw: true, attributes: ['uuid', 'id', 'name', 'assign_to', 'phone', 'role', 'user_type'] })
            }

            //fetch supervisor 
            let fetch_supervisor = {}
            if (sales_employee && sales_employee?.assign_to) {
                fetch_supervisor = await UserModel?.findOne({ where: { uuid: sales_employee?.assign_to }, raw: true, attributes: ['phone', 'uuid', 'name', 'role', 'user_type'] })
            }

            for (const generatedOrder of newVendorArr) {
                generatedOrder.order_id = order_id
                let orderData = await OrderModel.findOne({
                    where: { order_id: generatedOrder.order_id },
                    raw: true,
                });

                //let retailerEmail = await getEmailById(orderData.user_id); //get email by id
                let retailerData = await getUserDataById(orderData.user_id); //get user data by id
                // console.log("retailerEmaillllll:", retailerData);
                let ProdImage;
                let ProdName = [];
                let BrandName = [];
                for (let el of orderData?.product_arr) {
                    //console.log('productImagee>>>>',el.db_product_obj.product_images);
                    //console.log('varientImageeee>>>>>',el.db_variant_obj.images);
                    ProdImage = el.db_product_obj.product_images[0] || '';
                    ProdName.push(el.db_variant_obj.title);
                    BrandName.push(el.db_product_obj.brand_id);
                }
                // console.log(order_obj?.payment_method,'order_obj?.payment_methodorder_obj?.payment_method')
                if (order_obj?.payment_method == 'against_delivery' || order_obj?.payment_method == 'Against Delivery' || order_obj?.payment_method == "goods_on_credit" || order_obj?.payment_method == "goods on credit" || order_obj?.payment_method == 'bill_to_bill') {
                    await orderReceivedAndSendEmailToVendor(orderData, generatedOrder.order_id);// order received email send to vendor + send pdf without comission price
                    await orderDetailsSendEmailToRetailer(retailerData, orderData, generatedOrder.order_id); //send order invoice to retailer
                    // return
                    //For send notification start
                    //console.log("orderData>>>>>>>", orderData)

                    //const prodNameString = ProdName.join(', ');
                    // console.log('prodNameString','prodNameString');
                    //const brandNameString = BrandName.join(', ');
                    //console.log('brandNameString',brandNameString);

                    const orderDate = orderData?.order_date.toISOString().split('T')[0];
                    let notiObj = {
                        notification_type: 'order-placed',
                        uuId: String(orderData?.uuid),
                        orderId: String(orderData?.order_id),
                        orderDate: String(orderDate),
                        subTotal: String(orderData?.retailer_sub_sub_total),
                        vat_fee: String(orderData?.retailer_vat),
                        discount: String(orderData?.retailer_discount),
                        total: String(orderData?.retailer_sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }
                    let payload = {
                        notification: {
                            title: 'Your order is successfully placed',
                            body: `Order ID is ${generatedOrder?.order_id}`,
                        },
                        data: notiObj
                    }
                    let notiJson = JSON.stringify(payload);
                    //console.log('retailertoken>>>>',req.userData.deviceToken); 
                    // if (req?.userData && req?.userData?.deviceToken) {
                    //   const notificationCount = await NotificationDataModel.count({
                    //     where: { receiverId: req.userData.uuid, status: 0 },
                    //   });
                    //   console.log('Unread Notification Count::::', notificationCount);
                    //   sendNotification(req.userData.deviceToken, payload, notificationCount)
                    //   let idr = uuidv4();
                    //   idr = idr.replace(/-/g, "");
                    //   NotificationDataModel.create({ uuid: idr, receiverId: req.userData.uuid, subject: notiObj.notification_type, body: notiJson })
                    // }
                    // return
                    let notiObjForVendor = {
                        notification_type: 'order-received',
                        uuId: String(orderData?.uuid),
                        orderId: String(orderData?.order_id),
                        orderDate: String(orderDate),
                        warehouseAddress: String(orderData?.warehouse_address),
                        total: String(orderData?.sub_total),
                        image: String(ProdImage),
                        product_name: String(ProdName),
                        brand_name: String(BrandName),
                    }
                    let payloadForVendor = {
                        notification: {
                            title: 'New order is placed by SupplyMatch',
                            body: `Order ID is ${generatedOrder.order_id}`,
                        },
                        data: notiObjForVendor
                    }
                    //console.log('vendortoken>>>>',generatedOrder.vendor_details.deviceToken);
                    let notiJsonVendor = JSON.stringify(payloadForVendor);
                    if (generatedOrder?.vendor_details?.deviceToken) {
                        const notificationCount = await NotificationDataModel.count({
                            where: { receiverId: generatedOrder?.vendor_details?.uuid, status: 0 },
                        });
                        sendNotification(generatedOrder?.vendor_details?.deviceToken, payloadForVendor, notificationCount)
                        let idv = uuidv4();
                        idv = idv.replace(/-/g, "");
                        NotificationDataModel.create({ uuid: idv, receiverId: generatedOrder?.vendor_details?.uuid, subject: notiObjForVendor.notification_type, body: notiJsonVendor })
                    }

                    //For send notification end


                    ///send whatsapp notification to assigned sales employee 
                    let orderObj = {
                        msgOne: ` ${sales_employee?.name}.`,
                        msgTwo: `${retailerDatafetch?.company_name}`,
                        msgThree: `${generatedOrder?.order_id}`,
                        msgFour: orderData?.warehouse_address,
                        msgFive: ` ${retailerDatafetch?.company_address}`,
                        msgSix: `${orderData?.retailer_sub_total}`,
                    };
                    let send_obj = {
                        WhatsAppmsg_template: environmentVars.NEW_ORDER_GENERATE_NOTIFICATION_EMP,
                        to: sales_employee?.phone,
                        data: orderObj
                    }
                    if (orderData && orderData?.vendor_details?.auto_accept_order == 1) {

                        let usersData = [sales_employee, fetch_supervisor]

                        // console.log(usersData, "userata--usera--useData")
                        await sendNotificationToLogistic(orderData, usersData);
                    } else {

                        if (sales_employee && sales_employee?.phone) {
                            console.log(send_obj, 'snd_obj assigned sales em[loyee')
                            await send_whatsApp_noti_assigned_employee(send_obj); //send message
                        }

                        ///send whatsapp notification to assigned sales employee  ////////////////and assigned supervisor
                        orderObj.msgOne = ` ${fetch_supervisor?.name}.`
                        send_obj.to = fetch_supervisor?.phone
                        if (fetch_supervisor && fetch_supervisor?.name) {
                            console.log(send_obj, 'send_objsend supervisor emp')
                            await send_whatsApp_noti_assigned_employee(send_obj); //send message
                        }
                    }

                }
                //Run scheduleOrderCheckAfterThreeMinutes
                //   Order_notifyToEmployees(generatedOrder.order_id); // employee 
                // return
                // scheduleOrderCheckAfterThreeMinutes_notifyToEmployees(generatedOrder.order_id); // run Scheduler

                //Run scheduleOrderCheckAfterEightMinutes
                // scheduleOrderCheckAfterEightMinutes_notifyToAdmin(generatedOrder.order_id); // run Scheduler

                //Run scheduleOrderCheckAfterOneMinutes
                // scheduleOrderEveryOneMinutes_notifyToVendor(generatedOrder.order_id); //run Scheduler
                if (order_obj?.payment_method != "advance_pay") {
                    /**-------------------------------socket io-------------------------------------- */
                    let super_admin_data = await UserModel.findAll({
                        where: {
                            user_type: 'super_admin',
                            account_status: 'activated', // account_status should be 'activated'
                            is_deleted: 0
                        },
                        raw: true,
                        attributes: ["uuid"],
                    });


                    let admin_ids = await super_admin_data?.map((a) => a.uuid);
                    if (admin_ids && admin_ids.length > 0) {
                        admin_ids.forEach((admin_id) => {
                            let message = `New order received: ${generatedOrder.order_id}`
                            const socketId = io?.userSocketMap?.get(admin_id);
                            console.log("new-order socketId", socketId)
                            io.to(socketId).emit('new-order', {
                                message,
                                type: "order",
                                data: {
                                    order_id: generatedOrder.order_id,
                                    image: String(ProdImage),
                                    product_name: String(ProdName),
                                    brand_name: String(BrandName),
                                    order_status: generatedOrder.status,
                                    payment_status: generatedOrder.payment_status,
                                    delivery_date: generatedOrder.delivery_date,
                                    retailer_sub_total: generatedOrder.retailer_sub_total,
                                    sub_total: generatedOrder.sub_total,
                                    retailer_details: { id: req.userData?.uuid, name: req.userData?.name },
                                    vendor_details: { id: generatedOrder.vendor_details?.uuid, name: generatedOrder.vendor_details?.name }
                                }
                            }); //.to(admin_ids)
                        });

                    }
                    await this.sendSocketEvent(io, generatedOrder?.order_id);

                    /**-------------------------------socket io-------------------------------------- */
                }
            }

            /**-------------------------------Credit Amount Calculation-------------------------------------------- */
            // if (payment_method == "goods_on_credit" || payment_method == "goods on credit") {
            //   const timestamp = Date.now();
            //   let uuid = timestamp + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
            //   await UserDetailsModel.update({ 'credit_amount': SM_credit }, { where: { user_id: req.userData.uuid } });
            //   let transaction_data = {
            //     uuid,
            //     user_id: req?.userData?.uuid,
            //     order_id: order_uuids,
            //     amount: payment_total,
            //     transaction_type: "Debit",
            //   }
            //   await UserCreditTransactionModel.create(transaction_data);
            //   let doc_image_url;
            //   if (doc_image && Object.keys(doc_image).length > 0) {
            //     let image_name = `${Date.now()}_${doc_image?.name}`;
            //     let userid = req.userData.user_type == 'vendor' ? retailer_id : req?.userData?.uuid
            //     const docImagePhotoKey = `retailer/${userid}/goods_credit_cheque/${image_name}`;
            //     doc_image_url = `https://${bucketName}.s3.${region}.amazonaws.com/${docImagePhotoKey}`;
            //     await uploadBase64ImageToS3(doc_image?.uri, doc_image?.name, doc_image?.type, 'user');
            //   }

            //   const timestamp2 = Date.now();
            //   let cheque_uuid = timestamp2 + uuidv4()?.replace(/-/g, "")?.slice(0, 19)?.toString();
            //   let credit_data = {
            //     uuid: cheque_uuid,
            //     user_id: req?.userData?.uuid,
            //     order_id: order_uuids,
            //     amount: payment_total,
            //     bank_name,
            //     cheque_no,
            //     pay_date,
            //     doc_image: doc_image_url,
            //     status: "order_created",
            //   }
            //   await GoodsOnCreditModel.create(credit_data);
            // }
            /**----------------------------Credit Amount Calculation-------------------------------------------- */


            /**------------------------redis data----------------------------------------*/
            try {

                const keyPatterns = [`${REDIS_KEY.ORDER}*`, `${REDIS_KEY.NOTIFICATION}`, `${REDIS_KEY.FLASHSALES}`, `${REDIS_KEY.PRODUCT}`];
                for (const pattern of keyPatterns) {
                    const keys = await redis.keys(pattern);
                    if (keys?.length) {
                        await redis.del(...keys);
                    }
                }
            } catch (error) {
                console.error('Error while clearing Redis keys:', error);
            }


        } catch (err) {
            console.log(err, "error in order create api");
            return
            // res
            //   .status(500)
            //   .json({ message: err?.message, success: false, statusCode: 500 });
        }
    }

    async accepted_order_cancel(req, res) {
        try {
            let { order_id, status } = req.body
            //  console.log(req.body, 'req.body,req.body,req.body,')
            let get = await OrderModel?.findOne({ where: { uuid: order_id }, raw: true })

            let variant_obj_recover = []
            if (!get) {
                return res.status(400).json({ message: "Order not found", statusCode: 400, success: false })
            } else if (get && get?.status == ORDER_STATUS.CANCELLED) {
                return res.status(400).json({ message: "Order already cancelled", statusCode: 400, success: false })
            } else if (get && (get?.status == ORDER_STATUS.COMPLETED || get?.status == ORDER_STATUS.DELIVERED)) {
                return res.status(400).json({ message: "Order already completed or delivered", statusCode: 400, success: false })
            }
            else if (get?.payment_method == ORDER_STATUS.GOODS_ON_CREDIT && Number(get?.collect_money) > 0) {
                return res.status(400).json({ message: `Order cannot be edited, Already taken some amount AED ${order_obj?.collect_money}`, statusCode: 400, success: false })

            }
            // else if (get && get?.status != ORDER_STATUS.ORDERACCEPTED) {
            //   return res.status(400).json({ message: "Only Accepted Order will be cancellable", statusCode: 400, success: false })
            // }

            for (let el of get?.product_arr) {
                let temp = {
                    uuid: el?.db_variant_obj?.uuid,
                    warehouse_id: el?.db_warehouse_obj?.id,
                    quantity: el?.quantity,
                    product_id: el.db_product_obj?.uuid,
                    is_foc: el?.is_foc || false
                }
                variant_obj_recover.push(temp)
            }
            // variant_obj_recover=[]
            // variant_obj_recover.push({ uuid: "1738336336620faa979809bd0466ba6f", warehouse_id: "22320183200185fb563df730d4c359e1", quantity: 5, product_id: "17383363365932e879d8b98ff4bcb9e0" },{ uuid: "17383363366209e7ba90e3ea2422ea36", warehouse_id: "22320183200185fb563df730d4c359e1", quantity: 5, product_id: "17383363365932e879d8b98ff4bcb9e0" })
            console.log(variant_obj_recover, 'variant_obj_recover')

            /*****************whenvendor ccancel orderthan quantity will be added to warehouse as much order has *************/
            let fetchid = variant_obj_recover?.map((a) => a?.uuid)
            // console.log(fetchid, 'fetchidfetchidfetchidfetchid')
            // return

            let vartiantDbfetch = await ProductVariantModel?.findAll({
                where: { uuid: fetchid },
                raw: true,
                attributes: ['id', 'uuid', 'warehouse_arr', 'does_variant_same', 'product_id', 'add_variant']
            })
            let finddoesVariantsame = vartiantDbfetch?.filter((a) => a?.does_variant_same == 1)
            let nondoesVariantsame = vartiantDbfetch?.filter((a) => a?.does_variant_same == 0)

            let p_linking = []
            let keys = []
            // console.log(finddoesVariantsame, 'finddoesVariantsame@@@@@2')
            // console.log(nondoesVariantsame, 'nondoesVariantsame!!!##')
            // return
            for (let le of variant_obj_recover) {
                let find = nondoesVariantsame?.find((a) => a?.uuid == le.uuid)
                if (find) {
                    let tem_w = find?.warehouse_arr
                    tem_w?.forEach((v) => {
                        if (v?.id == le.warehouse_id) {
                            v.quantity = Number(v.quantity) + Number(le.quantity)
                            if (Number(v.quantity) < 0) {
                                v.quantity = 0
                            }
                        }
                    })
                    keys.push(find?.product_id)

                    if (find && find?.does_variant_same == 0) {
                        if (find && find?.add_variant == 1) {
                            find.warehouse_arr = tem_w
                            p_linking.push(find)

                        } else {

                            // console.log(tem_w, 'tempppppppppppppp', find)
                            await ProductVariantModel?.update({ warehouse_arr: tem_w }, { where: { uuid: find?.uuid } })
                        }
                    }
                }
            }

            ////////PRODUCT LINKING DEDUCT QUANTITY FROM DB ///////////////////////////////////////////////////////////////////////////////////////////////
            if (p_linking && p_linking?.length > 0) {
                let simplrProductArr = await ProductsModels.findAll({
                    where: { uuid: keys, status_by_super_admin: 1, status: "active", is_deleted: 0 },
                    raw: true,
                    attributes: [
                        "id",
                        "uuid",
                        "product_identical",
                        "is_primary",
                        "unit_value",
                    ],
                });

                // console.log(p_linking, 'p_linkingp_linkingp_linking')
                await revert_quantity(p_linking, simplrProductArr, variant_obj_recover)

            }

            // res.json({ finddoesVariantsame, variant_obj_recover })

            finddoesVariantsame?.forEach((a) => {
                let t = variant_obj_recover?.filter((k) => k?.uuid == a?.uuid)
                // console.log(t, 'ttttttttttttttttttt')
                if (t && t?.length) {
                    let tempNum = t?.reduce((a, b) => Number(a) + Number(b.quantity), 0)
                    // console.log(tempNum ,'tempNum tempNum' )
                    a.quantity = Number(tempNum)
                }
            })

            // console.log(finddoesVariantsame, '      finddoesariantsame      finddoesVarantsame')
            // return

            if (finddoesVariantsame && finddoesVariantsame?.length > 0) {
                let ids = finddoesVariantsame?.map((A) => A?.product_id)

                let fetchdoesvariantsame = await ProductVariantModel?.findAll({
                    where: {
                        does_variant_same: 1,
                        product_id: { [Op.in]: ids }, // Matches product_id in the array
                        status: 'active',
                        status_by_super_admin: 1,
                        approve_by_super_admin: 1
                    },
                    raw: true,
                    attributes: ['product_id', 'uuid', 'does_variant_same', 'warehouse_arr']
                })

                let stockdeductarr = {}
                // console.log(finddoesVariantsame, 'finddoesVaantsamefinddoesVaiantsame')
                for (let el of finddoesVariantsame) {
                    if (stockdeductarr[el.product_id]) {
                        stockdeductarr[el.product_id] = Number(stockdeductarr[el.product_id]) + Number(el?.quantity)
                    } else {
                        stockdeductarr[el.product_id] = Number(el.quantity)
                    }
                }
                // console.log(stockdeductarr, 'stockdeductarrstockdeductarr')
                // return
                for (let el of fetchdoesvariantsame) {
                    let warehouseArr = el.warehouse_arr;
                    let find1 = finddoesVariantsame?.find((a) => a?.product_id == el.product_id)
                    if (find1 && stockdeductarr[el.product_id]) {
                        let tempware = warehouseArr?.map((ab) => {

                            if (ab.id == get?.warehouse_id) {
                                ab.quantity = Number(ab.quantity) + stockdeductarr[el.product_id];
                                if (Number(ab.quantity) < 1) {
                                    ab.quantity = 0
                                }
                            }
                            return ab
                        });
                        // console.log(tempware, ' tempware tempware')
                        await ProductVariantModel?.update(
                            { warehouse_arr: tempware },
                            { where: { uuid: el?.uuid } }
                        );
                    }
                }
            }
            //***********************************************************add arehouse quantity as much order has*********************** */
            await OrderModel?.update({ status: ORDER_STATUS.CANCELLED }, { where: { uuid: order_id } })
            return res.status(200).json({ message: "Order Cancelled Success", statusCode: 400, success: false })

        } catch (error) {
            console.log(error, "erororoaccepted_order_cancel")
            return res.status(500).json({ message: error?.message, statusCode: 500, sucess: false })
        }
    }


}

const OrderServicesObj = new orderServices();
export default OrderServicesObj;
