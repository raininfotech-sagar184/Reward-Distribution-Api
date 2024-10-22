
const jwt = require("jsonwebtoken");
const { sql_query } = require("../../utils/dbconnect");
const { insert_loginhistory, validate_2fa, encodeJwtWithPem, decodeJwtWithPem } = require("../../utils/Backend");
const { get_timestemp, encryption_key, validate_string, chk_OTP, recaptcha, dec } = require("../../utils/Common");

const Index = async (req, res) => {
    try {
        let body = req.body.params;
        if (!body) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        let checkRepcha = await recaptcha(body.repchaToken);
        if (!checkRepcha) {
            return res.status(400).json({ message: "Something went to wrong" });
        }

        try {
            validate_string(body.otp, "google authentication code", 0);
            chk_OTP(body.otp, "Invalid google authentication code");
        } catch (e) {
            return res.status(400).json({ message: e });
        }
        let user = {};
        const emailSession = body.cokTkn ? decodeJwtWithPem(body.cokTkn) : "";
        let email = emailSession ? emailSession.email : "";
        if (email) {
            user = await sql_query(`SELECT u.userId, u.email,u.password,ud.twoFaCode,ud.userId from tbluser as u,tbluserDetailOfSolares as ud where ud.userId = u.userId and u.email = ?`, [email]);
        }
        if (!user && !user.email) {
            return res.status(400).json({ email: "Invalid User" });
        }
        let validOTP = await validate_2fa(dec(user.twoFaCode, encryption_key("twofaKey")), body.otp);
        if (!validOTP) {
            return res.status(400).json({ message: "Invalid google authentication code" })
        } else {
            const clientIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
            let time = get_timestemp();
            await insert_loginhistory(user.userId, req);
            await sql_query(`UPDATE tbluser SET lastLoginIp = ?,lastLoginDate=? WHERE userId = ?`, [clientIp, time, user.userId], "Update");
            const accessToken = encodeJwtWithPem({ email: user.email, password: user.password });
            return res.status(200).json({ accessToken: accessToken, message: "Login Successfully" });
        }
    } catch (e) {
        console.log("Error 2Fa Verify=>", e.message);
        return res.status(400).json({ message: "Something went to wrong, Please refresh page." });
    }
};

module.exports = { Index };
