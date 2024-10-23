const { sql_query } = require('../../utils/dbconnect')
const { check_user_login, sendMembershipVoucherMail, checkNftLimitQty, bookNft, bookJockerNft, getWizardNft, getJockerGhostNft, transferJockerNft, transferNft, getOneTimeSchReward } = require('../../utils/Backend')
const { get_timestemp, enc, encryption_key, dec, to_float, trunc, getDecimalDivison, getCurrentTimestampinMiliSeconds } = require("../../utils/Common")
const Web3 = require('web3')

const packageList = async (req, res) => {
	try {
		// let user = await check_user_login(req);
		// if (!user.status || !user.data.userId) {
		// 	return res.status(400).json({ message: "Unauthorized" });
		// } 
		let list = await sql_query(
			"SELECT packageId, name, image, amount, description, status, createdOn  FROM tblPackage",
			[],
			'Multi'
		);
		if (list.length > 0) { 
			list = list.map((j) => { 
				let newData = {
					...j,
					packageId: j?.packageId ?  j.packageId : "",
					name: j?.name ?  j.name : "",
					image: j?.image ?  j.image : "",
					amount: j?.amount ?  j.amount : 0,
					description: j?.description ?  j.description : "",
					status: j?.status ?  j.status : 0,
					createdOn: j?.createdOn ?  j.createdOn :0, 
				};
				delete newData.nftSerialId;
				return newData;
			});
			const isAllowAllPurchase = list.every(item => !item.isActiveMembership);
			list = list.map(item => ({ ...item, isAllowAllPurchase }));
		}
		return res.status(200).json({ list });
	} catch (e) {
		console.log("Error packageList", e);
	}

	return res.status(400).json({ message: "Session Expired! Please refresh page" });
};

// const membershipPlan = async (req, res) => {
// 	try {
// 		let user = await check_user_login(req)
// 		if (!user.status || !user.data.userId) {
// 			return res.status(400).json({ message: "Unauthorized" })
// 		}
// 		let { membershipId } = req.query
// 		if (membershipId) {
// 			let data = await sql_query("SELECT REVERSE(MD5(slr_membershipPlanId)) as membershipPlanId, price, offerPrice FROM tblslr_membershipPlan WHERE REVERSE(MD5(slr_membershipPlanId)) = ?", [membershipId]);
// 			if (data) {
// 				let priceAmount = parseFloat(data.offerPrice) > 0 ? parseFloat(data.offerPrice) : parseFloat(data.price);
// 				const membershipData = {
// 					membershipPlanId: data.membershipPlanId,
// 					price: priceAmount,
// 				};
// 				return res.status(200).json({ data: membershipData });
// 			}

// 		}
// 	} catch (e) {
// 		console.log("Error membershipPlan", e)
// 	}
// 	return res.status(400).json({ message: "Session Expired! Please refresh page" })
// }

