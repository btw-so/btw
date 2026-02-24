"use strict";

const LPN = require("google-libphonenumber");

const cleanPhoneNumber = (phone) => {
    if (!phone) {
        return {
            success: false,
            error: "Phone number is required",
        };
    }

    if (!phone.startsWith("+")) {
        phone = `+${phone}`;
    }

    // check if the number is valid without the country code
    const phoneUtil = LPN.PhoneNumberUtil.getInstance();

    try {
        const number = phoneUtil.parse(phone);
        if (phoneUtil.isValidNumber(number)) {
            phone = phoneUtil.format(number, LPN.PhoneNumberFormat.E164);
        } else {
            return {
                success: false,
                error: "Invalid phone number",
            };
        }
    } catch (err) {
        return {
            success: false,
            error: "Invalid phone number",
        };
    }

    return {
        success: true,
        phone,
        email: `${phone}@a1number.com`,
    };
};

module.exports = { cleanPhoneNumber };
