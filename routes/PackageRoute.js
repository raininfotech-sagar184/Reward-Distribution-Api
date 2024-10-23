const route = require('express').Router();
const Fnn = require('../controller/package/Package');

// POST
route.get('/get-package-list', Fnn.packageList); 
route.post('/buy-package', Fnn.buyPackage);

module.exports = route;