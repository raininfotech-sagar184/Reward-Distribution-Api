const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "mail.raininfotech.in",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

function sendMail(otp, req, res) {

    return new Promise((resolve, reject) => {

        let mailOptions = {
            from: 'parimal183@webmail.rainit.in', // sender address
            to: "berif61252@nweal.com", // list of receivers
            subject: `${typeof otp === "string" ? "Password Reset" : "OTP Verification Mail ✔ "}`, // Subject line
            html: `${typeof otp === "string" ? `Password Reset Link <a href=${otp}>Reset<a>` : `OTP For Verification${otp} </b>`}`, // html body
        };

        transporter.sendMail(mailOptions, function (err, data) {
            try {
                if (err) {
                    console.log("Error " + err);
                    reject("Failed");
                } else {
                    console.log("Email sent successfully");
                    resolve("Success");
                }
            } catch (error) {
                console.log("error: ", error);
                res.status(500).send({ error: "An error occurred" });
            }
        });

    });
}

module.exports = sendMail;