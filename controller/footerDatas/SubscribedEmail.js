const { chk_email, get_timestemp, validate_string } = require("../../utils/Common");
const { sql_query } = require("../../utils/dbconnect");

const SubscribedEmail = async (req, res) => {
    let body = await req?.body
    try {
        try {
            validate_string(body.params.email, "email")
            chk_email(body.params.email)
        } catch (e) {
            return res.status(400).json({ message: e })
        }
        let currentTime = get_timestemp()

        let checkIsExist = await sql_query(`SELECT email from tblslr_emailSubscribtionList where email like ?`, [body.params.email])
        if (checkIsExist) {
            return res.status(400).json({ message: "Your email already added." })
        }

        await sql_query("INSERT INTO tblslr_emailSubscribtionList (email,createdOn) VALUES (?,?)", [body.params.email, currentTime])
        return res.status(200).json({ message: "Your email has been added successfully." })
    } catch (e) {
        console.log("error add email subscribe", e)
        return res.status(400).json({ message: "Something went to wrong, Please refresh page." })
    }

}

module.exports = SubscribedEmail

