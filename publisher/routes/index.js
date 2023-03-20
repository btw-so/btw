var express = require("express");
var router = express.Router();

var { getAllNotes, getNoteBySlug, getUserBySlug } = require("../logic/notes");

const mainUrl = (res) => {
  return res.locals.customDomain
    ? res.locals.customDomain
    : process.env.DEBUG
    ? `${process.env.ROOT_DOMAIN}/?${process.env.DOMAIN_QUERY_PARAM}=${res.locals.domainSlug}`
    : res.locals.domainSlug + "." + process.env.ROOT_DOMAIN;
};

const createSubUrlWithPath = (res, path) => {
  if (res.locals.customDomain) {
    return `https://${res.locals.domainSlug}${path}`;
  }

  if (process.env.DEBUG) {
    return `https://${process.env.ROOT_DOMAIN}${path}?${process.env.DOMAIN_QUERY_PARAM}=${res.locals.domainSlug}`;
  }

  return `https://${res.locals.domainSlug}.${process.env.ROOT_DOMAIN}${path}`;
};

router.get("/", async (req, res, next) => {
  const user = await getUserBySlug(req.params.slug);

  if (!user) {
    res.redirect("/404");
    return;
  }

  const notes = await getAllNotes(req.params.slug);

  if (notes) {
    notes.map((note) => {
      note.url = createSubUrlWithPath(res, `/${note.slug}`);
    });
  }

  res.render("index", {
    originalUrl: mainUrl(res),
    canonicalUrl: mainUrl(res),
    title: user.name || user.email,
    notes,
  });
});

router.get("/:slug", async (req, res, next) => {
  const note = await getNoteBySlug(req.params.slug);

  if (!note) {
    res.redirect("/404");
    return;
  }

  note.url = createSubUrlWithPath(res, `/${note.slug}`);

  const user = await getUserBySlug(req.params.slug);

  if (!user) {
    res.redirect("/404");
    return;
  }

  res.render("post", {
    originalUrl: note.url,
    canonicalUrl: note.url,
    title: note.title || `Note | ${user.name || user.email}`,
    note,
  });
});

module.exports = router;
