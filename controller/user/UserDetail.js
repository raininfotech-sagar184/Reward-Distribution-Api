const { sql_query } = require('../../utils/dbconnect')
const { check_user_login } = require('../../utils/Backend')

const Details = async (req, res) => {
    console.log("user Details api called")
    try {
        let user = await check_user_login(req)
        if (!user.status || !user.data.userId) {
            return res.status(401).json({ message: 'Unauthorized---' })
        }
        let data = await sql_query("SELECT userName, email, walletBalance FROM tbluser  WHERE userId = ?", [user.data.userId])
        return res.status(200).json({
            data: {
                userName: data.userName,
                email: data.email,
                walletBalance: data.walletBalance
            }
        })
    } catch (error) {
        console.log("error check user login: ", error)
    }
    return res.status(200).json({ message: 'Service temporarily unavailable' })
}

module.exports = { Details }