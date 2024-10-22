const { sql_query } = require('../../utils/dbconnect') 

const PrivacyPolicyContent = async (req, res) => {
    try { 
        let data = await sql_query("SELECT metaValue FROM tblslr_config WHERE metaKey = ?", ['privacy_policy'])
        return res.status(200).json({content:data?.metaValue})
    } catch (error) {
        console.log("error PrivacyPolicyContent: ", error)
    }
    return res.status(200).json({ message: 'Service temporarily unavailable' })
}

module.exports = PrivacyPolicyContent 