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

const getCommonDeets = (
  req,
  res,
  path,
  user,
  { meta_title, meta_description, meta_image, title } = {}
) => {
  return {
    site_title: meta_title
      ? `${meta_title} | ${user.name || user.email}`
      : user.name || user.email,
    site_image: meta_image || user.pic,
    site_url: mainUrl(res),
    originalUrl: createSubUrlWithPath(res, path),
    canonicalUrl: createSubUrlWithPath(res, path),
    aboutUrl: createSubUrlWithPath(res, "/about"),
    site_logo: user.pic,
    title: title
      ? `${title} | ${user.name || user.email}`
      : user.name || user.email,
    siteTitle: user.name || user.email,
    site_description: meta_description || `${user.name || user.email}`,
    customDomain: res.locals.customDomain,
    linkedin: user.linkedin,
    twitter: user.twitter,
    instagram: user.instagram,
  };
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
    notes,
    mainPage: true,
    ...getCommonDeets(req, res, "/", user),
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

  res.render("about", {
    aboutPage: true,
    notes,
    bio: user.bio,
    pic: user.pic,
    ...getCommonDeets(req, res, "/about", user, {
      title: `About`,
      meta_title: `About`,
    }),
  });
});

function extractFirstImageSrc(html) {
  const imgRegex = /<img[^>]+src="([^">]+)"/;
  const match = html.match(imgRegex);
  if (match) {
    return match[1];
  }
  return null;
}

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

  // check if note.html has any <img> element (need not have closing tag. just simple <img src="">). if it does, then extract the first image as the meta image
  const meta_image = extractFirstImageSrc(note.html);

  // check if note.html has first <p> element. if it does, then extract the first paragraph as the meta description
  const pRegex = /<p[^>]*>(.*?)<\/p>/g;
  const pMatch = pRegex.exec(note.html);
  const meta_description = pMatch ? pMatch[1] : null;

  res.render("post", {
    ...getCommonDeets(req, res, `/${note.slug}`, user, {
      title: note.title,
      meta_title: note.title,
      meta_image,
      meta_description,
    }),
    note,
    published_at: new Date(note.published_at).getTime(),
  });
});

module.exports = router;