const buyPackage = async (req, res) => {
	try {
		let user = await check_user_login(req)
		if (!user.status || !user.data.userId) {
			return res.status(400).json({ message: "Unauthorized" })
		}
		let userId = user.data.userId, walletAddress = user.data.walletAddress, userName = user.data.username;
		let { membershipId, type, coinType, txId, hash, address, planAmt } = req?.body?.params

		if ([0, 1, 2].indexOf(type) > -1) {
			let currentTime = get_timestemp()
			if (type == 0 && [0, 1].indexOf(coinType) > -1 && membershipId && address) {

				if (address.toLowerCase() !== walletAddress.toLowerCase()) {
					return res.status(400).json({ message: `Connect wallet with ${trunc(walletAddress)}` })
				}
				let plan = await sql_query("SELECT slr_membershipPlanId,offerPrice,price FROM tblslr_membershipPlan WHERE reverse(md5(slr_membershipPlanId)) = ?", [membershipId])
				if (plan) {
					let planAmount = plan.offerPrice > 0 ? plan.offerPrice : plan.price
					planAmount = coinType == 0 ? planAmount : planAmount
					if (parseFloat(planAmt) > 0 && to_float(planAmount) == parseFloat(planAmt)) {
						let checkUserPurchaseMembership = await sql_query(`Select payStatus from tblslr_membershipPlanPaymentHistory where  userId = ? and payStatus = ?`, [userId, 0])
						if (!checkUserPurchaseMembership) {
							let upLineData = await sql_query("SELECT userId, upLine FROM tblslr_uniPlanMatrix WHERE userId=?", [userId]);
							let uniPlanUsersArray = (upLineData?.upLine) ? upLineData.upLine.split("~").filter(item => item.trim() !== "") : [];
							uniPlanUsersArray.reverse();

							let uniPlanBonus = [], sortedUserList = [];
							if (uniPlanUsersArray.length > 0) {
								let uniPlanUserList = await sql_query("SELECT u.userId, u.status, ud.walletAddress FROM tbluser AS u, tbluserDetailOfSolares AS ud WHERE u.userId=ud.userId AND u.userId IN (?) AND u.status = ? AND ud.walletAddress IS NOT NULL", [uniPlanUsersArray, 1], 'Multi');
								sortedUserList = uniPlanUsersArray.map(user_Id => uniPlanUserList.find(user => user.userId == user_Id)).filter(user => user);
							}

							let UNIPLAN_REWARD_LEVEL = process?.env?.UNIPLAN_REWARD_LEVEL, ADMIN_ADDRESS = process?.env?.ADMIN_MEMBERSHIP_PLAN_FUND_ADDRESS
							while (sortedUserList.length < UNIPLAN_REWARD_LEVEL) {
								sortedUserList.push({ userId: 0, status: 1, walletAddress: ADMIN_ADDRESS });
							}

							let getRewards = await sql_query("SELECT metaKey,metaValue FROM tblslr_config WHERE metaKey in(?)", [["uniPlanRewardPerc", "matrixRewardPerc"]], "MULTI")
							const rewardPerc = JSON.parse(getRewards.find(reward => reward.metaKey === 'uniPlanRewardPerc').metaValue);

							let adminObject = { userId: 0, amt: 0, perc: 0 };
							const filteredUniPlanData = { addresses: [], amounts: [] };

							sortedUserList.map((user, index) => {
								const perc = parseFloat(rewardPerc[index]) || 0;
								const amt = to_float((planAmount * perc) / 100, 4);
								if (user.userId === 0) {
									adminObject.amt = to_float(adminObject.amt + amt, 4);
									adminObject.perc += perc;
								} else {
									uniPlanBonus.push({ userId: user.userId, amt, perc })
									filteredUniPlanData.addresses.push(user.walletAddress.toLowerCase());
									filteredUniPlanData.amounts.push(amt);
								}
							});
							if (adminObject.amt || adminObject.perc) uniPlanBonus.push(adminObject);

							let getUserMetrixData = await sql_query("SELECT userId, upLine FROM tblslr_matrix WHERE userId=?", [userId]);
							console.log("getUserMetrixData=", getUserMetrixData);
							let lowestUpLineObject = ''
							if (!getUserMetrixData) {
								let getUserMatrixUpline = await sql_query("SELECT userId as perent_Id, upLine, level, levelLength, slr_matrixId FROM tblslr_matrix WHERE levelLength < ? ORDER BY level ASC", [5], "MULTI");
								if (getUserMatrixUpline.length > 0) {
									let lowestLevel = Math.min(...getUserMatrixUpline.map(obj => obj.level));
									getUserMatrixUpline.map(obj => {
										if (obj.level === lowestLevel && (!lowestUpLineObject || obj.levelLength < lowestUpLineObject.levelLength)) {
											lowestUpLineObject = obj;
										}
									});
								}
							}

							let matrixPlanUsersArray = (getUserMetrixData) ? getUserMetrixData.upLine.split("~").filter(item => item.trim() !== "") : (lowestUpLineObject.upLine + (lowestUpLineObject.upLine == "~" ? lowestUpLineObject.perent_Id : "~" + lowestUpLineObject.perent_Id)).split("~").filter(item => item.trim() !== "");
							if (lowestUpLineObject.userId && !matrixPlanUsersArray.includes(lowestUpLineObject.userId.toString())) {
								matrixPlanUsersArray.push(lowestUpLineObject.userId.toString());
							}
							matrixPlanUsersArray.reverse();

							let matixBonus = [], sortedMatrixUserList = [], matrixUpline = [];
							if (matrixPlanUsersArray.length > 0) {
								let uniPlanUserList = await sql_query("SELECT u.userId, u.status, ud.walletAddress FROM tbluser AS u, tbluserDetailOfSolares AS ud WHERE u.userId=ud.userId AND u.userId IN (?) AND u.status = ? AND ud.walletAddress IS NOT NULL and ud.membershipExpireOn >= ?", [matrixPlanUsersArray, 1, currentTime], 'Multi');
								sortedMatrixUserList = matrixPlanUsersArray.map(user__Id => uniPlanUserList.find(user => user.userId == user__Id)).filter(user => user && user.userId !== userId);
								matrixUpline = sortedMatrixUserList.length > 0 ? sortedMatrixUserList.map(user => user.userId) : [];
							}
							let METRIX_REWARD_LEVEL = process?.env?.METRIX_REWARD_LEVEL
							while (sortedMatrixUserList.length < METRIX_REWARD_LEVEL) {
								sortedMatrixUserList.push({ userId: 0, status: 1, walletAddress: ADMIN_ADDRESS });
							}
							const getMatrixReward = parseFloat(getRewards.find(reward => reward.metaKey === 'matrixRewardPerc')?.metaValue || 0);
							const filteredMatrixPlanData = { addresses: [], amounts: [] };
							let matrixAdminObject = { userId: 0, amt: 0, perc: 0 };
							sortedMatrixUserList.map((user, index) => {
								const perc = getMatrixReward || 0;
								const amt = to_float((planAmount * getMatrixReward) / 100, 4);
								if (user.userId === 0) {
									matrixAdminObject.amt = to_float(matrixAdminObject.amt + amt, 4);
									matrixAdminObject.perc += perc;
								} else {
									matixBonus.push({ userId: user.userId, amt, perc })
									filteredMatrixPlanData.addresses.push(user.walletAddress.toLowerCase());
									filteredMatrixPlanData.amounts.push(amt);
								}
							});
							if (matrixAdminObject.amt || matrixAdminObject.perc) matixBonus.push(matrixAdminObject);

							let insertMembershipPlanPayment = await sql_query("INSERT INTO tblslr_membershipPlanPaymentHistory (amount,coinType,slr_membershipPlanId,createdOn,userId,uniplanBonus,matrixBonus,price,tempMatrixUplineData) VALUES (?,?,?,?,?,?,?,?,?)", [
								planAmount,
								coinType,
								plan.slr_membershipPlanId,
								currentTime,
								userId,
								uniPlanBonus.length > 0 ? JSON.stringify(uniPlanBonus) : null,
								matixBonus.length > 0 ? JSON.stringify(matixBonus) : null,
								planAmount,
								lowestUpLineObject ? JSON.stringify(lowestUpLineObject) : null
							], 'Insert')

							let tokenAddress = process?.env?.USDT_TOKEN_CONTRACT_ADDRESS?.toLowerCase()
							let uniPlanAddresses = filteredUniPlanData?.addresses?.length > 0 ? filteredUniPlanData?.addresses : []
							let uniPlanAmounts = filteredUniPlanData?.amounts?.length > 0 ? filteredUniPlanData?.amounts : []
							let matrixAddresses = filteredMatrixPlanData?.addresses.length > 0 ? filteredMatrixPlanData?.addresses : []
							let matixAmounts = filteredMatrixPlanData?.amounts?.length > 0 ? filteredMatrixPlanData?.amounts : []
							let deadline = Math.floor(new Date().getTime() / 1000) + 3600
							let matrixUplineString = getUserMetrixData ? getCurrentTimestampinMiliSeconds().toString() + "-" : matrixUpline.length > 0 ? matrixUpline.join('-') + "-" + userId.toString() : userId.toString();
							let id = insertMembershipPlanPayment.insertId

							let adminSign = generateAdminSignForActiveMemberShip({
								address: address?.toLowerCase(),
								tokenAddress,
								planAmount: getDecimalDivison(parseFloat(planAmount), process?.env?.USDT_DECIMAL, 0),
								uniPlanAddresses,
								uniPlanAmounts,
								matrixAddresses,
								matixAmounts,
								matrixUplineString: matrixUplineString,
								id: Number(id),
								deadline: parseInt(deadline),
							})

							return res.status(200).json({
								uniPlanAddresses: uniPlanAddresses,
								uniPlanAmount: uniPlanAmounts.map(planAmount => getDecimalDivison(parseFloat(planAmount), process?.env?.USDT_DECIMAL, 0)),
								matrixAddresses: matrixAddresses,
								matixAmount: matixAmounts.map(planAmount => getDecimalDivison(parseFloat(planAmount), process?.env?.USDT_DECIMAL, 0)),
								matrixUpline: matrixUplineString,
								txId: enc(id.toString(), encryption_key('slr_membershipPlanPaymentHistoryId')),
								deadline: parseInt(deadline),
								adminSignature: adminSign.signature,
								id: id
							})
						} else {
							return res.status(400).json({ message: "Request is in pending, try again after 5 minutes" })
						}
					} else {
						return res.status(400).json({ message: "Your membership plan amount is fluctuated, Please refresh page & try again" })
					}
				}
			} else if (type == 1 && hash && txId) {
				// console.log("hash--", hash); 
				let decodeId = dec(txId, encryption_key("slr_membershipPlanPaymentHistoryId"))
				console.log("decodeId==", decodeId);
				let txData = await sql_query("SELECT amount, slr_membershipPlanId,coinType,slr_membershipPlanPaymentHistoryId,uniplanBonus,matrixBonus,tempMatrixUplineData FROM tblslr_membershipPlanPaymentHistory WHERE slr_membershipPlanPaymentHistoryId = ?", [decodeId])
				if (txData) {
					await sql_query("UPDATE tblslr_membershipPlanPaymentHistory SET hash = ?, payStatus = ?, updatedOn=? WHERE slr_membershipPlanPaymentHistoryId = ?", [hash, 1, currentTime, txData.slr_membershipPlanPaymentHistoryId])
					let plan = await sql_query("SELECT * FROM tblslr_membershipPlan WHERE slr_membershipPlanId = ? ", [txData.slr_membershipPlanId])
					let planAmount = plan.offerPrice > 0 ? plan.offerPrice : plan.price
					let voucherId = 0
					if (plan.voucherDiscount > 0) {
						// create voucher for user
						let voucherCode = await getVoucherCode()
						let voucherValidTill = Math.floor(new Date().getTime() / 1000) + parseFloat(plan.voucherValidateTill) * 30 * 86400
						let createVoucher = await sql_query("INSERT INTO tblvoucher (userId, couponCode, totalCards, discount, validUpto, createdFrom, serialId, createdOn) VALUES (?,?,?,?,?,?,?,?)", [
							userId,
							voucherCode[0],
							plan.totalVoucherCard,
							plan.voucherDiscount,
							voucherValidTill,
							1,
							0, //allow voucher for all serial
							currentTime
						], 'Insert')
						voucherId = createVoucher.insertId

						//Send Mail to user for get voucher
						let getSerialName = plan.nftSerialId > 0 ? await sql_query("SELECT name FROM tblserial WHERE serialId = ?", [plan.nftSerialId]) : ""
						const voucherMailData = { hasJokerNFT: plan.nftSerialId > 0 ? true : false, serialName: getSerialName ? getSerialName.name : "", discount: plan.voucherDiscount, noOfNft: 1, validMonth: plan.voucherValidateTill, voucherCode: voucherCode[0] }
						await sendMembershipVoucherMail(user.data.email, voucherMailData)
					}

					let endDate = plan.totalActivityMonth == 0 ? currentTime + ((100 * 12) * 30 * 86400) : (currentTime + (plan.totalActivityMonth * 30 * 86400))
					let createUserMemberShip = await sql_query("INSERT INTO tblslr_userMembershipPlan (userId, price, offerPrice, voucherDiscount, totalActivityMonth, voucherValidateTill, totalVoucherCard, nftSerialId, voucherId, coinType, coinAmount, status, payStatus, hash, endOn, createdOn,slr_membershipPlanId) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
						userId, plan.price,
						plan.offerPrice,
						plan.voucherDiscount,
						(plan.totalActivityMonth == 0 ? (12 * 100) : plan.totalActivityMonth),
						plan.voucherValidateTill,
						plan.totalVoucherCard,
						plan.nftSerialId,
						voucherId,
						txData.coinType == 0 ? 1 : 0,
						txData.amount,
						1,
						1,
						hash,
						endDate,
						currentTime,
						plan.slr_membershipPlanId
					], 'Insert')

					let userMembershipInsertId = createUserMemberShip.insertId
					await sql_query("UPDATE tblslr_membershipPlanPaymentHistory SET fromId = ?, updatedOn=? WHERE slr_membershipPlanPaymentHistoryId = ?", [userMembershipInsertId, currentTime, txData.slr_membershipPlanPaymentHistoryId])

					// // Transaction for purchase mebership
					await sql_query("INSERT INTO tblslr_transaction (userId, coinAmount, usdAmount, coinType, type, details, fromId, createdOn,hash) VALUES (?,?,?,?,?,?,?,?,?)",
						[userId, planAmount, planAmount, txData.coinType == 0 ? 1 : 0, 0, `Purchase membership plan`, userMembershipInsertId, currentTime, hash], 'Insert')

					// Transaction for uniplan matrix reward 
					let uniplan_bonus = [], uniplanData = [], adminUniPlanData = [], pendingLevel = [];
					if (txData?.uniplanBonus) {
						uniplan_bonus = JSON.parse(txData.uniplanBonus);
						uniplan_bonus.forEach((m, index) => {
							if (m.userId === 0) {
								pendingLevel.push(index + 1);
								const remainingUniplanLevels = Array.from({ length: process?.env?.UNIPLAN_REWARD_LEVEL - (index + 1) }, (_, i) => index + 2 + i);
								pendingLevel = pendingLevel.concat(remainingUniplanLevels);
								const uniplanLevelsFormatted = pendingLevel.map(level => `L${level}`).join(', ');
								adminUniPlanData.push([userId, txData.coinType === 0 ? 1 : 0, 0, `Get uniplan reward from ${userName} (Total levels: ${uniplanLevelsFormatted})`, m.amt, currentTime, hash]);
							} else {
								uniplanData.push([m.userId, m.amt, m.amt, txData.coinType === 0 ? 1 : 0, 1, `Get uniplan reward from ${userName} at  level ${index + 1} `, userMembershipInsertId, currentTime, hash]);
							}
						});
					}
					// Transaction for matrix reward
					let matrix_bonus = [], matrixData = [], adminMatrixData = [], matrixPendingLevel = []
					if (txData?.matrixBonus) {
						matrix_bonus = JSON.parse(txData.matrixBonus);
						matrix_bonus.forEach((m, index) => {
							if (m.userId == 0) {
								matrixPendingLevel.push(index + 1);
								const remainingLevels = Array.from({ length: process?.env?.METRIX_REWARD_LEVEL - (index + 1) }, (_, i) => index + 2 + i);
								matrixPendingLevel = matrixPendingLevel.concat(remainingLevels);
								const levelsFormatted = matrixPendingLevel.map(level => `L${level}`).join(', ');
								adminMatrixData.push([userId, txData.coinType == 0 ? 1 : 0, 1, `Get matrix reward from ${userName} (Total levels: ${levelsFormatted})`, m.amt, currentTime, hash]);
							} else {
								matrixData.push([m.userId, m.amt, m.amt, txData.coinType == 0 ? 1 : 0, 2, `Get matrix reward from ${userName} at level ${index + 1}`, userMembershipInsertId, currentTime, hash]);
							}
						});
					}
					let userTransactionData = [...uniplanData, ...matrixData]
					if (userTransactionData.length) await sql_query("INSERT INTO tblslr_transaction (userId, coinAmount, usdAmount, coinType, type, details, fromId, createdOn,hash) VALUES ?", [userTransactionData], 'Insert')
					let adminTransactionData = [...adminUniPlanData, ...adminMatrixData]
					if (adminTransactionData.length) await sql_query("INSERT INTO tblslr_adminWalletHistory (userId, coinType, type, details, amount, createdOn,hash) VALUES ?", [adminTransactionData], 'Insert')
					const totalRewardAmt = [...uniplan_bonus, ...matrix_bonus].reduce((sum, item) => sum + item.amt, 0);
					console.log("totalRewardAmt==", totalRewardAmt);

					let pendingPkgAmount = parseFloat(planAmount) - parseFloat(totalRewardAmt)
					// Transaction for pending amount from package
					if (pendingPkgAmount > 0) {
						await sql_query("INSERT INTO tblslr_adminWalletHistory (userId, coinType, type, details, amount, createdOn,hash) VALUES (?,?,?,?,?,?,?)", [
							userId,
							txData.coinType == 0 ? 1 : 0,
							2,
							`Purchase membership plan by ${userName}`,
							pendingPkgAmount,
							currentTime,
							hash
						], 'Insert')
					}
					await sql_query("UPDATE tbluserDetailOfSolares SET membershipExpireOn = ?,  updatedOn=? WHERE userId = ?", [endDate, currentTime, userId])
					if (txData.tempMatrixUplineData) {
						let userMatrixData = JSON.parse(txData.tempMatrixUplineData)
						console.log("userMatrixData--", userMatrixData);
						await sql_query("INSERT INTO tblslr_matrix (userId,parentId,level,levelLength,upline,createdOn) VALUES (?,?,?,?,?,?)", [
							userId,
							userMatrixData.perent_Id,
							Number(userMatrixData.level) + 1,
							0,
							userMatrixData.upLine == "~" ? `${userMatrixData.upLine}${userMatrixData.perent_Id}` : `${userMatrixData.upLine}~${userMatrixData.perent_Id}`,
							currentTime
						], 'Insert')
						await sql_query("UPDATE tblslr_matrix SET levelLength=?,updatedOn=? WHERE slr_matrixId=?", [userMatrixData.levelLength + 1, currentTime, userMatrixData.slr_matrixId])
					}

					if (plan.nftSerialId > 0) {
						console.log('Transfer nft to user as a free nft');
						await sendFreeNftToUser(userId, plan, txData, hash)
					}
					return res.status(200).json({ message: "Membership plan has been successfully purchased" })
				}
			} else if (type == 2 && txId) {
				let decodeId = dec(txId, encryption_key("slr_membershipPlanPaymentHistoryId"))
				let txData = await sql_query("SELECT slr_membershipPlanPaymentHistoryId FROM tblslr_membershipPlanPaymentHistory WHERE slr_membershipPlanPaymentHistoryId = ?", [decodeId])
				if (txData) {
					await sql_query("UPDATE tblslr_membershipPlanPaymentHistory SET payStatus=?,updatedOn=? WHERE slr_membershipPlanPaymentHistoryId=?", [2, currentTime, txData.slr_membershipPlanPaymentHistoryId])
				}
				return res.status(400).json({ message: "Reject" })
			}
		}
	} catch (e) {
		console.log("Error buyPackage", e)
	}
	return res.status(400).json({ message: "Session Expired! Please refresh page" })
}

