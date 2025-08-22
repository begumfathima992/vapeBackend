
export const responseHandleMiddleware = async (req, res, next) => {
    try {
        // console.log("req.language", req.language);
        // console.log("res.locals", res.locals);
        if (!req.timedout) {
            //res.status(res.locals.statusCode || 200).json({ ...res.locals });
            res.status(res.locals.statusCode || 200).json({
                statusCode: res.locals.statusCode,
                success: res.locals.success,
                pagination: res.locals.pagination,
                data: res.locals.data,
                extra_data_obj: res.locals.extra_data_obj,
                relatedProduct: res.locals.relatedProduct,
                arr: res.locals.arr,
                totalRecords: res.locals.totalRecords,
                currentPage: res.locals.currentPage,
                totalPages: res.locals.totalPages,
                category_data: res.locals.category_data,
                payLink: res.locals.payLink,
                order_ids: res.locals.order_ids,
                commissionData: res.locals.commissionData,
                order_details: res.locals.order_details,
                removed_foc: res.locals.removed_foc,
                message: res.locals.message
            });

        }
    } catch (error) {
        console.log(error, "re spon handle middleare")
        if (!req.timedout) {
            res.status(500).json(
                {
                    message: 'Internal Server Error',
                    statusCode: 500,
                    succcess: false,
                }
            );
            return
        }
    }
};
