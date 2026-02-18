-- Migration: Pro subscriptions, sandboxes, and tool approvals
-- Run against the btw database

-- Store Stripe customer and subscription linkage
CREATE TABLE IF NOT EXISTS "btw"."subscriptions" (
    "id" SERIAL PRIMARY KEY,
    "user_id" int4 NOT NULL UNIQUE,
    "stripe_customer_id" text NOT NULL,
    "stripe_subscription_id" text,
    "status" text NOT NULL DEFAULT 'inactive',
    "plan" text NOT NULL DEFAULT 'pro_monthly',
    "current_period_start" timestamptz,
    "current_period_end" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id ON btw.subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON btw.subscriptions(stripe_customer_id);

-- Store Hetzner VM details
CREATE TABLE IF NOT EXISTS "btw"."sandboxes" (
    "id" SERIAL PRIMARY KEY,
    "user_id" int4 NOT NULL UNIQUE,
    "hetzner_server_id" bigint NOT NULL,
    "server_name" text NOT NULL,
    "ipv4" text NOT NULL,
    "status" text NOT NULL DEFAULT 'provisioning',
    "ssh_private_key" text NOT NULL,
    "ssh_public_key" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sandboxes_user_id ON btw.sandboxes(user_id);

-- Store pending tool approvals
CREATE TABLE IF NOT EXISTS "btw"."tool_approvals" (
    "id" uuid PRIMARY KEY,
    "user_id" int4 NOT NULL,
    "chat_id" numeric NOT NULL,
    "tool_name" text NOT NULL,
    "tool_args" jsonb NOT NULL,
    "tool_call_id" text NOT NULL,
    "status" text NOT NULL DEFAULT 'pending',
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "resolved_at" timestamptz
);
CREATE INDEX IF NOT EXISTS idx_tool_approvals_status ON btw.tool_approvals(status) WHERE status = 'pending';
