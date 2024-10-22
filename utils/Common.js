const crypto = require("crypto");
let speakeasy = require("speakeasy");
const fs = require("fs");
const Web3 = require('web3')

function get_timestemp() {
    return Math.floor(new Date().getTime() / 1000);
}

let generateOTP = Math.random().toString().substr(2, 6);

function encryption_key(type) {
    let data = {
        twofaKey: "n90Ayh2IMP9PqhVSAf2A2uEAHeX0rZdM",
        passwordKey: "Ka8muhoHgUhB^G5eR8qq3vgI54^Mccsn",
        otpKey: "Q9NtMb3feYqtD7kkCZRXxdNe2p12H0tG",
        slr_membershipPlanId: "teyP6HrkdTKjjhCyRkDMceBH7AjcKvLj",
        slr_membershipPlanPaymentHistoryId: "zXdwnX6wJvTtny8VriJCKpgF41Sfyxpy",
        admin_private_key: "fN4pU6nGLR6FyTaNwG4d6tXZirnQGkx4",
        userId: "Z7u8NHiR9QKVGFQ1JKBgqTED0Vqp2HxE",
        nft21admPky: "jY6KkNTXOgMvq52wuQZIhsiD1ltLqf3J",
        token: "jY6KkNTXOgMvq52wuQZIhsiD1ltLqf3J",
    };
    return data[type];
}

function enc(textToEncrypt, secret) {
    const iv = secret.substr(0, 16);
    const encryptor = crypto.createCipheriv("aes-256-ctr", secret, iv);
    return encryptor.update(textToEncrypt, "utf8", "base64") + encryptor.final("base64");
}

function dec(encryptedMessage, secret) {
    const iv = secret.substr(0, 16);
    const decryptor = crypto.createDecipheriv("aes-256-ctr", secret, iv);
    return decryptor.update(encryptedMessage, "base64", "utf8") + decryptor.final("utf8");
}

function verify2FaOtp(twoFaCode, otp) {
    let twofa = speakeasy.totp.verify({
        secret: dec(twoFaCode, encryption_key("twofaKey")),
        encoding: "base32",
        token: Number(otp),
    });

    return twofa;
}

function validate_string(data, prefix, type = 0) {
    if (!data) {
        throw (type == 0 ? "Enter " : "Select ") + prefix;
    } else if (typeof data !== "string") {
        throw prefix + " is not valid";
    }
}

function validate_email(str) {
    if (!/^[a-z_0-9]+(\.[a-z0-9]+)*@[a-z0-9]+(\.[a-z0-9]+)*(\.[a-z]{2,3})$/.test(str)) {
        throw "Enter valid email";
    }
}

function chk_email(str) {
    if (!(/^[a-z_0-9]+(\.[a-z0-9]+)*@[a-z0-9]+(\.[a-z0-9]+)*(\.[a-z]{2,3})$/.test(str))) {
        throw "Invalid Email";
    }
}

function chk_confirm_email(str, str1) {
    if (str != str1) {
        throw "Email & confirm email doesn't match"
    }
}


