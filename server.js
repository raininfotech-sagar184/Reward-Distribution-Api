const express = require('express')
const cors = require('cors')
require('dotenv').config()


const app = express()

app.use(cors())
app.use(express.json())


const routes = require('./routes/IndexRoute')

function setHeaders(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONT_URL)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,Origin, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
    next()
}

app.use(setHeaders)

app.use(routes)

app.listen(process.env.PORT, () => {
    console.log('Server started on http://localhost:' + process.env.PORT)
})