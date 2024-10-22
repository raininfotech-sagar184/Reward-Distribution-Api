require('dotenv').config()
const speakeasy = require("speakeasy");

const Mailjet = require('node-mailjet')
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { sql_query } = require('../utils/dbconnect')
const { passDec, encryption_key, get_timestemp, to_float, strGenerator, dec, enc } = require('../utils/Common')
const privateKey = fs.readFileSync('./utils/pem/private.key');
const publicKey = fs.readFileSync('./utils/pem/public.key');
var voucher_codes = require('voucher-code-generator');
const Web3 = require("web3");
const NFT_ABI = require('../smabi/NFT21_NFT_ABI.json');



async function file_get_contents(uri) {
	let res = await fetch(uri)
	let ress = await res.text()
	return ress
}

async function insert_loginhistory(userId, req, userType = 1, isMobile = 0) {
	try {
		const userAgent = req.headers['user-agent'];
		const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

		let browser_array = [{ name: "msie", value: "Internet Explorer" }, { name: "firefox", value: "Firefox" }, { name: "safari", value: "Safari" }, { name: "chrome", value: "Chrome" }, { name: "edge", value: "Edge" }, { name: "opera", value: "Opera" }, { name: "netscape", value: "Netscape" }, { name: "maxthon", value: "Maxthon" }, { name: "konqueror", value: "Konqueror" }, { name: "mobile", value: "Handheld Browser" }]
		let browserName = ""
		browser_array.map((c, k) => {
			if (userAgent.match(c.name) || userAgent.toLowerCase().match(c.name)) {
				browserName = c.value
			}
		})
		let os_array = [{ name: "windows nt 10", value: "Windows 10" }, { name: "windows nt 6.3", value: "Windows 8.1" }, { name: "windows nt 6.2", value: "Windows 8" }, { name: "windows nt 6.1/i", value: "Windows 7" }, { name: "windows nt 6.0", value: "Windows Vista" }, { name: "windows nt 5.2", value: "Windows Server 2003/XP x64" }, { name: "windows nt 5.1", value: "Windows XP" }, { name: "windows xp", value: "Windows XP" }, { name: "windows nt 5.0", value: "Windows 2000" }, { name: "windows me", value: "Windows ME" }, { name: "win98", value: "Windows 98" }, { name: "android", value: "Android" }, { name: "blackberry", value: "BlackBerry" }, { name: "webos", value: "Mobile" }, { name: 'macintosh|mac os x', value: 'Mac OS X' }, { name: 'mac_powerpc', value: 'Mac OS 9' }, { name: 'linux', value: 'Linux' }, { name: 'ubuntu', value: 'Ubuntu' }, { name: 'iphone', value: 'iPhone' }, { name: 'ipod', value: 'iPod' }, { name: 'ipad', value: 'iPad' }]
		let osName = ""
		os_array.map((c) => {
			if (userAgent.match(c.name) || userAgent.toLowerCase().match(c.name)) {
				osName = c.value
			}
		})
		let parentOS = ""
		if (userAgent.indexOf("Win") != -1) {
			parentOS = "Window";
		} else if (userAgent.indexOf("Android") != -1) {
			parentOS = "Android";
		} else if (userAgent.indexOf("Linux") != -1) {
			parentOS = "Linux";
		} else if (userAgent.indexOf("Ubuntu") != -1) {
			parentOS = "Ubuntu";
		} else if (userAgent.indexOf("iphone") != -1 || userAgent.indexOf("ipod") != -1 || userAgent.indexOf("ipad") != -1) {
			parentOS = "IOS";
		} else if (userAgent.indexOf("Blackberry") != -1) {
			parentOS = "Blackberry";
		} else if (userAgent.indexOf("Webos") != -1) {
			parentOS = "Mobile";
		} else if (userAgent.indexOf("Mac") != -1) {
			parentOS = "Mac";
		}
		let location = {}
		let rs = await file_get_contents("http://ip-api.com/json/" + clientIP)
		if (rs) {
			let location_arr = JSON.parse(rs)
			location = {
				city: location_arr.city ? location_arr.city : "",
				regionName: location_arr.regionName ? location_arr.regionName : "",
				country: location_arr.country ? location_arr.country : "",
				lat: location_arr.lat ? location_arr.lat : "",
				lon: location_arr.lon ? location_arr.lon : "",
				timezone: location_arr.timezone ? location_arr.timezone : "",
				zip: location_arr.zip ? location_arr.zip : "",
			}
		}
		let loc = location ? JSON.stringify(location) : {}
		let time = Math.floor(Date.now() / 1000)
		await sql_query("insert into tblslr_loginHistory (userId,userAgent,browserName,clientIP,oSName,parentOS,userType,isMobile,location,regSiteType,loginDate) values (?,?,?,?,?,?,?,?,?,?,?)", [
			userId, userAgent, browserName, clientIP, osName, parentOS, userType, isMobile, loc, 1, time
		])
	} catch (e) {
		console.log('error login history', e);
	}
}

