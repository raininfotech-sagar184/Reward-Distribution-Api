const jwt = require("jsonwebtoken");
const { validate_string, chk_email, chk_password, chk_confirm_password, chk_OTP, get_timestemp, passEnc, encryption_key, recaptcha, generateNumeric, enc, dec } = require("../../utils/Common");
const { sql_query } = require("../../utils/dbconnect");
const { forgotPasswordMail, decodeJwtWithPem, resendOtpMail } = require("../../utils/Backend");

const Index = async (req, res) => {
    try {
        let body = req.body; 
        let checkRepcha = await recaptcha(body.repchaToken);
        if (!checkRepcha) {
            return res.status(400).json({ message: "Something went to wrong" });
        }
        try {
            body.email = body.email.toLowerCase().trim();
            validate_string(body.email, "email", 0);
            chk_email(body.email);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }

        const getUser = await sql_query("SELECT email, userId, isVarify FROM tbluser WHERE email = ?", [body.email]);
        if (getUser) {
            const accessTokenMail =  enc(JSON.stringify({email:getUser.email}) , encryption_key('token'))
            if (getUser.isVarify == 0) { 


                return res.status(200).json({ isVarify: 0, accessToken: accessTokenMail, message: "success" });
            } else {
                let forgetCode = generateNumeric(6);
                let currentTime = get_timestemp();
                console.log('temporary mail functionality id off',{otp:forgetCode  })
                await forgotPasswordMail(getUser.email, forgetCode);
                await sql_query(
                    `UPDATE tbluser SET otpCode = ?, otpExpireTime = ?, updatedOn = ? WHERE userId = ?`,
                    [enc(forgetCode.toString(), encryption_key('otpKey')), parseInt(currentTime) + 1800, currentTime, getUser.userId],
                    "Update"
                ); 
                return res.status(200).json({ accessToken: accessTokenMail, message: "OTP has been successfully sent to your email" });
            }
        } else {
            return res.status(400).json({ message: "Entered email is not registered" });
        }
    } catch (e) {
        console.log("Error forgot password", e);
        return res.status(400).json({ message: "Something went wrong, please refresh the page." });
    }
};

const ResetPassword = async (req, res) => {
    try {
        let body = req.body;
        if (!body) {
            return res.status(400).json({ message: "Unauthorized" });
        }

        try {
            validate_string(body.password, "password", 0);
            chk_password(body.password);
            validate_string(body.repassword, "retype password", 0);
            chk_confirm_password(body.password, body.repassword);
            validate_string(body.otp, "OTP", 0);
            chk_OTP(body.otp);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        } 
        let email =   ""; 
        if (dec(body.tkn, encryption_key("token"))) {
            let token=JSON.parse(dec(body.tkn, encryption_key("token")))
            email=token &&token?.email
        } 
        if (!email) {
            return res.status(400).json({ email: "invalid" });
        } else {
            const user = await sql_query("SELECT email, userId, otpCode, otpExpireTime FROM tbluser WHERE email = ?", [email]);
            if (user) {
                let currentTime = get_timestemp();
                console.log("--> ",dec(user.otpCode, encryption_key('otpKey')))
                if (body.otp != dec(user.otpCode, encryption_key('otpKey'))) {
                    return res.status(400).json({ message: "Invalid OTP" });
                }
                if (user.otpExpireTime < currentTime) {
                    return res.status(400).json({ message: "This OTP is expired, Please click on resend OTP" });
                }

                let password = passEnc(body.password, encryption_key("passwordKey"));
                await sql_query(`UPDATE tbluser SET otpCode = ?, otpExpireTime = ?,password = ?,updatedOn = ? WHERE userId = ?`, [0, 0,password, currentTime, user.userId], "Update");
               
                return res.status(200).json({ message: "Your password has been reset successfully" });
            } else {
                return res.status(400).json({ email: "invalid" });
            }
        }
    } catch (e) {
        console.log("Error reset password", e);
        return res.status(400).json({ message: "Something went wrong, Please refresh page." });
    }
};

const ForgotPasswordOtp = async (req, res) => {
    try {
        let body = req.body.params;
        if (!body) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        let checkRepcha = await recaptcha(body.repchaToken);
        if (!checkRepcha) {
            return res.status(400).json({ message: "Something went to wrong" });
        }
        const emailSession = body.cokTkn ? decodeJwtWithPem(body.cokTkn) : "";
        console.log({emailSession});
        let email = emailSession ? emailSession.email : "";
        if (!email) {
            return res.status(400).json({ email: "invalid" });
        } else {
            const user = await sql_query("SELECT u.email, u.userId, ud.otpCode, ud.otpExpireTime FROM tbluser as u ,tbluserDetailOfSolares as ud WHERE u.userId=ud.userId and u.email = ?", [email]);
            if (user) {
                let forgetCode = generateNumeric(6);
                let currentTime = get_timestemp();
                await sql_query(
                    `UPDATE tbluserDetailOfSolares SET otpCode = ?, otpExpireTime = ?, updatedOn = ? WHERE userId = ?`,
                    [enc(forgetCode.toString(), encryption_key("otpKey")), parseInt(currentTime) + 1800, currentTime, user.userId],
                    "Update"
                );
                await resendOtpMail(user.email, forgetCode, "Forgot password");
                return res.status(200).json({ message: "OTP has been successfully sent to your email" });
            } else {
                return res.status(400).json({ email: "invalid" });
            }
        }
    } catch (e) {
        console.log("Error forgot password send otp=>", e);
        return res.status(400).json({ message: "Something went wrong, Please refresh page." });
    };
}

module.exports = { Index, ResetPassword, ForgotPasswordOtp };
