const { sql_query } = require('../../utils/dbconnect')
const { check_user_login, userVoucherMail, sendMembershipVoucherMail } = require('../../utils/Backend')
const { get_timestemp } = require('../../utils/Common')

const Index = async (req, res) => {
    try {
        // const getAllUser = await sql_query("Select * from tbluser", [], "Multi")
        // const time = get_timestemp()
        // for (let u of getAllUser) {
        //     console.log("u: ", u)
        //     await sql_query("Insert into tbluserDetailOfSolares (userId,createdOn,updatedOn) values (?,?,?)", [u.userId,time,time])
        //     await sql_query("Insert into tbluserDetailOfNft21 (userId,btcAddress,bnbAddress,schAddress,nftBxnAddress,euroBalance,kycStatus,totalSols,createdOn,updatedOn) values (?,?,?,?,?,?,?,?,?,?)",
        //         [u.userId,u.btcAddress,u.bnbAddress,u.schAddress,u.nftBxnAddress,u.euroBalance,u.kycStatus,u.totalSols, time, time])
        // }

        await sendMembershipVoucherMail("miyepo8619@sgatra.com", { voucherCode: "0CJK5C", discount: 5, noOfNft: 1, validMonth: 3, hasJokerNFT: false, serialName: "Jocker Serial", })
    } catch (error) {
        console.log("error check user login: ", error)
    }
    return res.status(200).json({ message: 'Service temporarily unavailable' })
}

module.exports = { Index }