async function send_mail(email, subject, mailData) {

	try {
		mailData = {
			...mailData,
			logo: process.env.FRONT_URL + '/assets/images/logo/logo.png',
			baseUrl: process.env.FRONT_URL,
			image: mailData.image ? process.env.FRONT_URL + '/assets/images/mail/' + mailData.image : '',
			sitename: process.env.SITENAME
		}

		const ejs = require('ejs')
		const template = fs.readFileSync('mail.html', { encoding: 'utf-8' })
		if (process.env.ISLOCAL == "true") {
			console.log("innnn");
			const mailer = require('nodemailer')
			const transporter = mailer.createTransport({
				service: 'gmail',
				auth: {
					user: process.env.EMAIL_USER,
					pass: process.env.EMAIL_PASSWORD,
				},
			})
			const mailOptions = {
				from: process.env.EMAIL_USER,
				to: email,
				subject: subject,
				html: ejs.render(template, mailData),
			}
			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
				} else {
				}
			});
			return true
		} else {
			let data = {
				From: process.env.EMAIL_USER,
				To: email,
				Subject: subject,
				HtmlBody: ejs.render(template, mailData),
				MessageStream: "outbound"
			}
			let mld = await fetch("https://api.postmarkapp.com/email", {
				method: 'POST',
				body: JSON.stringify(data),
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
					'X-Postmark-Server-Token': process.env.EMAIL_PASSWORD
				}
			})
			let mlData = await mld.json()
			console.log("send mail function--", mlData, mlData?.ErrorCode);
			if (mlData?.ErrorCode == 0) {
				return true
			} else {
				return false
			}
		}
	} catch (e) {
		console.log("send mail function--", e);
		return false
	}
}

async function verifyemail(email, otp, st = 0) {
	try {
		let res = await send_mail(email, 'Email Verification', {
			des: `<div>Thank you for taking the time to verify your email address with us. Your security is paramount, and this additional step helps us ensure that your account remains safe and accessible only to you.</div>
			<div style="margin-top: 10px;">To complete the verification process, please enter the OTP (One-Time Password) code provided below:</div>`,
			des1: `<div style="margin-top: 10px;>Once entered, you’ll gain immediate access to your account, where you can continue to enjoy our services with peace of mind. If you haven’t requested this OTP, please contact our support team immediately.</div>
			<div style="margin-top: 10px;">We appreciate your attention to this matter and look forward to continuing to serve you. Should you have any questions or need further assistance, please don't hesitate to reach out</div>`,
			desc1Style: "block",
			title1: "Email Verification",
			title: "Email Verification",
			titleStyle: "block",
			image: "send-otp.png",
			otp: otp,
			otpStyle: 'block'
		})
		return res
	} catch (e) {
	}
	return false
}

async function resendOtpMail(email, otp, title) {
	try {
		let res = await send_mail(email, title, {
			des: `<div>Your request to resend the OTP was successful. Please find the new OTP code below to complete the verification process:</div>`,
			des1: `<div style="margin-top: 10px;">If you did not request a new OTP, please contact our support team immediately.</div>`,
			desc1Style: "block",
			title1: title,
			title: title,
			titleStyle: "block",
			image: "resend-otp.png",
			otp: otp,
			otpStyle: 'block'
		})
		return res
	} catch (e) {
	}
	return false
}

async function sendverificationmail(email) {
	try {
		let res = await send_mail(email, 'Email Verified', {
			des: `<div>We are delighted to inform you that your email address has been successfully verified! This additional step ensures the security of your account and allows us to keep you updated with important information.</div>
			<div style="margin-top: 10px;">You can now fully enjoy all the benefits of our services. Whether you're exploring new features, receiving updates, or managing your account settings, rest assured that your verified email will serve as a secure channel for communication.</div>
			<div style="margin-top: 10px;">Thank you for verifying your email address with us. Should you have any questions or need assistance, feel free to reach out to our support team. We're here to help!</div>`,
			des1: "",
			desc1Style: "none",
			title1: "Email Verified",
			title: "",
			titleStyle: "none",
			image: "verify-email.png",
			otp: "",
			otpStyle: 'none'
		})
		return res
	} catch (e) {
	}
	return false
}

