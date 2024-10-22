const route = require('express').Router()

const Security = require('../controller/user/Security')
const Config = require('../controller/user/Config') 
const User = require('../controller/user/UserDetail')

const MemberData = require('../controller/user/MemberData')  
const Transaction = require("../controller/user/Transaction")
route.post('/user-details', User.Details) 
// route.post('/change-password', Security.ChangePassword)
// route.post('/set-twofa', Security.SetTwofa)
// route.get('/twofa-secret', Security.GenerateTwofaSecret)
// route.get('/config', Config)
// route.post('/set-wallet-address', Security.SetWalletAddress)

// route.get('/power-matrix', MemberData.PowerMatrix)
// route.get('/team-matrix', MemberData.TeamMatrix)
// route.get('/member-data', MemberData.MemberInfo)
// route.post('/change-profile', MemberData.ChangeProfile)
// route.get('/transaction-history', Transaction.transactionHistory)

module.exports = route