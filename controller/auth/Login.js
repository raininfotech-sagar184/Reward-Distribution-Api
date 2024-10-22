const { sql_query } = require("../../utils/dbconnect"); 
const { encryption_key, validate_string, passDec, get_timestemp, recaptcha, chk_password, chk_email, generateNumeric, enc } = require("../../utils/Common");

const Index = async (req, res) => { 
    try {
        const body = req.body;
        if (!body) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        let checkRepcha = await recaptcha(body.repchaToken);
        if (!checkRepcha) {
            console.log("first error")
            return res.status(400).json({ message: "Something went to wrong" });
        }
        try {
            body.email = body.email.toLowerCase().trim();
            validate_string(body.email, "email or username", 0);
            validate_string(body.password, "password", 0);
        } catch (e) {
            return res.status(400).json({ message: e });
        }

        const username = body.email.toLowerCase();
        let q1 = await sql_query("SELECT userId, password, isActive, isVarify,twoFaOpen, twoFaCode, email FROM tbluser WHERE email = ?", [username]);
      
        if (!q1) {
            q1 = await sql_query("SELECT userId, password, isActive, isVarify,twoFaOpen, twoFaCode, email FROM tbluser WHERE userName = ?", [username]);
        }
        if (q1) {
            const email = q1.email;
            const e = email.split("@");

            if (e[1]) {  
                    if (q1.isActive == 2) {
                        return res.status(400).json({ message: "You are blocked. Please contact the admin." });
                    } else if (q1.isVerify == 0) {
                        const accessTokenMail =enc(JSON.stringify({ email: q1.email  }), encryption_key('token'))  
                        return res.status(200).json({ isVerify: 0, accessToken: accessTokenMail });
                    } else if (q1.isActive == 0) {
                        return res.status(400).json({ message: "You are deactivated by admin." });
                    } else if (q1.isActive == 1) {
                        if (body.password == passDec(q1.password, encryption_key("passwordKey"))) {
                            if (q1.twoFaOpen == 1) {
                                const accessToken2fa = enc(JSON.stringify({ email: q1.email  }), encryption_key('token'))  
                                return res.status(200).json({ twoFaOpen: 1, accessToken: accessToken2fa });
                            } else {
                                const accessToken =enc(JSON.stringify({ email: q1.email, password: q1.password }), encryption_key('token'))  
                                console.log({first:accessToken})
                                if (accessToken) {
                                    // let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                    // clientIp = clientIp.replace(',::ffff:127.0.0.1', '');
                                    // let time = get_timestemp();
                                    // await insert_loginhistory(q1.userId, req);
                                    // await sql_query(`UPDATE tbluser SET lastLoginIp = ?,lastLoginDate=? WHERE userId = ?`, [clientIp, time, q1.userId], "Update");
                                    return res.status(200).json({ accessToken: accessToken, message: "Login successfully" });
                                }
                            }
                        } else {
                            return res.status(400).json({ message: "Invalid email or password" });
                        }
                    } else {
                        return res.status(400).json({ message: "Your account is not active, Please contact to admin" });
                    }

                 
            } else {
                return res.status(400).json({ message: "Your email is blocked by the system." });
            }
        }
        return res.status(400).json({ message: "Invalid email or password." });
    } catch (e) {
        console.log("Error login=>", e);
        return res.status(400).json({ message: "Something went to wrong, Please refresh page." });
    }
  
};

module.exports = { Index };