async function forgotPasswordMail(email, otp) {
	try {
		let res = await send_mail(email, 'Forgot password', {
			des: `<span>We understand that occasionally passwords slip our minds. It’s more common than you might think, and we're here to make the process of resetting it as smooth and secure as possible.</span>
			<div style="margin-top: 10px; margin-bottom: 10px;">Your online security is our top priority, and we're committed to ensuring you have easy access to your account whenever you need it.</div>
			<span>Using Below OTP you can reset password.</span>`,
			des1: "",
			desc1Style: "none",
			title1: "Forgot password?",
			title: "",
			titleStyle: "block",
			image: "forgot-password.png",
			otp: otp,
			otpStyle: 'block',

		})
		return res
	} catch (e) {
	}
	return false
}

async function check_user_login(req) {
	console.log('check_user_login')
	try {
		let token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : ''
		console.log({token})
		let userdata =JSON.parse(dec(token, encryption_key('token')))
		console.log({userdata})
		if (userdata.email && userdata.password) {
			let getUserData = await sql_query(`select userId,password,username FROM tbluser WHERE email = ? AND password = ?`, [userdata.email, userdata.password])
			if (getUserData && passDec(userdata.password, encryption_key('passwordKey')) == passDec(getUserData.password, encryption_key('passwordKey'))) {
				return {
					status: true, data: getUserData
				}
			}
		}
	} catch (e) {
		console.log('check_user_login=>', e)
	}
	return { status: false, data: {} }
}

async function genrate_reffral_code() {
	let generatedStr = strGenerator(8)
	const randIndex = Math.floor(Math.random() * 5);
	let cnt = await sql_query(`SELECT userId FROM tbluser`, [], "Count");
	cnt++;
	let refcode = (generatedStr.substr(0, randIndex) + cnt.toString().slice(-3) + generatedStr.substr(randIndex + (cnt.toString().slice(-3)).length)).substr(-6)
	return refcode
}

async function validate_2fa(key, otp) {
	try {
		const status = speakeasy.totp.verify({
			secret: key,
			encoding: "base32",
			token: otp,
		});
		return status;
	} catch (e) {
		console.error("Error validating 2FA:", e);
	}
	return false;
};

function encodeJwtWithPem(param) {
	try {
		return  enc(JSON.stringify(param) , encryption_key('token')) //jwt.sign(param, privateKey, { algorithm: 'RS256' });
	} catch (e) {
		return ''
	}
}

function decodeJwtWithPem(token) { 
	try {
		return  JSON.parse(dec(token, encryption_key('token')));  // jwt.verify(token, publicKey);
	} catch (edge) {
		return ''
	}
}

async function getSlrConfig(keys) {
	let data = await sql_query("SELECT metaKey,metaValue from tblslr_config where metaKey IN(?)", [keys], 'Multi')
	let returnData = {}
	if (data.length) {
		for (let a of data) {
			returnData[a.metaKey] = a.metaValue
		}
	}
	return returnData
}

async function sendMembershipVoucherMail(email, voucherData) {
	let jokerContent = voucherData.hasJokerNFT
		? `<div style="margin-top: 10px;">As a special gift, you have also received a <strong style="color: #4cc9f0; font-weight: 700;">${voucherData.serialName}</strong> NFT free of cost!</div>`
		: "";

	let res;
	try {
		res = await send_mail(email, 'Active Membership', {
			des: `<span>Thank you for activating your membership!</span>
                  <div style="margin-top: 10px; margin-bottom: 10px;">As part of your membership, you have received a voucher code that offers a ${voucherData.discount}% discount on the purchase of ${voucherData.noOfNft} NFT from the ${process?.env?.NFT21SITE} website.</div>
                  <span>Your voucher code: <strong style="color: #4cc9f0; font-weight: 700;">${voucherData.voucherCode}</strong></span>
                  <div style="margin-top: 10px;">Please note, the voucher is valid for ${voucherData.validMonth} months from the date of this email.</div>
                ${jokerContent}
				<div style="margin-top: 15px;">Use this code on your next NFT purchase.</div>`,
			des1: "",
			desc1Style: "none",
			title1: "Active Membership",
			title: "",
			titleStyle: "block",
			image: "membership-voucher.png",
			otp: voucherData.voucherCode,
			otpStyle: 'none',
		});
		return res;
	} catch (e) {
		return false;
	}
}

