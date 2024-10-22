const mysql = require('serverless-mysql')
const db = mysql({
    config: {
        host: process.env.MYSQL_HOST,
        database: process.env.MYSQL_DATABASE,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD
    },library: require('mysql2')
})
async function sql_query(query, value = [], type = 'Single') { 
    try {
        const results = await db.query(query, value)
        await db.end()
        if (type == 'Single') {
            return results[0]
        } else if (type == 'Count') {
            return results.length
        } else {
            return results
        }
    } catch (e) {
        throw Error(e.message)
    }
}

module.exports = { sql_query }