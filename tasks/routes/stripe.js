var express = require("express");
var router = express.Router();
var bodyParser = require("body-parser");
const stripeClient = require("../services/stripe");
const {
    handleCheckoutCompleted,
    handleSubscriptionDeleted,
} = require("../logic/subscription");
const { sandboxQueue } = require("../services/queue");

// Stripe webhook — must receive raw body for signature verification
router.post(
    "/webhook",
    bodyParser.raw({ type: "application/json" }),
    async (req, res) => {
        if (!stripeClient) {
            return res.status(500).send("Stripe not configured");
        }

        const sig = req.headers["stripe-signature"];
        let event;

        try {
            event = stripeClient.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.log(`[Stripe] Webhook signature verification failed:`, err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        console.log(`[Stripe] Received event: ${event.type}`);

        try {
            switch (event.type) {
                case "checkout.session.completed": {
                    const session = event.data.object;
                    const result = await handleCheckoutCompleted({ session });
                    if (result) {
                        sandboxQueue.add("provision-sandbox", {
                            user_id: result.user_id,
                            chat_id: result.chat_id,
                        });
                    }
                    break;
                }
                case "customer.subscription.deleted": {
                    const subscription = event.data.object;
                    const result = await handleSubscriptionDeleted({ subscription });
                    if (result) {
                        sandboxQueue.add("destroy-sandbox", {
                            user_id: result.user_id,
                        });
                    }
                    break;
                }
            }
        } catch (err) {
            console.log(`[Stripe] Error handling event ${event.type}:`, err.message);
        }

        res.json({ received: true });
    }
);

module.exports = router;