async function checkNftLimitQty(srId, qty) {
	let checkSerial = await sql_query(`SELECT serialId, qty, price, limitPerUser, fullfillQty, name,rewardType,serialType FROM tblserial WHERE status = 1 and qty > fullfillQty and serialId = ? `, [srId])
	if (checkSerial) {
		let getRemainNft
		if (checkSerial.serialType != 2) {
			getRemainNft = await sql_query(`SELECT nftId from  tblnft where userId = ? and isGift = ? and serialId = ? and tokenId >= 0`, [0, 0, srId], "Count")
		} else {
			getRemainNft = await sql_query(`SELECT jockerSerialnftId from tbljockerSerialnft where userId = ? and isGift = ? and serialId = ? and tokenId >= 0`, [0, 0, srId], "Count")
		}
		if (getRemainNft >= qty) {
			return [true, checkSerial]
		} else {
			return [false, getRemainNft <= 0 ? "NFT has out of stock" : ""]
		}

	} else {
		return [false, "NFT has out of stock"]
	}
}

async function bookNft(loginUserData, srId, qty, payStatus, coinType) {
	let getRandomNft = await sql_query(`SELECT nftId, tokenId, serialCardDetailsId, serialId FROM tblnft WHERE userId = 0 and serialId = ${srId} and isGift = 0 and tokenId >= 0 ORDER BY RAND() LIMIT ${qty} `, [])
	let getNftSerial = await sql_query(`SELECT price,rewardType,serialType from tblserial where serialId = ? `, [srId])
	if (getRandomNft) {
		let fromIds
		let time = get_timestemp()
		let uniqcode = voucher_codes.generate({
			length: 6,
			count: 1,
			charset: voucher_codes.charset("alphabetic")
		});
		let timeuniqcode = voucher_codes.generate({
			length: 6,
			count: 1,
			charset: time.toString()
		});

		let getcardDetails = await sql_query(`SELECT perPieceThs, discount, serialCardDetailsId, serialId,oneTimeBenefit FROM tblserialCardDetails WHERE serialCardDetailsId = ? `, [getRandomNft.serialCardDetailsId])

		let insertData = await sql_query(`INSERT INTO tbluserSerialNft(serialId, serialCardDetailsId,coinType,coinAmount, nftId, userId, ths, discount,usedDiscountSerialId, usedDiscountSerialCardId, payStatus, createdOn, updatedOn, purchaseCode, voucherId, voucherDiscount,voucherEUROAmount,voucherType, cardDiscount, amount,oneTimeBenefit,rewardType) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			[
				srId,
				getRandomNft.serialCardDetailsId,
				coinType,
				0,
				getRandomNft.nftId,
				loginUserData.userId,
				getcardDetails.perPieceThs,
				0,
				0,
				0,
				payStatus,
				time,
				time,
				(uniqcode[0] + timeuniqcode[0]),
				0,
				0,
				0,
				0,
				0,
				(getNftSerial?.price ? getNftSerial.price : 0),
				getcardDetails.oneTimeBenefit,
				(getNftSerial?.rewardType ? getNftSerial.rewardType : 0)

			], "Insert")

		if (insertData && insertData.insertId) {
			fromIds = insertData.insertId
		}
		await sql_query(`UPDATE tblnft SET userId = ?, updatedOn = ?,relesedOn=? WHERE nftId = ? `, [loginUserData.userId, time, time, getRandomNft.nftId])
		await sql_query(`UPDATE tblserialCardDetails SET fullFillPiece = fullFillPiece + 1, updatedOn = ? WHERE serialCardDetailsId = ? `, [time, getRandomNft.serialCardDetailsId])

		await sql_query(`UPDATE tblserial SET fullfillQty = fullfillQty + ${qty}, updatedOn = ? WHERE serialId = ? `, [time, srId])
		return fromIds
	} else {
		return []
	}
}

async function bookJockerNft(loginUserData, srId, qty, payStatus, coinType) {
	let getRandomNft = await sql_query(`SELECT jockerSerialnftId, tokenId, jockerSerialCardDetailId, serialId FROM tbljockerSerialnft WHERE userId = 0 and serialId = ${srId} and isGift = 0 and tokenId >= 0 ORDER BY RAND() LIMIT ${qty} `, [])
	let getNftSerial = await sql_query(`SELECT price,rewardType,serialType from tblserial where serialId = ? `, [srId])
	if (getRandomNft) {
		let fromIds
		let time = get_timestemp()
		let uniqcode = voucher_codes.generate({
			length: 6,
			count: 1,
			charset: voucher_codes.charset("alphabetic")
		});
		let timeuniqcode = voucher_codes.generate({
			length: 6,
			count: 1,
			charset: time.toString()
		});
		let cards = await sql_query("SELECT discount, specialBonus, jockerSerialCardDetailId FROM tbljockerSerialCardDetail WHERE jockerSerialCardDetailId = ?", [getRandomNft.jockerSerialCardDetailId])
		if (cards) {
			let insertData = await sql_query(`INSERT INTO tbluserJockerSerialNft(serialId, jockerSerialCardDetailId, coinType,coinAmount, jockerSerialnftId, userId, payStatus, createdOn, updatedOn, purchaseCode, amount,discount,specialBonus,voucherId, voucherDiscount,voucherEUROAmount,voucherType) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
				[
					srId,
					getRandomNft.jockerSerialCardDetailId,
					coinType,
					0,
					getRandomNft.jockerSerialnftId,
					loginUserData.userId,
					payStatus,
					time,
					time,
					(uniqcode[0] + timeuniqcode[0]),
					(getNftSerial?.price ? getNftSerial.price : 0),
					cards.discount || 0,
					cards.specialBonus || 0,
					0,
					0,
					0,
					0
				], "Insert")

			if (insertData && insertData.insertId) {
				fromIds = insertData.insertId
			}
			await sql_query(`UPDATE tbljockerSerialnft SET userId = ?, updatedOn = ? WHERE jockerSerialnftId = ? `, [loginUserData.userId, time, getRandomNft.jockerSerialnftId])
			await sql_query(`UPDATE tbljockerSerialCardDetail SET fulfillPiece = fulfillPiece + 1, updatedOn = ? WHERE jockerSerialCardDetailId = ? `, [time, getRandomNft.jockerSerialCardDetailId])

			await sql_query(`UPDATE tblserial SET fullfillQty = fullfillQty + ${qty}, updatedOn = ? WHERE serialId = ? `, [time, srId])
			return fromIds
		}
	} else {
		return []
	}
}


