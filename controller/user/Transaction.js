const { check_user_login } = require("../../utils/Backend");
const { validate_filter_numbers, validateFilterStrings } = require("../../utils/Common");
const { sql_query } = require("../../utils/dbconnect");

const transactionHistory = async (req, res) => {
    try {
        let user = await check_user_login(req)
        if (!user.status || !user.data.userId) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        const userId = user.data.userId
        const { page, order, orderClm, startDate, endDate, coinType, type, search } = await req.query
        let query = '', filter = [], limit = process.env.LIMIT
        query += `SELECT  coinAmount, coinType, usdAmount,hash, type, details, createdOn FROM tblslr_transaction WHERE userId = ?`
        filter.push(userId)

        const fields = ["createdOn", "coinAmount", "usdAmount", "createdOn"]
        if (validate_filter_numbers([startDate, endDate])) {
            query += ` AND createdOn >= ? AND createdOn <= ?`
            filter.push(startDate)
            filter.push(endDate)
        }
        if (coinType != "" && validate_filter_numbers([coinType])) {
            query += " AND coinType = ?";
            filter.push(coinType)
        }
        if (search !=="" && validateFilterStrings([search])) {
            query += " AND hash like ? ";
            filter.push('%' + search.trim() + '%');
        }
        if (type != "" && validate_filter_numbers([type])) {
            query += " AND type = ?";
            filter.push(type)
        }
        if (validate_filter_numbers([orderClm, order])) {
            query += " order by " + fields[orderClm] + " " + (order == 0 ? 'asc' : 'desc')
        }
        const countData = await sql_query(query, filter, "Count")
        let count = Math.ceil(countData / limit), allData = [], ascNum = page * limit, descNum = countData - page * limit;
        let transactionData = await sql_query(query, filter, "Multi")
        if (transactionData?.length > 0) {
            allData = transactionData?.map((j, k) => {
                return {
                    num: order == 1 ? ++ascNum : descNum--,
                    coinAmount: parseFloat(j.coinAmount),
                    coinType: j.coinType,
                    type: j.type,
                    txhash: j.hash,
                    usdAmount: parseFloat(j.usdAmount),
                    details: j.details || "-",
                    createdOn: j.createdOn,
                }
            })
        }
        res.status(200).send({ data: allData || [], total: count || 0 })
    } catch (e) {
        console.log("Error transactionHistory", e);
        return res.status(400).json({ message: "Something went wrong, please refresh the page." });
    }

}

module.exports={transactionHistory}