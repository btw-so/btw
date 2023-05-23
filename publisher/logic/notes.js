const db = require("../services/db");

var USER_CACHE = {};
var USER_ID_SLUG_CACHE = {};
var CUSTOM_DOMAIN_CACHE = {};

async function cacheUsers() {
  // Run a 1000 rows paginated loop to cache all users
  const pool = await db.getTasksDB();

  let offset = 0;
  let limit = 1000;

  while (true) {
    const { rows } = await pool.query(
      `select * from btw.users ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`
    );

    if (rows.length === 0) {
      break;
    }

    rows.forEach((row) => {
      USER_CACHE[row.slug] = row;
      USER_ID_SLUG_CACHE["" + row.id] = row.slug;
    });

    offset += limit;
  }

  // Run a 1000 rows paginated loop to cache all custom_domains
  offset = 0;
  limit = 1000;

  while (true) {
    const { rows } = await pool.query(
      `select * from btw.custom_domains ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`
    );

    if (rows.length === 0) {
      break;
    }

    rows.forEach((row) => {
      CUSTOM_DOMAIN_CACHE[row.domain] = row;
    });

    offset += limit;
  }
}

async function getAllNotes({ slug, customDomain }) {
  const pool = await db.getTasksDB();

  if (
    !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
    process.env.ADMIN_SLUG
  ) {
    // single user mode and admin slug is set
    slug = process.env.ADMIN_SLUG;
  }

  let subquery = customDomain
    ? `select user_id from btw.custom_domains where domain = $1`
    : `select id from btw.users where slug = $1`;

  const { rows } = await pool.query(
    `select slug, published_at, title, tags from btw.notes where publish = TRUE and user_id in (${subquery}) ORDER BY published_at DESC LIMIT 1000`,
    [slug]
  );

  // I will be surprised if someone wrote more than 1000 notes that are published?

  return rows;
}

async function getNoteBySlug({ slug, customDomain, noteSlug }) {
  const pool = await db.getTasksDB();

  if (
    !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
    process.env.ADMIN_SLUG
  ) {
    // single user mode and admin slug is set
    slug = process.env.ADMIN_SLUG;
  }

  let subquery = customDomain
    ? `select user_id from btw.custom_domains where domain = $1`
    : `select id from btw.users where slug = $1`;

  const { rows } = await pool.query(
    `select slug, published_at, title, tags, html from btw.notes where publish = TRUE and user_id in (${subquery}) and slug = $2 LIMIT 1`,
    [slug, noteSlug]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function getUserBySlug({ slug, customDomain }) {
  const pool = await db.getTasksDB();

  if (
    !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
    process.env.ADMIN_SLUG
  ) {
    // single user mode and admin slug is set
    slug = process.env.ADMIN_SLUG;
  }

  if (slug && !customDomain && USER_CACHE[slug]) {
    return { ...USER_CACHE[slug] };
  }

  if (slug && customDomain && CUSTOM_DOMAIN_CACHE[slug]) {
    const { user_id } = CUSTOM_DOMAIN_CACHE[slug];
    const userSlug = USER_ID_SLUG_CACHE["" + user_id];
    if (USER_CACHE[userSlug]) {
      return Object.assign(
        {},
        { ...USER_CACHE[userSlug] },
        {
          umami_site_id: CUSTOM_DOMAIN_CACHE[slug].umami_site_id,
          share_id: CUSTOM_DOMAIN_CACHE[slug].share_id,
        }
      );
    }
  }

  const subquery = customDomain
    ? `select user_id from btw.custom_domains where domain = $1`
    : `select id from btw.users where slug = $1`;

  const { rows } = await pool.query(
    `select name, slug, bio, pic, linkedin, twitter, instagram from btw.users where id in (${subquery}) LIMIT 1`,
    [slug]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

module.exports = {
  getAllNotes,
  getNoteBySlug,
  getUserBySlug,
  cacheUsers,
};