async function getWizardNft(userId, serialId) {
	let time = get_timestemp()
	let checkUserNft = await sql_query(`SELECT nftId FROM tblnft WHERE userId = ? and isGift = ? and serialId = ? group by serialCardDetailsId`, [userId, 0, serialId], "Multi")
	if (checkUserNft.length >= 5) {
		let checkWizardNft = await sql_query(`SELECT serialCardDetailsId FROM tblserialCardDetails WHERE fullFillPiece < piece and serialId = ? and isGift = ?`, [serialId, 1])
		if (checkWizardNft) {
			let chetUserHaveNft = await sql_query(`SELECT userGiftNftsId FROM tbluserGiftNfts WHERE userId = ? and serialId = ? and status = ? and serialCardDetailsId = ?`, [userId, serialId, 1, checkWizardNft.serialCardDetailsId])
			if (!chetUserHaveNft) {
				let nftIds = checkUserNft.map((n) => { return n.nftId })
				let getUserNfts = await sql_query(`SELECT userSerialNftId FROM tbluserSerialNft WHERE nftId in (?) and status != 2 and payStatus = 1`, [nftIds], "Multi")
				let usernftIds = getUserNfts.map((u) => { return u.userSerialNftId })
				if (usernftIds.length > 0) {
					await sql_query(`Update tblnft set userId = ?,updatedOn = ? where serialId = ? and serialCardDetailsId = ? and isGift = ? and userId = 0 limit 1`, [userId, time, serialId, checkWizardNft.serialCardDetailsId, 1], "Update")
					await sql_query(`UPDATE tblserialCardDetails SET fullFillPiece = fullFillPiece + 1,updatedOn = ? WHERE serialCardDetailsId = ?`, [time, checkWizardNft.serialCardDetailsId], "Update")
					await sql_query(`INSERT INTO tbluserGiftNfts (userSerialNftIds,userId,serialId,serialCardDetailsId,createdOn,updatedOn) VALUES (?,?,?,?,?,?)`,
						[
							usernftIds.join(','),
							userId,
							serialId,
							checkWizardNft.serialCardDetailsId,
							time,
							time], "Insert")
					let cardData = await sql_query("SELECT cardName,image FROM tblserialCardDetails WHERE serialCardDetailsId = ?", [checkWizardNft.serialCardDetailsId])
					let serial = await sql_query("SELECT name  FROM  tblserial WHERE serialId = ? ", [serialId])
					let user = await sql_query("SELECT email FROM tbluser WHERE userId = ? ", [userId])
					if (user && user.email && cardData && serial) {
						await sendWizardNftMail(user.email, serial.name, cardData)
					}
				}
			}
		}
	}
}

