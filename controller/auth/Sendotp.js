const jwt = require("jsonwebtoken");
const { sql_query } = require("../../utils/dbconnect");
const { get_timestemp, generateNumeric, recaptcha, enc, encryption_key, dec } = require("../../utils/Common"); 

const Index = async (req, res) => {
    try {
        let body = req.body; 
        let { repchaToken,email,mlTkn } = body
        let checkRepcha = await recaptcha(repchaToken);
        if (!checkRepcha) {
            return res.status(400).json({ message: "Something went to wrong" });
        } 
        let token = {}
        if (dec(mlTkn, encryption_key("token"))) {
            token = JSON.parse(dec(mlTkn, encryption_key("token")))
        }
        if (!token.email) {
            return res.status(400).json({ email: 'invalid' }); 
        } else {
            const user = await sql_query("SELECT email, userId, otpCode, otpExpireTime FROM tbluser WHERE email = ?", [token.email]);
            console.log({user})
            if (user) {
                let forgetCode = generateNumeric(6);
                let currentTime = get_timestemp();
                console.log('temporary mail functionality id off', { otp: forgetCode })
                await sql_query(
                    `UPDATE tbluser SET otpCode = ?, otpExpireTime = ?, updatedOn = ? WHERE userId = ?`,
                    [enc(forgetCode.toString(), encryption_key("otpKey")), parseInt(currentTime) + 1800, currentTime, user.userId],
                    "Update"
                );
                // await resendOtpMail(user.email, forgetCode, "Forgot password");
                return res.status(200).json({ message: 'OTP has been successfully sent to your email' }); 
            } else {
                return res.status(400).json({message: 'invalid' }); 
            }
        }
    } catch (e) {
        console.log("Error forgot password", e);
        return res.status(400).json({message: 'Internal server error' }); 
    }
};

module.exports = { Index };