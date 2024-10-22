const route = require('express').Router();
const MembershipPlan = require('../controller/cron/MembershipPlan');

// POST
route.get('/membership-plan-event', MembershipPlan.MembershipPlanEvent);
module.exports = route;