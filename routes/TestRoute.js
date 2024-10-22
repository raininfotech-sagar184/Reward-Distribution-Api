const route = require('express').Router()

const Test = require('../controller/test/test')
route.get('/test', Test.Index)

module.exports = route