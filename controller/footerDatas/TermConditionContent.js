const { sql_query } = require('../../utils/dbconnect') 

const TermConditionContent = async (req, res) => {
    try { 
        let data = await sql_query("SELECT metaValue FROM tblslr_config WHERE metaKey = ?", ['terms_condition'])
        return res.status(200).json({content:data?.metaValue})
    } catch (error) {
        console.log("error TermConditionContent: ", error)
    }
    return res.status(200).json({ message: 'Service temporarily unavailable' })
}

module.exports = TermConditionContent 