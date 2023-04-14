-- -------------------------------------------------------------
-- Database: btw
-- Generation Time: 2023-03-28 16:22:10.3490
-- -------------------------------------------------------------

CREATE SCHEMA btw;

DROP TABLE IF EXISTS "btw"."custom_domains";

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS btw.custom_domains_id_seq;

-- Table Definition
CREATE TABLE "btw"."custom_domains" (
    "id" int4 NOT NULL DEFAULT nextval('btw.custom_domains_id_seq'::regclass),
    "domain" text NOT NULL,
    "user_id" int4 NOT NULL,
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
    "bio" text,
    "pic" varchar(255),
    "twitter" varchar(255),
    "linkedin" varchar(255),
    "instagram" varchar(255),
    "created_at" timestamptz NOT NULL,
    PRIMARY KEY ("processed_email")
);

