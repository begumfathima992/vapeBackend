import brandModel from "../models/brand.model.js";

class Brand {
    async getMainBrand(req, res) {
        try {
            let page = parseInt(req.query.page) || 1
            let limit = parseInt(req.query.limit) || 10
            let offset = (page - 1) * limit

            let fetchAllBrandMain = await brandModel?.findAndCountAll({ where: { parent_id: null }, limit, offset, order: [['id', 'DESC']] })

            res.status(200).json({
                message: "fetch data",
                totalRecord: fetchAllBrandMain.count,
                totalPages: Math.ceil(fetchAllBrandMain.count / limit),
                currentPage: page,
                data: fetchAllBrandMain.rows
            })
            return
        } catch (error) {
            return res.status(500).json({ message: error?.message, statusCode: 500, success: false })
        }
    }
}
const BrandServicesObj = new Brand()
export default BrandServicesObj