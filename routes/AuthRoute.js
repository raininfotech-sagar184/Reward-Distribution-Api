const route = require('express').Router();
const Register = require('../controller/auth/Register');
const Emailverification = require('../controller/auth/Emailverification');
const VerifyOtp = require('../controller/auth/Sendotp');
const Login = require('../controller/auth/Login');
const TwoFaVerification = require('../controller/auth/Twofactor-Verification');
const ForgotPassword = require("../controller/auth/ForgotPassword") 

// POST
// route.post('/country-list', Register.CountryList);
// route.get('/get-sponsorname', Register.SponsorName);
route.post('/register', Register.Index);


route.post('/verify-mail', Emailverification.Index);
route.post('/send-otp', VerifyOtp.Index);

route.post('/login', Login.Index);
// route.post('/verify-two-fa', TwoFaVerification.Index);


route.post('/forgot-password', ForgotPassword.Index);
route.post('/reset-password', ForgotPassword.ResetPassword); 
// route.post('/forgot-password-otp', ForgotPassword.ForgotPasswordOtp);

module.exports = route;