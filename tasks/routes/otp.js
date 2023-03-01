var express = require("express");
var router = express.Router();
var { generateOTP, validateOTP } = require("../logic/otp");

// create an api to generate otp
router.post("/otp", async (req, res) => {
    const { email } = req.body;
    const otp = await generateOTP({ email });
    res.json({ success: true, data: { otp } });
});

// create an api to validate otp
router.post("/validate-otp", async (req, res) => {
    const { email, otp } = req.body;
    const isValid = await validateOTP({ email, otp });
    res.json({ success: true, data: { isValid } });
});

module.exports = router;