async function sendWizardNftMail(email, serial, nftData) {
	let mailDescription = `<div style="text-align: center !important">Congratulations! You got <b>${nftData.cardName}</b> NFT from the extraordinary <b>${serial}</b> serial</div>
                    <br><span style="text-align:left;font-weight: 600;"> Details of your NFT : </span>
                    <div style="display: flex;flex-wrap:wrap; justify-content: center;">
                        <div style="flex-grow: 0;
                            flex-shrink: 0;
                            position: relative;
                            background: white;
                            border-radius: 6px;
                            border: 3px solid black;
                            margin: 10px;
                            width: 140px;
                            height: 140px;
                            text-align: center;">
                            <img src="${process.env.FRONTURL}/assets/images/serials/${nftData.image}" style="width: 80px;border-radius: 4px;text-align: center;margin: 16px 0px 0px;" />
                            <div style="position: absolute; color: black; bottom:0;width:100%;height:auto;"> <span>${nftData.cardName}</span></div>
                        </div>
                    </div>`;
	let des1 = ""
	let mailTitle1 = 'Gift NFT';
	let mailTitle = 'Gift NFT';
	let mailImage = 'buynft.png';
	send_mail(email, 'Gift NFT', { "des": mailDescription, "title1": mailTitle1, "title": mailTitle, "image": mailImage, otp: "otp", "otpStyle": 'none', btnUrl: process.env.FRONTURL + '/#mynft', nftbtn: 'View NFT', "nftStyle": 'block', titleStyle: "block", des1: des1, desc1Style: "none" })
	return true
}


async function getJockerGhostNft(userId, serialId) {
	let time = get_timestemp()
	let checkUserNft = await sql_query(`SELECT jockerSerialnftId FROM tbljockerSerialnft WHERE userId = ? and isGift = ? and serialId = ? group by jockerSerialCardDetailId`, [userId, 0, serialId], "Multi")
	if (checkUserNft.length >= 5) {
		let checkWizardNft = await sql_query(`SELECT jockerSerialCardDetailId FROM tbljockerSerialCardDetail WHERE fulfillPiece < piece and serialId = ? and isGift = ?`, [serialId, 1])
		if (checkWizardNft) {
			let chetUserHaveNft = await sql_query(`SELECT userJockerGiftNftsId FROM tbluserJockerGiftNfts WHERE userId = ? and serialId = ? and status = ? and userJockerGiftNftsId = ?`, [userId, serialId, 1, checkWizardNft.jockerSerialCardDetailId])
			if (!chetUserHaveNft) {
				let nftIds = checkUserNft.map((n) => { return n.jockerSerialnftId })
				let getUserNfts = await sql_query(`SELECT userJockerSerialNftId FROM tbluserJockerSerialNft WHERE jockerSerialnftId in (?) and payStatus = 1`, [nftIds], "Multi")
				let usernftIds = getUserNfts.map((u) => { return u.userJockerSerialNftId })
				if (usernftIds.length > 0) {
					await sql_query(`Update tbljockerSerialnft set userId = ?,updatedOn = ? where serialId = ? and jockerSerialCardDetailId = ? and isGift = ? and userId = 0 limit 1`, [userId, time, serialId, checkWizardNft.jockerSerialCardDetailId, 1], "Update")
					await sql_query(`UPDATE tbljockerSerialCardDetail SET fulfillPiece = fulfillPiece + 1,updatedOn = ? WHERE jockerSerialCardDetailId = ?`, [time, checkWizardNft.jockerSerialCardDetailId], "Update")
					await sql_query(`INSERT INTO tbluserJockerGiftNfts (userJockerSerialNftId,userId,serialId,jockerSerialCardDetailId,createdOn,updatedOn) VALUES (?,?,?,?,?,?)`,
						[
							usernftIds.join(','),
							userId,
							serialId,
							checkWizardNft.jockerSerialCardDetailId,
							time,
							time
						], "Insert")
				}
			}
		}
	}
}
var web3 = "";
const gaslimit = 1000000;
async function getGasLimit(data, from, to, value) {
	let tokenGasLimit = 210000
	try {
		let initialGasLimit = await web3.eth.estimateGas({
			"value": value,
			"data": data,
			"from": from,
			"to": to,
		})

		let lastbk = await new web3.eth.getBlock("latest")
		let upperGasLimit = parseInt(lastbk.gasLimit) * 0.9
		let bufferedGasLimit = parseInt(initialGasLimit) * 1.5

		if (initialGasLimit >= upperGasLimit) {
			tokenGasLimit = initialGasLimit
		} else if (bufferedGasLimit < (upperGasLimit)) {
			tokenGasLimit = bufferedGasLimit
		} else {
			tokenGasLimit = upperGasLimit
		}
	} catch (e) {
	}
	return tokenGasLimit
}

