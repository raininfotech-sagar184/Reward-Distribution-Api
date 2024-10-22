const { sql_query } = require('../../utils/dbconnect')
const { check_user_login } = require('../../utils/Backend');

const Config = async (req, res) => {

    try {
        let user = await check_user_login(req)
        if (!user.status || !user.data.userId) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        let userData = await sql_query(`select isTwoFa,walletAddress from tbluserDetailOfSolares where userId = ? `, [user.data.userId])
        if (userData) {
            return res.status(200).json({ message: `success`, data: { twoOpen: userData.isTwoFa, walletAddress: userData.walletAddress || "" } });
        }
    } catch (e) {
        return res.status(400).json({ message: "Something went wrong, please refresh the page." });
    }
};

module.exports = Config  