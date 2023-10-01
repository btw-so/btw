const db = require('../services/db')

var USER_CACHE = {}
var USER_ID_SLUG_CACHE = {}
var CUSTOM_DOMAIN_CACHE = {}
var CUSTOM_DOMAIN_ID_SLUG_CACHE = {}
var NOTE_SLUG_CACHE = {}

async function cacheNotes({ user_id } = {}) {
  // Run a 1000 rows paginated loop to cache all published notes
  const pool = await db.getTasksDB()

  let offset = 0
  const limit = 1000

  const temp = {}

  while (true) {
    const { rows } = await pool.query(
      `select user_id, html, image, slug, title, published_at from btw.notes where published_at is not null AND publish = TRUE ${
        user_id ? 'AND user_id = $1' : ''
      } ORDER BY published_at DESC LIMIT ${limit} OFFSET ${offset}`,
      user_id ? [user_id] : [],
    )

    if (rows.length === 0) {
      break
    }

    rows.forEach((row) => {
      if (user_id) {
        temp[row.slug] = row
      } else {
        NOTE_SLUG_CACHE[`${row.user_id}`] =
          NOTE_SLUG_CACHE[`${row.user_id}`] || {}
        NOTE_SLUG_CACHE[`${row.user_id}`][row.slug] = row
      }
    })

    offset += limit
  }

  if (user_id) {
    NOTE_SLUG_CACHE[`${user_id}`] = temp
  }

  // eslint-disable-next-line no-console
  console.log(
    `Notes cache complete ${user_id ? `for user_id ${user_id}` : ''}`,
    NOTE_SLUG_CACHE,
  )
}

async function cacheUsers({ user_id } = {}) {
  // Run a 1000 rows paginated loop to cache all users
  const pool = await db.getTasksDB()

  let offset = 0
  let limit = 1000

  while (true) {
    const { rows } = await pool.query(
      `select * from btw.users ${
        user_id ? 'where id = $1' : ''
      } ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`,
      user_id ? [user_id] : [],
    )

    if (rows.length === 0) {
      break
    }

    rows.forEach((row) => {
      // check if there was an old slug for this user in cache
      if (USER_ID_SLUG_CACHE[`${row.id}`]) {
        // delete the old slug from cache
        delete USER_CACHE[USER_ID_SLUG_CACHE[`${row.id}`]]
      }

      USER_CACHE[row.slug] = row
      USER_ID_SLUG_CACHE[`${row.id}`] = row.slug
    })

    offset += limit
  }

  // Run a 1000 rows paginated loop to cache all custom_domains
  offset = 0
  limit = 1000

  while (true) {
    const { rows } = await pool.query(
      `select * from btw.custom_domains ${
        user_id ? 'where user_id = $1' : ''
      } ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`,
      user_id ? [user_id] : [],
    )

    if (rows.length === 0) {
      break
    }

    rows.forEach((row) => {
      // check if there was an old slug for this user in cache
      if (CUSTOM_DOMAIN_ID_SLUG_CACHE[`${row.user_id}`]) {
        // delete the old slug from cache
        delete CUSTOM_DOMAIN_CACHE[
          CUSTOM_DOMAIN_ID_SLUG_CACHE[`${row.user_id}`]
        ]
      }
      CUSTOM_DOMAIN_CACHE[row.domain] = row
      CUSTOM_DOMAIN_ID_SLUG_CACHE[`${row.user_id}`] = row.domain
    })

    offset += limit
  }

  console.log(
    `User cache complete ${user_id ? `for user_id ${user_id}` : ''}`,
    USER_CACHE,
  )
}

