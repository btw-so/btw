var express = require("express");
const { create } = require("lodash");
var router = express.Router();

var { getAllNotes, getNoteBySlug, getUserBySlug } = require("../logic/notes");

const mainUrl = (res) => {
  return res.locals.customDomain
    ? `http${!!Number(process.env.HTTPS_DOMAIN) ? "s" : ""}://${
        res.locals.domainSlug
      }`
    : !!Number(process.env.DEBUG)
    ? `${process.env.ROOT_DOMAIN}/?${process.env.DOMAIN_QUERY_PARAM}=${res.locals.domainSlug}`
    : res.locals.domainSlug + "." + process.env.ROOT_DOMAIN;
};

const createSubUrlWithPath = (res, path) => {
  if (res.locals.customDomain) {
    return `http${!!Number(process.env.HTTPS_DOMAIN) ? "s" : ""}://${
      res.locals.domainSlug
    }${path}`;
  }

  if (!!Number(process.env.DEBUG)) {
    return `http${!!Number(process.env.HTTPS_DOMAIN) ? "s" : ""}://${
      process.env.ROOT_DOMAIN
    }${path}?${process.env.DOMAIN_QUERY_PARAM}=${res.locals.domainSlug}`;
  }

  return `http${!!Number(process.env.HTTPS_DOMAIN) ? "s" : ""}://${
    res.locals.domainSlug
  }.${process.env.ROOT_DOMAIN}${path}`;
};

router.get("/", async (req, res, next) => {
  const user = await getUserBySlug({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  });

  if (!user) {
    res.redirect("/404");
    return;
  }

  const notes = await getAllNotes({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  });

  if (notes) {
    notes.map((note) => {
      note.url = createSubUrlWithPath(res, `/${note.slug}`);
    });
  }

  res.render("index", {
    originalUrl: mainUrl(res),
    canonicalUrl: mainUrl(res),
    aboutUrl: createSubUrlWithPath(res, "/about"),
    title: user.name || user.email,
    notes,
    customDomain: res.locals.customDomain,
    mainUrl: createSubUrlWithPath(res, "/"),
    mainPage: true,
    siteTitle: user.name || user.email,
    linkedin: user.linkedin,
    twitter: user.twitter,
    instagram: user.instagram,
  });
});

router.get("/about", async (req, res, next) => {
  const user = await getUserBySlug({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  });

  if (!user) {
    res.redirect("/404");
    return;
  }

  const notes = await getAllNotes({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  });

  if (notes) {
    notes.map((note) => {
      note.url = createSubUrlWithPath(res, `/${note.slug}`);
    });
  }

  const aboutUrl = createSubUrlWithPath(res, `/about`);

  res.render("about", {
    originalUrl: aboutUrl,
    canonicalUrl: aboutUrl,
    aboutUrl,
    mainUrl: createSubUrlWithPath(res, "/"),
    aboutPage: true,
    title: `About | ${user.name || user.email}`,
    notes,
    customDomain: res.locals.customDomain,
    siteTitle: user.name || user.email,
    linkedin: user.linkedin,
    twitter: user.twitter,
    instagram: user.instagram,
    bio: user.bio,
    pic: user.pic,
  });
});

router.get("/:slug", async (req, res, next) => {
  const note = await getNoteBySlug({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
    noteSlug: req.params.slug,
  });

  console.log({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
    noteSlug: req.params.slug,
  });

  if (!note) {
    res.status(404);
    res.send({
      error: "Note not found",
    });
    return;
  }

  note.url = createSubUrlWithPath(res, `/${note.slug}`);

  const user = await getUserBySlug({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  });

  if (!user) {
    res.status(404);
    res.send({
      error: "User not found",
    });
    return;
  }

  res.render("post", {
    originalUrl: note.url,
    canonicalUrl: note.url,
    title: note.title || `Note | ${user.name || user.email}`,
    aboutUrl: createSubUrlWithPath(res, "/about"),
    note,
    mainUrl: createSubUrlWithPath(res, "/"),
    siteTitle: user.name || user.email,
    customDomain: res.locals.customDomain,
    linkedin: user.linkedin,
    twitter: user.twitter,
    instagram: user.instagram,
  });
});

module.exports = router;