// function generateAdminSignForActiveMemberShip(data) {
// 	console.log("data==", data);
// 	let web3 = new Web3()
// 	web3.eth.defaultAccount = process?.env?.MULTISEND_SIGNER_ADDRESS
// 	let decimal = process?.env?.USDT_DECIMAL
// 	let adminPkey = dec(process.env.MULTISEND_SIGNER_PRIVATE_KEY, encryption_key('admin_private_key'));
// 	console.log("adminPkey-", adminPkey);
// 	let uniPlanAddresses = web3.utils.soliditySha3("--" + data.uniPlanAddresses.toString().replaceAll(',', ''));
// 	console.log("uniPlanAddresses--", uniPlanAddresses);
// 	let uniPalnAmounttoDecimal = data.uniPlanAmounts.map(amt => {
// 		const convertedAmt = getDecimalDivison(amt, decimal, 0);
// 		return convertedAmt;
// 	})
// 	let uniPlanAmountStr = web3.utils.soliditySha3(uniPalnAmounttoDecimal.map(amt => amt).toString().replaceAll(',', '') + "-");
// 	// let uniPlanAmountStr = web3.utils.soliditySha3(data.uniPlanAmounts.map(amt => getDecimalDivison(amt, decimal, 0)).toString().replaceAll(',', '') + "-");
// 	console.log("uniPlanAmountStr--", uniPlanAmountStr);
// 	let matrixAddresses = web3.utils.soliditySha3("--" + data.matrixAddresses.toString().replaceAll(',', ''));
// 	console.log("matrixAddresses--", matrixAddresses);

