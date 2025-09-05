-- -------------------------------------------------------------
-- Database: btw
-- Generation Time: 2023-06-04 14:36:11.7610
-- -------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS btw;

DROP TABLE IF EXISTS "btw"."custom_domains";

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.custom_domains_id_seq;

-- Table Definition
CREATE TABLE "btw"."custom_domains" (
    "id" int4 NOT NULL DEFAULT nextval('btw.custom_domains_id_seq'::regclass),
    "domain" text NOT NULL,
    "user_id" int4 NOT NULL,
    "umami_site_id" uuid,
    "share_id" text,
    PRIMARY KEY ("domain","user_id")
);

DROP TABLE IF EXISTS "btw"."login_token";

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.login_token_id_seq;

-- Table Definition
CREATE TABLE "btw"."login_token" (
    "id" int4 NOT NULL DEFAULT nextval('btw.login_token_id_seq'::regclass),
    "uuid" uuid NOT NULL,
    "user_id" int4 NOT NULL,
    "created_at" timestamptz NOT NULL,
    "ip_address" text NOT NULL,
    "fingerprint" text NOT NULL,
    PRIMARY KEY ("uuid")
);

DROP TABLE IF EXISTS "btw"."notes";

-- Table Definition
CREATE TABLE "btw"."notes" (
    "user_id" int4 NOT NULL,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL,
    "json" json,
    "html" text,
    "title" text,
    "id" uuid NOT NULL,
    "ydoc" bytea,
    "tags" text,
    "published_at" timestamptz,
    "slug" text,
    "publish" bool,
    "archive" bool,
    "delete" bool,
    "deleted_at" timestamptz,
    "md" text,
    "image" text,
    "private" bool,
    PRIMARY KEY ("id","user_id")
);

DROP TABLE IF EXISTS "btw"."otp";

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.otp_id_seq;

-- Table Definition
CREATE TABLE "btw"."otp" (
    "id" int4 NOT NULL DEFAULT nextval('btw.otp_id_seq'::regclass),
    "created_at" timestamptz NOT NULL,
    "email" text NOT NULL,
    "processed_email" text NOT NULL,
    "otp" text NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "btw"."users";

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.user_id_seq;

-- Table Definition
CREATE TABLE "btw"."users" (
    "id" int4 NOT NULL DEFAULT nextval('btw.user_id_seq'::regclass),
    "email" text NOT NULL,
    "processed_email" text NOT NULL,
    "name" text,
    "slug" text,
    "created_at" timestamptz NOT NULL,
    "bio" text,
    "pic" varchar,
    "twitter" varchar,
    "instagram" varchar,
    "linkedin" varchar,
    "pro" bool,
    "umami_site_id" uuid,
    "share_id" text,
    "settings" json,
    PRIMARY KEY ("processed_email")
);

-- Table Definition
CREATE TABLE "btw"."nodes" (
    "id" varchar NOT NULL,
    "user_id" int4 NOT NULL,
    "text" varchar,
    "checked" bool,
    "collapsed" bool,
    "parent_id" varchar,
    "pos" float4,
    "updated_at" timestamptz,
    "checked_date" timestamptz,
    "pinned_pos" float4,
    PRIMARY KEY ("id","user_id"),
    "note_id" uuid,
    "file_id" uuid
);

-- Table Definition
CREATE TABLE "btw"."files" (
    "id" uuid NOT NULL,
    "user_id" int4 NOT NULL,
    "name" text,
    "url" text,
    "created_at" timestamptz,
    "raw_text" text,
    "structured_text" text,
    "type" text,
    "metadata" json,
    PRIMARY KEY ("id","user_id")
);

-- Table Definition
CREATE TABLE "btw"."scribbles" (
    "id" uuid NOT NULL,
    "user_id" int4 NOT NULL,
    "data" text,
    "created_at" timestamptz,
    "updated_at" timestamptz,
    "ydoc" bytea,
    PRIMARY KEY ("id","user_id")
);

-- Table Definition
CREATE TABLE "btw"."reminders" (
    "user_id" int4 NOT NULL,
    "duedate" timestamptz,
    "created_at" timestamptz,
    "updated_at" timestamptz,
    "completed" bool,
    "text" varchar,
    "id" varchar,
    "recurring" bool,
    "crontab" text,
    PRIMARY KEY ("user_id","id")
);


-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.alerts_id_seq;

-- Table Definition
CREATE TABLE "btw"."alerts" (
    "id" int4 NOT NULL DEFAULT nextval('btw.alerts_id_seq'::regclass),
    "reminder_id" varchar,
    "user_id" int4,
    "duedate" timestamptz,
    PRIMARY KEY ("id")
);


CREATE TABLE "btw"."telegram_user_map" (
    "telegram_id" numeric NOT NULL,
    "user_id" int4 NOT NULL,
    PRIMARY KEY ("telegram_id")
);


-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.telegram_chat_context_id_seq;

-- Table Definition
CREATE TABLE "btw"."telegram_chat_context" (
    "id" int4 NOT NULL DEFAULT nextval('btw.telegram_chat_context_id_seq'::regclass),
    "chat_id" numeric,
    "added_at" timestamptz,
    "message" jsonb,
    "type" varchar,
    "metadata" jsonb,
    PRIMARY KEY ("id")
);


CREATE TABLE "btw"."whatsapp_user_map" (
    "whatsapp_id" numeric NOT NULL,
    "user_id" int4 NOT NULL,
    PRIMARY KEY ("whatsapp_id")
);


-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.whatsapp_chat_context_id_seq;

-- Table Definition
CREATE TABLE "btw"."whatsapp_chat_context" (
    "id" int4 NOT NULL DEFAULT nextval('btw.whatsapp_chat_context_id_seq'::regclass),
    "chat_id" numeric,
    "added_at" timestamptz,
    "message" jsonb,
    "type" varchar,
    "metadata" jsonb,
    PRIMARY KEY ("id")
);

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.family_invites_id_seq;

-- Table Definition
CREATE TABLE "btw"."family_invites" (
    "requester_user_id" int4,
    "requested_family_number" varchar,
    "notified" bool,
    "requested_user_id" int4,
    "created_on" timestamptz,
    "id" int4 NOT NULL DEFAULT nextval('btw.family_invites_id_seq'::regclass),
    PRIMARY KEY ("id")
);


-- Table Definition
CREATE TABLE "btw"."family_users" (
    "id1" int4 NOT NULL,
    "id2" int4 NOT NULL,
    PRIMARY KEY ("id1","id2")
);