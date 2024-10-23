const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware')

const AuthRoute = require('./AuthRoute');
const UserRoute = require('./User');
const FooterDatasRoute = require('./FooterDatasRoute');
const TestRoute = require('./TestRoute');
const PackageRoute = require('./PackageRoute');
const Cron = require('./CronRoute')
router.use(AuthRoute);
router.use(FooterDatasRoute);
router.use(TestRoute);
router.use(Cron);

router.use(authMiddleware,UserRoute);
router.use(authMiddleware,PackageRoute);

module.exports = router;