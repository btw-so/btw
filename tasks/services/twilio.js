const twilio =
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ? require("twilio")(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN
          )
        : null;

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || null;

/**
 * Call a phone number and speak a message using TTS (inline TwiML, no webhook needed).
 */
async function callAndSpeak({ to, message, voice }) {
    if (!twilio || !TWILIO_PHONE_NUMBER) {
        throw new Error("Twilio is not configured");
    }

    // Escape XML special chars for TwiML
    const escaped = message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const twiml = `<Response><Say voice="${voice || "Google.en-US-Neural2-F"}">${escaped}</Say></Response>`;

    const call = await twilio.calls.create({
        to,
        from: TWILIO_PHONE_NUMBER,
        twiml,
    });

    console.log(`[Twilio] Call initiated: ${call.sid} to ${to}`);
    return { callSid: call.sid, status: call.status };
}

module.exports = { callAndSpeak };