async function transferNft(tokenIds, nftBxnAddress, userSerialNftIds, salerAddress = '') {
	let time = get_timestemp()
	let contractAddress = process.env.NFT21_NFT_CONTRACT
	let contractAbi = NFT_ABI
	web3 = new Web3(new Web3.providers.HttpProvider(process.env.NFT21_PROVIDER_URL));
	const contract = new web3.eth.Contract(
		contractAbi,
		contractAddress
	);
	var adminAddress = process.env.NFT21_ADMIN_ADDRESS
	var adminPkey = dec(process.env.NFT21_ADMIN_KEY, encryption_key('nft21admPky'))
	web3.eth.accounts.wallet.add({
		privateKey: adminPkey,
		address: adminAddress
	});


	try {
		return new Promise((resolve, reject) => {
			web3.eth.getGasPrice().then(async function (gas) {

				let data = contract.methods.multiTransfer((salerAddress ? salerAddress : adminAddress), nftBxnAddress, tokenIds).encodeABI()
				let gasLimit = await getGasLimit(data, adminAddress, contractAddress, "0x")
				let fee = ((gasLimit + (gasLimit * 0.25)) * (gas)) / Number('1e18')
				let nativeBalance = await web3.eth.getBalance(adminAddress)
				nativeBalance = nativeBalance / 1e18
				if ((fee) > nativeBalance) {
					resolve(false);
				}
				var nonce = await web3.eth.getTransactionCount(adminAddress);
				let gestlt = parseInt(gasLimit + parseFloat((gasLimit * 0.25).toString()))
				let details = {
					"to": contractAddress,
					"value": "0x",
					"gas": web3.utils.toHex(gestlt),
					"gasPrice": web3.utils.toHex(parseInt(gas)),
					"nonce": web3.utils.toHex(nonce),
					"from": adminAddress,
					"data": contract.methods.multiTransfer((salerAddress ? salerAddress : adminAddress), nftBxnAddress, tokenIds).encodeABI()
				};
				const transferdata = new Promise(async (resolve, reject) => {
					let j = 0
					const signedTransaction = await web3.eth.accounts.signTransaction(details, adminPkey);
					await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)
						.on('transactionHash', async (hash) => {
							console.log("hash of ntc ans sch nft transfer==>", hash);
							console.log("userSerialNftIds===>", userSerialNftIds);
							await sql_query(`UPDATE tbluserSerialNft SET transferNftHash = ?, updatedOn = ? WHERE userSerialNftId = ?`, [hash, time, userSerialNftIds])
						})
						.on('confirmation', async (confirmationNumber, receipt) => {
							if (j == 0) {
								if (confirmationNumber?.confirmations >= 2 || confirmationNumber >= 2) {

									j = 1
									await sql_query(`UPDATE tbluserSerialNft SET nftTransferStatus = ?, updatedOn = ? WHERE userSerialNftId = ?`, [1, time, userSerialNftIds])
									resolve(true);
								}
							}
						})
						.on('error', async (error) => {
							await sql_query(`UPDATE tbluserSerialNft SET nftTransferStatus = ?, updatedOn = ? WHERE userSerialNftId = ?`, [2, time, userSerialNftIds])
							resolve(false);
						});
				});
				resolve(transferdata);
			});
		});
	} catch (e) {
		return false
	}
}

