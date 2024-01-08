const nodemailer = require("nodemailer");

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// async..await is not allowed in global scope, must use a wrapper
async function emailOTP({ email, otp }) {
    console.log({
        from: `"Support" <${process.env.SMTP_FROM}>`, // sender address
        to: email, // list of receivers
        subject: "OTP for btw", // Subject line
        html: `<p><b>Hello!</b><br/><br/> You asked us to send you an OTP for signing in to your btw account.<br/> Your wish is our command ✨ <br/><br/>Here's your OTP: <b>${otp}</b>.<br/></p> 
						<p>Note: Your OTP can only be used one time.</p>
						<p>See you soon!</p>
						Cheers<br/>
						Team btw`,
        text: `Hello! you asked us to send you an OTP for signing in to your btw account. Your wish is our command! ✨. Here's your OTP: ${otp}. Note: Your OTP will expire in 2 hours, and can only be used one time. See you soon! Cheers, Team btw`,
        creds: [
            process.env.SMTP_FROM,
            process.env.SMTP_HOST,
            process.env.SMTP_PORT,
            process.env.SMTP_USER,
            process.env.SMTP_PASS,
        ],
    });
    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: `"Support" <${process.env.SMTP_FROM}>`, // sender address
        to: email, // list of receivers
        subject: "OTP for btw", // Subject line
        html: `<p><b>Hello!</b><br/><br/> You asked us to send you an OTP for signing in to your btw account.<br/> Your wish is our command ✨ <br/><br/>Here's your OTP: <b>${otp}</b>.<br/></p> 
						<p>Note: Your OTP can only be used one time.</p>
						<p>See you soon!</p>
						Cheers<br/>
						Team btw`,
        text: `Hello! you asked us to send you an OTP for signing in to your btw account. Your wish is our command! ✨. Here's your OTP: ${otp}. Note: Your OTP will expire in 2 hours, and can only be used one time. See you soon! Cheers, Team btw`,
    });

    console.log("Message sent: %s", info.messageId);
}

// async..await is not allowed in global scope, must use a wrapper
async function emailImportComplete({ email }) {
    console.log({
        from: `"Support" <${process.env.SMTP_FROM}>`, // sender address
        to: email, // list of receivers
        subject: "btw - Import Complete", // Subject line
        html: `<p><b>Hello!</b><br/><br/>All imported documents are processed.<br/></p> 
						Cheers<br/>
						Team btw`,
        text: `Hello! All imported documents are processed. Cheers, Team btw`,
        creds: [
            process.env.SMTP_FROM,
            process.env.SMTP_HOST,
            process.env.SMTP_PORT,
            process.env.SMTP_USER,
            process.env.SMTP_PASS,
        ],
    });
    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: `"Support" <${process.env.SMTP_FROM}>`, // sender address
        to: email, // list of receivers
        subject: "btw- Import Complete", // Subject line
        html: `<p><b>Hello!</b><br/><br/>All imported documents are processed.<br/></p> 
						Cheers<br/>
						Team btw`,
        text: `Hello! All imported documents are processed. Cheers, Team btw`,
    });

    console.log("Message sent: %s", info.messageId);
}

async function customDomainSetupEmail({ email, domain }) {
    // email process.env.ADMIN_EMAIL that someone has requested a custom domain
    // send mail with defined transport object

    let info = await transporter.sendMail({
        from: `"Support" <${process.env.SMTP_FROM}>`, // sender address
        to: email, // list of receivers
        subject: "btw custom domain setup", // Subject line
        cc: process.env.ADMIN_EMAIL,
        html: `Hello!<br><br>Thanks for signing up for btw. Super excited to see how your personal blog will shape up!<br><br>Here’s the custom domain you requested: ${domain}<br><br>Custom domains are part of our <a href="https://www.btw.so/pricing">Pro plan (99$/year)</a>. Sharing <a href="https://buy.stripe.com/3csaGkaYB9gR0eI9AA">the Stripe link here</a> for you to complete the purchase.<br><br>Allow us 24 hours post purchase to send you set up instructions.<br><br>Let me know if you have any questions.<br><br>Cheers,<br>${
            (process.env.ADMIN_NAME || "Team btw").split(",")[0]
        }`,
        text: `Hello! Thanks for signing up for btw. Super excited to see how your personal blog will shape up! Here’s the custom domain you requested: ${domain} Custom domains are part of our Pro plan (99$/year). Sharing the Stripe link here - https://buy.stripe.com/3csaGkaYB9gR0eI9AA for you to complete the purchase. Allow us 24 hours post purchase to send you set up instructions. Let me know if you have any questions. Cheers, ${
            (process.env.ADMIN_NAME || "Team btw").split(",")[0]
        }`,
        replyTo: process.env.ADMIN_EMAIL.split(",")[0],
    });

    console.log("Message sent: %s", info.messageId);
}

module.exports = {
    emailOTP,
    emailImportComplete,
    customDomainSetupEmail,
};
