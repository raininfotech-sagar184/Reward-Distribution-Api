const { sql_query } = require('../../utils/dbconnect')
const { check_user_login, validate_2fa } = require('../../utils/Backend');
const { validate_string, chk_password, passDec, passEnc, encryption_key, get_timestemp, dec, enc, chk_OTP } = require('../../utils/Common');
const { isAddress } = require('web3-validator')
const ChangePassword = async (req, res) => {
    try {
        let body = req.body.params;

        let user = await check_user_login(req)
        if (!user.status || !user.data.userId) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        let { currentPassword, newPassword } = body

        try {
            validate_string(currentPassword, "current password")
            chk_password(currentPassword)
            validate_string(newPassword, "new password")
            chk_password(newPassword)
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }
        let userData = await sql_query("select password from tbluser where userId = ? ", [user.data.userId])

        if (userData && passDec(userData.password, encryption_key("passwordKey")) === currentPassword) {

            const EncryptedPassword = passEnc(newPassword, encryption_key("passwordKey"))
            let now = get_timestemp()
            await sql_query(`update tbluser set password=?, updatedOn=? where userId =? `, [EncryptedPassword, now, user.data.userId])
            return res.status(200).json({ message: "Password changed successfully." });

        } else {
            return res.status(400).json({ message: "Invalid current password." });
        }

    } catch (e) {
        console.log("Error forgot password", e);
        return res.status(400).json({ message: "Something went wrong, please refresh the page." });
    }
};

const SetTwofa = async (req, res) => {
    try {
        let body = req.body.params;
        const { otp, status } = body

        try {
            validate_string(otp, "OTP")
            chk_OTP(otp)
        } catch (e) {
            return res.status(400).json({ message: e });
        }
        let user = await check_user_login(req)
        if (!user.status || !user.data.userId) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        let userData = await sql_query(`select isTwoFa,twoFaCode from tbluserDetailOfSolares where userId = ? `, [user.data.userId])
        if (userData) {
            if (userData?.isTwoFa == 0 && status == 0) {
                return res.status(400).json({ message: "Google authentication already deactivated, please refresh the page." });
            } else if (userData?.isTwoFa == 1 && status == 1) {
                return res.status(400).json({ message: "Google authentication already activated, please refresh the page." });
            }
            let validOTP = await validate_2fa(dec(userData.twoFaCode, encryption_key("twofaKey")), otp)
            if (!validOTP) {
                return res.status(400).json({ message: "Invalid OTP" });
            }
            let twofaCode = userData.isTwoFa == 0 ? userData.twoFaCode : null
            let twoOpen = userData.isTwoFa == 0 ? 1 : 0

            await sql_query(`update tbluserDetailOfSolares set twoFaCode = ?, isTwoFa = ? where userId =?`, [twofaCode, twoOpen, user.data.userId])
            return res.status(200).json({ message: `Google authentication is ${userData.isTwoFa == 0 ? 'activated' : 'deactivated'}.` });
        }

    } catch (e) {
        console.log("Error TwofaSecret", e);
        return res.status(400).json({ message: "Something went wrong, please refresh the page." });
    }
};
const GenerateTwofaSecret = async (req, res) => {
    try {
        const { status } = req.query
        let user = await check_user_login(req)
        if (!user.status || !user.data.userId) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        let userData = await sql_query(`SELECT a.isTwoFa, a.twoFaCode, b.email FROM tbluserDetailOfSolares AS a JOIN tbluser AS b ON a.userId = b.userId WHERE a.userId = ?`, [user.data.userId])
        if (userData) {
            if (userData.isTwoFa == 1) {
                return res.status(400).json({ message: "Google authentication already activated, please refresh the page." });
            } else if (userData.isTwoFa == 0 && status == 0) {
                return res.status(400).json({ message: "Google authentication already deactivated, please refresh the page." });
            }
            let speakeasy = require("speakeasy")
            let qr = require("qrcode")
            let twoFaname = process.env.SITENAME + " (" + userData.email + ")"
            let secret = speakeasy.generateSecret({ name: twoFaname })
            let secretKey = secret.base32
            let qrcode = await qr.toDataURL(secret.otpauth_url)
            await sql_query("update tbluserDetailOfSolares set twoFaCode = ? where userId =?", [enc(secretKey, encryption_key("twofaKey")), user.data.userId])
            return res.status(200).json({ message: `success`, data: { secretKey: secretKey, qrcode: qrcode } });
        }

    } catch (e) {
        console.log("Error TwofaSecret", e);
        return res.status(400).json({ message: "Something went wrong, please refresh the page." });
    }
};

const SetWalletAddress = async (req, res) => {
    try {
        let body = req.body.params;
        const { walletAddress } = body
        try {
            validate_string(walletAddress, "wallet address")
        } catch (e) {
            return res.status(400).json({ message: e });
        }
        if (!isAddress(walletAddress)) {
            return res.status(400).json({ message: "Enter valid address." });
        }
        let user = await check_user_login(req)
        if (!user.status || !user.data.userId) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        let existAddress = await sql_query("SELECT walletAddress FROM tbluserDetailOfSolares WHERE userId = ? ", [user.data.userId])
        if (existAddress.walletAddress) {
            return res.status(400).json({ message: "Wallet address already updated. Please refresh page" });
        }
        let checkWalletExist = await sql_query("SELECT walletAddress FROM tbluserDetailOfSolares WHERE walletAddress = ? ", [walletAddress.toLowerCase()])
        if (checkWalletExist) {
            return res.status(400).json({ message: "Wallet address already exist." });
        }
        await sql_query("UPDATE tbluserDetailOfSolares SET walletAddress = ? WHERE userId=?", [walletAddress.toLowerCase(), user.data.userId])
        return res.status(200).json({ message: "Wallet Address has been updated sucessfully" });
    } catch (e) {
        console.log("Error wallet address", e);
        return res.status(400).json({ message: "Something went wrong, please refresh the page." });
    }
}
module.exports = { ChangePassword, SetTwofa, GenerateTwofaSecret, SetWalletAddress }  