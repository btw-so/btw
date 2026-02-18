const stripe = require("../services/stripe");
const db = require("../services/db");

async function getSubscription({ user_id }) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT * FROM btw.subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user_id]
    );
    return rows[0] || null;
}

async function createOrGetStripeCustomer({ user_id }) {
    const existing = await getSubscription({ user_id });
    if (existing && existing.stripe_customer_id) {
        return existing.stripe_customer_id;
    }

    // Get user info for Stripe customer creation
    const tasksDB = await db.getTasksDB();
    const { rows: users } = await tasksDB.query(
        `SELECT * FROM btw.users WHERE id = $1`,
        [user_id]
    );
    const user = users[0];

    const customer = await stripe.customers.create({
        metadata: { user_id: String(user_id) },
        name: user?.name || undefined,
        email: user?.email || undefined,
    });

    // Insert subscription row with customer ID
    await tasksDB.query(
        `INSERT INTO btw.subscriptions (user_id, stripe_customer_id, status)
         VALUES ($1, $2, 'inactive')
         ON CONFLICT (user_id) DO NOTHING`,
        [user_id, customer.id]
    );

    return customer.id;
}

async function createCheckoutSession({ user_id, chatId }) {
    if (!stripe) {
        throw new Error("Stripe is not configured");
    }

    const customerId = await createOrGetStripeCustomer({ user_id });

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
            {
                price: process.env.STRIPE_PRICE_ID,
                quantity: 1,
            },
        ],
        metadata: {
            user_id: String(user_id),
            chat_id: String(chatId),
        },
        subscription_data: {
            metadata: {
                user_id: String(user_id),
                chat_id: String(chatId),
            },
        },
        success_url: `https://t.me/`,
        cancel_url: `https://t.me/`,
    });

    return { url: session.url };
}

async function handleCheckoutCompleted({ session }) {
    const user_id = Number(session.metadata.user_id);
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    const tasksDB = await db.getTasksDB();

    // Update subscription record
    await tasksDB.query(
        `UPDATE btw.subscriptions
         SET stripe_subscription_id = $1, status = 'active', updated_at = NOW()
         WHERE user_id = $2 AND stripe_customer_id = $3`,
        [subscriptionId, user_id, customerId]
    );

    // Mark user as pro
    await tasksDB.query(
        `UPDATE btw.users SET pro = true WHERE id = $1`,
        [user_id]
    );

    console.log(`[Subscription] User ${user_id} is now pro`);
    return { user_id, chat_id: session.metadata.chat_id };
}

async function handleSubscriptionDeleted({ subscription }) {
    const tasksDB = await db.getTasksDB();

    // Find user by subscription ID
    const { rows } = await tasksDB.query(
        `SELECT user_id FROM btw.subscriptions WHERE stripe_subscription_id = $1`,
        [subscription.id]
    );

    if (rows.length === 0) {
        console.log(`[Subscription] No user found for subscription ${subscription.id}`);
        return null;
    }

    const user_id = rows[0].user_id;

    // Update subscription status
    await tasksDB.query(
        `UPDATE btw.subscriptions SET status = 'canceled', updated_at = NOW()
         WHERE stripe_subscription_id = $1`,
        [subscription.id]
    );

    // Remove pro flag
    await tasksDB.query(
        `UPDATE btw.users SET pro = false WHERE id = $1`,
        [user_id]
    );

    console.log(`[Subscription] User ${user_id} subscription canceled`);
    return { user_id };
}

async function cancelSubscription({ user_id }) {
    if (!stripe) {
        throw new Error("Stripe is not configured");
    }

    const sub = await getSubscription({ user_id });
    if (!sub || !sub.stripe_subscription_id) {
        throw new Error("No active subscription found");
    }

    await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    // The webhook will handle updating the DB
}

async function isUserPro({ user_id }) {
    const tasksDB = await db.getTasksDB();
    const { rows } = await tasksDB.query(
        `SELECT pro FROM btw.users WHERE id = $1`,
        [user_id]
    );
    return rows[0]?.pro === true;
}

module.exports = {
    getSubscription,
    createCheckoutSession,
    handleCheckoutCompleted,
    handleSubscriptionDeleted,
    cancelSubscription,
    isUserPro,
};