async function getAllNotes({ slug, customDomain }) {
  const pool = await db.getTasksDB()

  if (
    !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
    process.env.ADMIN_SLUG
  ) {
    // single user mode and admin slug is set
    slug = process.env.ADMIN_SLUG
  }

  const subquery = customDomain
    ? 'select user_id from btw.custom_domains where domain = $1'
    : 'select id from btw.users where slug = $1'

  // check if there is a user with slug
  if (
    (!customDomain && USER_CACHE[slug]) ||
    (customDomain && CUSTOM_DOMAIN_CACHE[slug])
  ) {
    // get the id of this user
    const user_id = customDomain
      ? CUSTOM_DOMAIN_CACHE[slug].user_id
      : USER_CACHE[slug].id

    // check if we have note of this user in cache
    if (NOTE_SLUG_CACHE[`${user_id}`]) {
      return Object.values(NOTE_SLUG_CACHE[`${user_id}`]).sort(
        (a, b) => b.published_at - a.published_at,
      )
    }
  }

  const { rows } = await pool.query(
    `select slug, published_at, title, image, html, tags from btw.notes where publish = TRUE and user_id in (${subquery}) ORDER BY published_at DESC LIMIT 1000`,
    [slug],
  )

  // I will be surprised if someone wrote more than 1000 notes that are published?

  return rows
}

async function getNoteBySlug({ slug, customDomain, noteSlug }) {
  const pool = await db.getTasksDB()

  if (
    !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
    process.env.ADMIN_SLUG
  ) {
    // single user mode and admin slug is set
    slug = process.env.ADMIN_SLUG
  }

  // check if there is a user with slug
  if (
    (!customDomain && USER_CACHE[slug]) ||
    (customDomain && CUSTOM_DOMAIN_CACHE[slug])
  ) {
    // get the id of this user
    const user_id = customDomain
      ? CUSTOM_DOMAIN_CACHE[slug].user_id
      : USER_CACHE[slug].id

    // check if we have note of this user in cache
    if (
      NOTE_SLUG_CACHE[`${user_id}`] &&
      NOTE_SLUG_CACHE[`${user_id}`][noteSlug]
    ) {
      return NOTE_SLUG_CACHE[`${user_id}`][noteSlug]
    }
  }

  const subquery = customDomain
    ? 'select user_id from btw.custom_domains where domain = $1'
    : 'select id from btw.users where slug = $1'

  const { rows } = await pool.query(
    `select slug, published_at, title, tags, html from btw.notes where publish = TRUE and user_id in (${subquery}) and slug = $2 LIMIT 1`,
    [slug, noteSlug],
  )

  if (rows.length === 0) {
    return null
  }

  return rows[0]
}

async function getUserBySlug({ slug, customDomain }) {
  const pool = await db.getTasksDB()

  if (
    !Number(process.env.TURN_OFF_SINGLE_USER_MODE) &&
    process.env.ADMIN_SLUG
  ) {
    // single user mode and admin slug is set
    slug = process.env.ADMIN_SLUG
  }

  if (slug && !customDomain && USER_CACHE[slug]) {
    return { ...USER_CACHE[slug] }
  }

  if (slug && customDomain && CUSTOM_DOMAIN_CACHE[slug]) {
    const { user_id } = CUSTOM_DOMAIN_CACHE[slug]
    const userSlug = USER_ID_SLUG_CACHE[`${user_id}`]
    if (USER_CACHE[userSlug]) {
      return Object.assign(
        {},
        { ...USER_CACHE[userSlug] },
        {
          umami_site_id: CUSTOM_DOMAIN_CACHE[slug].umami_site_id,
          share_id: CUSTOM_DOMAIN_CACHE[slug].share_id,
        },
      )
    }
  }

  const subquery = customDomain
    ? 'select user_id from btw.custom_domains where domain = $1'
    : 'select id from btw.users where slug = $1'

  const { rows } = await pool.query(
    `select name, slug, bio, pic, linkedin, twitter, instagram from btw.users where id in (${subquery}) LIMIT 1`,
    [slug],
  )

  if (rows.length === 0) {
    return null
  }

  return rows[0]
}

module.exports = {
  getAllNotes,
  getNoteBySlug,
  getUserBySlug,
  cacheUsers,
  cacheNotes,
}
