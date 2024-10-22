const { sql_query } = require("../../utils/dbconnect");
const { get_timestemp, validate_string, chk_OTP, recaptcha, dec, encryption_key } = require("../../utils/Common");
const { genrate_reffral_code, sendverificationmail } = require("../../utils/Backend");

const Index = async (req, res) => {
    try {
        let body = req.body;

        let checkRepcha = await recaptcha(body.repchaToken);
        if (!checkRepcha) {
            return res.status(400).json({ message: "Something went to wrong" });
        }
        try {
            validate_string(body.otp, "OTP", 0);
            chk_OTP(body.otp);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }

        const emailSession = body.cokTkn ? JSON.parse(dec(body.cokTkn, encryption_key("token"))) : "";
        let email = emailSession ? emailSession.email : ""; 
        if (!email) {
            return res.status(400).json({ email: "invalid" });
        } else {
          
            let getUserData = await sql_query(`SELECT email,userId,isActive,userName,otpCode,otpExpireTime,level,upLine,sponserId,isVarify FROM tbluser WHERE email = ?`, [email]);
            
            if (getUserData) {
                if (!getUserData?.isVarify) {  
                    let currentTime = get_timestemp();
                    if (getUserData.isActive == 2) {
                        return res.status(400).json({ message: "You are blocked." })
                    } else if (body.otp != dec(getUserData.otpCode, encryption_key("otpKey"))) {
                        return res.status(400).json({ message: "Invalid OTP." })
                    } else if (getUserData.otpExpireTime < currentTime) {
                        return res.status(400).json({ message: "This OTP is expired, Please click on resend OTP." })
                    } else {
                        let reffCode = await genrate_reffral_code() 
                        let updatedUpLine = getUserData.upLine === "~" ? `~${getUserData.sponserId}` : `${getUserData.upLine}~${getUserData.sponserId}`;
                        let matrixData = [1, 1,reffCode, getUserData.sponserId, getUserData.level + 1, updatedUpLine, getUserData.userName.toLowerCase() + '@solares', 0, 0, currentTime, getUserData.userId]
                        await sql_query(`UPDATE tbluser SET isActive = ?, isVarify = ?,referralCode = ?,sponserId = ?,level = ?,upLine = ?,upi = ?,otpCode = ?, otpExpireTime = ?, updatedOn = ? WHERE userId = ?`,matrixData, "Update")
                         
                    }
                    return res.status(200).json({ message: "Email verification has been successfully" });

                } else {
                    return res.status(400).json({ email: "You are already verified" });
                }
            } else {
                return res.status(400).json({ email: "invalid" });
            }
        }
    } catch (e) {
        console.log("Error email verification=>", e);
        return res.status(400).json({ message: "Something went wrong, Please refresh page." });
    }
    
}

module.exports = { Index };