// 	let matrixAmounttoDecimal = data.matixAmounts.map(amt => {
// 		const convertedAmt = getDecimalDivison(amt, decimal, 0);
// 		return convertedAmt;
// 	})
// 	console.log({ matrixAmounttoDecimal });
// 	let matrixPlanAmountStr = web3.utils.soliditySha3(matrixAmounttoDecimal.map(amt => amt).toString().replaceAll(',', '') + "-");
// 	// let matrixPlanAmountStr = web3.utils.soliditySha3(data.matixAmounts.map(amt => getDecimalDivison(amt, decimal, 0)).toString().replaceAll(',', '') + "-");
// 	console.log("matrixPlanAmountStr--", matrixPlanAmountStr);

// 	let signHash = web3.utils.soliditySha3(
// 		data.address,
// 		data.tokenAddress,
// 		data.planAmount,
// 		uniPlanAddresses,
// 		uniPlanAmountStr,
// 		matrixAddresses,
// 		matrixPlanAmountStr,
// 		data.matrixUplineString,
// 		data.id,
// 		data.deadline
// 	)

// 	console.log("signHash--", signHash);
// 	let adminSignature = web3.eth.accounts.sign(signHash, '0x' + adminPkey)
// 	console.log("adminSignature===>", adminSignature);
// 	return adminSignature
// }