function chk_password(str) {
    if (!(/^\S*(?=\S{8,30})(?=\S*[a-z])(?=\S*[A-Z])(?=\S*[\d])(?=\S*[!\\/\\\\\"#$%&'()*+,-.\\:;<=>?@[\]^_`{|}~])\S*$/.test(str))) {
        throw "Invalid Password";
    }
}

function chk_fullName(str) {
    if (!(/^[a-zA-Z ]{3,}$/.test(str))) {
        throw "Full name contains only alphabet character"
    }
}

function chk_username(a) {
    if (!/^[a-zA-Z0-9]{5,15}$/.test(a)) {
        throw "Username must be contains 5-15 character and number"
    }
}

function passDec(encryptedMessage, secret) {
    var encryptionMethod = "AES-256-CBC";
    var iv = secret.substr(0, 16);
    var decryptor = crypto.createDecipheriv(encryptionMethod, secret, iv);
    return decryptor.update(encryptedMessage, "base64", "utf8") + decryptor.final("utf8");
}

function passEnc(textToEncrypt, secret) {
    var encryptionMethod = "AES-256-CBC";
    var iv = secret.substr(0, 16);
    var encryptor = crypto.createCipheriv(encryptionMethod, secret, iv);
    return encryptor.update(textToEncrypt, "utf8", "base64") + encryptor.final("base64");
}

function chk_password(str) {
    if (!/^\S*(?=\S{8,30})(?=\S*[a-z])(?=\S*[A-Z])(?=\S*[\d])(?=\S*[!\\/\\\\\"#$%&'()*+,-.\\:;<=>?@[\]^_`{|}~])\S*$/.test(str)) {
        throw "Invalid Password";
    }
}

function req_encryption_key() {
    return "Ka8muhoHgUhB^G5eR8qq3vgI54^Mccsn";
}

function generateNumeric(a = 6) {
    if (process.env.ISLOCAL == 'true') {
        return 123456
    }
    const g = "5468791302";
    let r = "";
    for (let i = 0; i < a; i++) {
        r += g.charAt(Math.floor(Math.random() * g.length));
    }
    // return '123456';
    return r;
}
function chk_OTP(str, msg = "") {
    if (!(/^[0-9]{6}$/.test(str))) {
        throw msg ? msg : "Invalid OTP";
    }
}


function to_float(value, precision = 8) {
    return parseFloat(parseFloat(value.toString()).toFixed(precision));
}

function convert_date(date) {
    const moment = require("moment");
    return moment(date * 1000).format("DD, MMM YYYY hh:mm A");
}

function chk_email(str) {
    if (!/^[a-z_0-9]+(\.[a-z0-9]+)*@[a-z0-9]+(\.[a-z0-9]+)*(\.[a-z]{2,3})$/.test(str)) {
        throw "Invalid Email";
    }
}

function chk_confirm_password(pwd, cpwd) {
    if (pwd !== cpwd) {
        throw "Password and Confirm password doesn't match";
    }
}

function validateFilterNumbers(data) {
    if (!Array.isArray(data)) {
        return false;
    }
    for (let d of data) {
        let parsed = parseInt(d, 10);
        if (!Number.isInteger(parsed) || parsed < 0 || d === null) {
            return false;
        }
    }
    return true;
}

function validateNumbers(data) {
    if (!Array.isArray(data)) {
        return false;
    }

    for (let d of data) {
        let parsed = parseInt(d, 10);
        if (!Number.isInteger(parsed) || parsed < 0 || d === null) {
            return false;
        }
    }
    return true;
}

function validateFilterStrings(data) {
    if (!Array.isArray(data)) {
        return false;
    }

    for (let d of data) {
        if (typeof d !== "string" || d.trim() === "") {
            return false;
        }
    }
    return true;
}

async function recaptcha(token) {
    const secret = process.env.SECRET_KEY;
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`, {
        method: "POST",
    });
    const data = await response.json();
    return data.success;
}
function strGenerator(l = 10) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < l; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function USDtoBXN(amount) {
    return 0;
    // let priceData = fs.readFileSync("price.json", "utf8")
    // priceData = JSON.parse(priceData)
    // return priceData && priceData?.BXN ? to_float(amount / priceData?.BXN, 8) : 0
}

async function BXNtoUSD(amount) {
    return 0;
    // let priceData = fs.readFileSync("price.json", "utf8")
    // priceData = JSON.parse(priceData)
    // return priceData && priceData?.BXN ? to_float(amount * priceData?.BXN, 4) : 0
}

function arrayColumn(array, key, value) {
    let data = {}
    for (let a of array) {
        data[a[key]] = a[value]
    }
    return data
}


function validate_input_number_zero_or_one(data, prefix, type = 1) {
    let tag = type == 0 ? 'Enter valid' : 'Select valid'
    if (!data) {
        throw "Select " + prefix;
    }
    else if (!["0", "1"].includes(`${data}`)) {
        throw tag + " " + prefix
    }
}

function validate_filter_numbers(data) {
    for (let dd in data) {
        let d = data[dd]
        if (typeof parseInt(d) !== "number" || parseInt(d) < 0 || d == null) {
            return false
        }
    }
    return true
}
function trunc(string, char = 5) {
    return string.substr(0, char) + '...' + string.substr(-char);
}

function getDecimalDivison(amount, decimal, type) {
    if (decimal == 18) {
        let web3 = new Web3();
        return type == 0 ? web3.utils.toWei(amount.toString(), 'ether') : amount / Number("1e" + 18);
    } else {
        return type == 0 ? amount * Number("1e" + decimal) : amount / Number("1e" + decimal);
    }
}
function getCurrentTimestampinMiliSeconds() {
    return Date.now();
}





module.exports = {
    get_timestemp,
    encryption_key,
    enc,
    dec,
    verify2FaOtp,
    validate_string,
    validate_email,
    passDec,
    passEnc,
    chk_password,
    req_encryption_key,
    generateNumeric,
    chk_OTP,
    chk_email,
    chk_confirm_password,
    to_float,
    convert_date,
    validateFilterNumbers,
    validateNumbers,
    validateFilterStrings,
    recaptcha,
    chk_confirm_email,
    chk_fullName,
    chk_username,
    chk_confirm_password,
    strGenerator,
    USDtoBXN,
    arrayColumn,
    BXNtoUSD,
    validate_input_number_zero_or_one,
    trunc,
    getDecimalDivison,
    validate_filter_numbers,
    getCurrentTimestampinMiliSeconds
};
