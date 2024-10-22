const route = require('express').Router();
const Fnn = require('../controller/membership-plan/Membership');

// POST
route.get('/get-membership-plan', Fnn.membershipPlanList);
route.get('/membership-plan-byid', Fnn.membershipPlan);
route.post('/buy-membership-plan', Fnn.buyMembershipPlan);

module.exports = route;