// async function getVoucherCode() {
// 	try {
// 		let voucher_codes = require('voucher-code-generator')
// 		let isVoucherExist
// 		let couponCode = []
// 		do {
// 			couponCode = voucher_codes.generate({
// 				length: 6,
// 				count: 1,
// 				charset: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
// 			})
// 			isVoucherExist = await sql_query(`SELECT * FROM tblvoucher WHERE tblvoucher.couponCode='${couponCode[0]}'`)
// 		}
// 		while (isVoucherExist)
// 		return couponCode
// 	} catch (e) {
// 		console.log(e)
// 	}
// }

// async function sendFreeNftToUser(userId, plan, txData, hash) {
// 	console.log("send free nft to user--", (userId, plan, txData, hash));
// 	let serialData = await checkNftLimitQty(plan.nftSerialId, 1)
// 	let currentTime = get_timestemp()

// 	if (!serialData[0]) {
// 		await sql_query("UPDATE tblslr_membershipPlanPaymentHistory SET nftDetail = ?,  updatedOn=? WHERE slr_membershipPlanPaymentHistoryId = ?", [serialData[1], currentTime, txData.slr_membershipPlanPaymentHistoryId])
// 	} else {
// 		let getAddress, checkSerial = serialData[1], fromId = []
// 		getAddress = await sql_query("SELECT nftBxnAddress,schAddress FROM tbluserDetailOfNft21 WHERE userId = ?", [userId])
// 		if (checkSerial?.serialType == 0 && checkSerial?.nftBxnAddress || (checkSerial?.serialType == 1 && getAddress?.schAddress && checkSerial?.nftBxnAddress) || checkSerial?.serialType == 2 && checkSerial?.nftBxnAddress) {
// 			if (checkSerial.serialType == 2) {
// 				fromId = await bookJockerNft({ userId: userId, nftBxnAddress: getAddress.nftBxnAddress }, checkSerial.serialId, 1, 1, 0)
// 			} else {
// 				fromId = await bookNft({ userId: userId, nftBxnAddress: getAddress.nftBxnAddress }, checkSerial.serialId, 1, 1, 0)
// 			}
// 			if (fromId) {
// 				await sql_query(`INSERT INTO tbltransaction (userId,amount,euroPrice,coinType,type,details,fromId,createdOn,updatedOn) VALUES (?,?,?,?,?,?,?,?,?)`, [
// 					userId,
// 					0,
// 					0,
// 					0,
// 					3,
// 					`Get a free NFT from SOLARES on purchasing the  ${plan.package_name} membership`,
// 					fromId,
// 					currentTime,
// 					currentTime
// 				], "Insert")

