const route = require('express').Router(); 
const ContactUs = require('../controller/footerDatas/ContactUs')  
const  SubscribedEmail = require('../controller/footerDatas/SubscribedEmail');
const  PrivacyPolicyContent = require('../controller/footerDatas/PrivacyPolicyContent');
const TermConditionContent = require('../controller/footerDatas/TermConditionContent');
const { authMiddleware } = require('../middleware/authMiddleware')
// POST
route.post('/subscribe-email', SubscribedEmail); 
route.get('/privacy-policy-content', PrivacyPolicyContent)
route.get('/term-condition-content', TermConditionContent)
route.post('/contact-us',authMiddleware, ContactUs)

module.exports = route;