async function transferJockerNft(tokenIds, nftBxnAddress, userSerialNftId, salerAddress = '') {
	console.log({ tokenIds, nftBxnAddress, userSerialNftId, salerAddress })
	let time = get_timestemp()
	let contractAddress = process.env.NFT21_NFT_CONTRACT
	web3 = new Web3(new Web3.providers.HttpProvider(process.env.NFT21_PROVIDER_URL));
	const contract = new web3.eth.Contract(
		NFT_ABI,
		contractAddress
	);
	var adminAddress = process.env.NFT21_ADMIN_ADDRESS
	var adminPkey = dec(process.env.NFT21_ADMIN_KEY, encryption_key('nft21admPky'))
	web3.eth.accounts.wallet.add({
		privateKey: adminPkey,
		address: adminAddress
	});

	try {
		return new Promise((resolve, reject) => {
			web3.eth.getGasPrice().then(async function (gas) {
				console.log("contact data--", (salerAddress ? salerAddress : adminAddress), nftBxnAddress, tokenIds);
				let data = contract.methods.multiTransfer((salerAddress ? salerAddress : adminAddress), nftBxnAddress, tokenIds).encodeABI()
				console.log("data--", data);
				let gasLimit = await getGasLimit(data, adminAddress, contractAddress, "0x")
				let fee = ((gasLimit + (gasLimit * 0.25)) * (gas)) / Number('1e18')
				let nativeBalance = await web3.eth.getBalance(adminAddress)
				nativeBalance = nativeBalance / 1e18
				console.log({ nativeBalance })
				if ((fee) > nativeBalance) {
					resolve(false);
				}
				var nonce = await web3.eth.getTransactionCount(adminAddress);
				let gestlt = parseInt(gasLimit + parseFloat((gasLimit * 0.25).toString()))

				let details = {
					"to": contractAddress,
					"value": "0x",
					"gas": web3.utils.toHex(gestlt),
					"gasPrice": web3.utils.toHex(parseInt(gas)),
					"nonce": web3.utils.toHex(nonce),
					"from": adminAddress,
					"data": contract.methods.multiTransfer((salerAddress ? salerAddress : adminAddress), nftBxnAddress, tokenIds).encodeABI()
				};
				const transferdata = new Promise(async (resolve, reject) => {
					let j = 0
					const signedTransaction = await web3.eth.accounts.signTransaction(details, adminPkey);
					await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)
						.on('transactionHash', async (hash) => {
							console.log("Free Jocker nft transfer", { hash })
							await sql_query(`UPDATE tbluserJockerSerialNft SET transferNftHash = ?, updatedOn = ? WHERE userJockerSerialNftId = ?`, [hash, time, userSerialNftId])
						})
						.on('confirmation', async (confirmationNumber, receipt) => {
							if (j == 0) {
								if (confirmationNumber?.confirmations >= 2 || confirmationNumber >= 2) {

									j = 1
									await sql_query(`UPDATE tbluserJockerSerialNft SET transferStatus = ?, updatedOn = ? WHERE userJockerSerialNftId = ?`, [1, time, userSerialNftId])
									resolve(true);
								}
							}
						})
						.on('error', async (error) => {
							await sql_query(`UPDATE tbluserJockerSerialNft SET transferStatus = ?, updatedOn = ? WHERE userJockerSerialNftId = ?`, [2, time, userSerialNftId])
							resolve(false);
						});
				});
				resolve(transferdata);
			});
		});
	} catch (e) {
		console.log(e)
		return false
	}
}


async function getOneTimeSchReward(userId, userNftData, schAddress) {
	let time = get_timestemp()
	await sql_query(`INSERT INTO tbluserOnetimeSchReward (userId,serialId,serialCardDetailsId,fromId,amount,address,createdOn,updatedOn) VALUES (?,?,?,?,?,?,?,?)`, [
		userId,
		userNftData.serialId,
		userNftData.serialCardDetailsId,
		userNftData.userSerialNftId,
		userNftData.oneTimeBenefit,
		schAddress,
		time,
		time
	], "Insert")
}

module.exports = { encodeJwtWithPem, decodeJwtWithPem, insert_loginhistory, send_mail, verifyemail, sendverificationmail, check_user_login, file_get_contents, genrate_reffral_code, resendOtpMail, validate_2fa, forgotPasswordMail, getSlrConfig, sendMembershipVoucherMail, checkNftLimitQty, bookNft, bookJockerNft, getWizardNft, getJockerGhostNft, transferNft, transferJockerNft, getOneTimeSchReward };