// 				await sql_query(`INSERT INTO tblslr_transaction (userId,coinAmount,usdAmount,coinType,type,details,fromId,createdOn,updatedOn,hash) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
// 					userId,
// 					0,
// 					0,
// 					0,
// 					13,
// 					`Get a free NFT on purchasing the  ${plan.package_name} membership`,
// 					fromId,
// 					currentTime,
// 					currentTime,
// 					hash
// 				], "Insert")

// 				let getNftId, trans
// 				if (checkSerial.serialType == 2) {
// 					console.log("checkSerial.serialType---2=== get nftid");
// 					getNftId = await sql_query(`SELECT u.userJockerSerialNftId,u.jockerSerialnftId,n.tokenId FROM tbluserJockerSerialNft as u,tbljockerSerialnft as n WHERE u.userJockerSerialNftId = ? and n.jockerSerialnftId = u.jockerSerialnftId`, [fromId])
// 				} else {
// 					console.log("checkSerial.serialType---0 and 1=== get nftid");
// 					getNftId = await sql_query(`SELECT u.userSerialNftId,n.tokenId,u.nftId FROM tbluserSerialNft as u,tblnft as n WHERE u.userSerialNftId = ? and n.nftId = u.nftId`, [fromId])
// 				}

// 				console.log("getNftId=====", getNftId);
// 				if (getNftId) {
// 					console.log("getNftId inn", getNftId.tokenId);
// 					let tokenIds = getNftId.tokenId
// 					console.log("tokenIds==", tokenIds);
// 					if (tokenIds) {
// 						console.log("in token ids");
// 						console.log("checkSerial.serialType--", checkSerial.serialType);
// 						if (checkSerial.serialType == 2) {
// 							console.log("check jocker ghost nft");
// 							await getJockerGhostNft(userId, checkSerial.serialId)
// 							console.log("getAddress.nftBxnAddress== jocket transfer nft==", getAddress.nftBxnAddress);
// 							trans = await transferJockerNft([tokenIds], getAddress.nftBxnAddress, fromId)
// 						} else {
// 							console.log("check for wizard");
// 							await getWizardNft(userId, checkSerial.serialId)
// 							console.log("getAddress.nftBxnAddress== transfer nft==", getAddress.nftBxnAddress);
// 							console.log("tokenIds==", tokenIds);
// 							console.log("fromId==", fromId);
// 							trans = await transferNft([tokenIds], getAddress.nftBxnAddress, fromId)
// 						}

