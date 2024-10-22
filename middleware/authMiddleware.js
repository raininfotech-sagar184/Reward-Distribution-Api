const jwt = require('jsonwebtoken');
const { sql_query } = require('../utils/dbconnect');
const { passDec, encryption_key } = require('../utils/Common');
const { decodeJwtWithPem } = require('../utils/Backend');


async function authMiddleware(req, res, next) {
    const accessToken = req.header('Authorization')?.replace('Bearer ', '');  // For the Use of the Postman
    console.log({first:accessToken})
    if (!accessToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const decodeAccessToken = decodeJwtWithPem(accessToken);
        console.log({two:decodeAccessToken})
        let a = 0
        if (decodeAccessToken.email && decodeAccessToken.password) {
            let getUserData = await sql_query(`select userId,password,userName FROM tbluser WHERE email = ? AND password = ?`, [decodeAccessToken.email, decodeAccessToken.password])
            if (getUserData && passDec(decodeAccessToken.password, encryption_key('passwordKey')) == passDec(getUserData.password, encryption_key('passwordKey'))) {
                req.userId = getUserData.userId
                a = 1
            }
        }
        if (a == 1) next()
        else return res.status(401).json({ message: 'Unauthorized' });
    } catch (error) {
        console.log("error: ", error);
        res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports = { authMiddleware };