const { sql_query } = require('../../utils/dbconnect')
const { check_user_login } = require('../../utils/Backend');
const { validate_string, get_timestemp } = require('../../utils/Common'); 

const ContactUs = async (req, res) => {
    try {
        let body = req.body.params;
        let user = await check_user_login(req)
        if (!user.status || !user.data.userId) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        const { subject,msg } = body 
        
        try {
            validate_string(subject, "subject")
            validate_string(msg, "message")
        } catch (e) {
            return res.status(400).json({ message: e });
        } 

        let currentTime = get_timestemp() 
        await sql_query(`INSERT into tblslr_contactus (message,subject,createdOn) VALUES (?,?,?)`, [msg,subject,currentTime], "Insert")
        return res.status(200).json({ message: "Message has been send successfullly" });
    } catch (e) {
        console.log("Error wallet address", e);
        return res.status(400).json({ message: "Something went wrong, please refresh the page." });
    }
}

module.exports = ContactUs  