// 						if (trans) {
// 							if (checkSerial?.serialType == 1) {
// 								console.log("sch serila sch reward==-===-==-==-========");
// 								let getUserNftData = await sql_query(`select userSerialNftId,oneTimeBenefit,serialCardDetailsId,serialId from tbluserSerialNft WHERE userSerialNftId = ?`, [fromId])
// 								console.log("getUserNftData for sch reward==", getUserNftData);
// 								if (getUserNftData) getOneTimeSchReward(userId, getUserNftData, getAddress?.schAddress)
// 							}
// 						} else {
// 							await sql_query("UPDATE tblslr_membershipPlanPaymentHistory SET nftDetail = ?,  updatedOn=? WHERE slr_membershipPlanPaymentHistoryId = ?", ["NFT not transfer", currentTime, txData.slr_membershipPlanPaymentHistoryId])

// 						}
// 					}
// 				}
// 			}
// 		} else {
// 			await sql_query("UPDATE tblslr_membershipPlanPaymentHistory SET nftDetail = ?,  updatedOn=? WHERE slr_membershipPlanPaymentHistoryId = ?", [`${checkSerial.serialType == 1 ? "SCH OR BXN" : "BXN "} address is not locked on the NFT21 site`, currentTime, txData.slr_membershipPlanPaymentHistoryId])

// 		}
// 	}
// }

module.exports = { packageList, buyPackage,  }