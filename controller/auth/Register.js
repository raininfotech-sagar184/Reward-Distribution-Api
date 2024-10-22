
const jwt = require('jsonwebtoken')
const { sql_query } = require('../../utils/dbconnect')
const { chk_email, chk_password, chk_fullName, chk_username, validate_string, passEnc, encryption_key, chk_confirm_password, get_timestemp, generateNumeric, recaptcha, enc } = require('../../utils/Common')
const { verifyemail, encodeJwtWithPem, genrate_reffral_code } = require('../../utils/Backend')

const CountryList = async (req, res) => {
    try {
        let list = await sql_query(`SELECT md5(countryId) as id,countryName,countryCode from tblslr_country`, [], "Multi")
        return res.status(200).json({ message: "Success", data: list })
    } catch (e) {
        return res.status(400).json({ message: e.message })
    }
}

const SponsorName = async (req, res) => {
    try {
        let data = await checkref_code(req?.query?.refCode)
        if (data[0] == true) {
            return res.status(200).json({ data: { user: data[1].userName } })
        } else {
            return res.status(400).json({ message: data[2] })
        }
    } catch (e) {
        return res.status(400).json({ message: "Something went to wrong, Please refresh page." })
    }
}

const checkref_code = async (refCode) => {
    let res = [false, {}, '']
    try {
        if (refCode) {
            let userData = await sql_query("SELECT userId, isActive FROM tbluser WHERE referralcode= ? ", [refCode]) 
            if ((userData && Object.entries(userData).length)) {
                if (userData['isActive'] == 1) {
                    res[0] = true;
                    res[1] = { userName: userData['username'], userId: userData['userId'] }
                    res[2] = (userData ? 'S' : 'C');

                } else {
                    res[2] = "Your sponsor not activate.";
                }
            } else {
                res[2] = "Invalid referral code.";
            }
        } else {
            res[2] = "Enter referral code.";
        }
        return res;
    } catch (e) {
        console.log('checkref_code', e)
    }
    return res
}

const Index = async (req, res) => {
    let body = req.body 
    try { 
        let checkRepcha = await recaptcha(body.repchaToken);
        if (!checkRepcha) {
            return res.status(400).json({ message: "Something went to wrong" });
        }
        const { id, imageUrl, isImage, username, email, mobile, referralcode, password } = body
        try {
            validate_string(username, "Username")
            chk_username(username)
            validate_string(email, "Email")
            chk_email(email)
            validate_string(mobile, "Mobile")
            if (`${mobile}`.length != 10) {
                throw "Mobile number should be 10 digits."
            }
            validate_string(referralcode, "Referral code")
            validate_string(password, "Password")
            chk_password(password) 
        } catch (e) {
            console.log("Error=>", e);
            return NextResponse.json({ message: e }, { status: 400 })
        }
        let currentTime = get_timestemp() 
        let sponserId = ""

        let getUserData = await sql_query(`SELECT username,email from tbluser where username like ? OR email like ?`, [username, email])
        if (getUserData) { 
            return res.status(400).json({ message: getUserData.email == email ? "Entered email already exist" : "Entered username already exist" })
        } else {
            let rd = [true, {}, ""]
            if (referralcode) {
                rd = await checkref_code(referralcode)
                if (rd[0] == false) {
                    return res.status(400).json({ message: rd[2] })
                } else {
                    if (rd[2] == 'S') {
                        sponserId = rd[1].userId
                    } else {
                        sponserId = 0
                    }
                }
            } 

            let forgetCode = generateNumeric(6);
            console.log('temporary mail functionality id off', { otp: forgetCode })
            const sentMail = true// await forgotPasswordMail(email, forgetCode);   

            const newReferralCode = await genrate_reffral_code()
              await sql_query(`INSERT into tbluser (username,email,mobile,referralcode,password,otpCode,otpExpireTime,sponserId,createdOn) VALUES (?,?,?,?,?,?,?,?,?)`, [username, email, mobile, newReferralCode, passEnc(password, encryption_key("passwordKey")), enc(forgetCode.toString(), encryption_key('otpKey')), parseInt(currentTime) + 1800, sponserId, currentTime], "Insert")
              
              if (sentMail) {
                const accessToken = enc(JSON.stringify({ email: body?.email }), encryption_key('token'))
                return res.status(200).json({ message: "Registration was successful.", accessToken })
            } else {
                return res.status(400).json({ message: "Oops!! Mail service is down. Try again later" });
            } 
         }
    } catch (e) {
        console.log("Error=>", e);
    } 
    return res.status(400).json({ message: "service temporarily unavailable." })
}

module.exports = { CountryList, Index, SponsorName }