var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var exphbs = require("express-handlebars");
var hbsLayout = require("handlebars-layout");

var indexRouter = require("./routes/index");
var { genSitemap } = require("./routes/sitemap");

var app = express();
var minifyHTML = require("express-minify-html");

var hbs = exphbs.create({
  extname: ".hbs",
  defaultLayout: "base",
  layoutsDir: path.join(__dirname, "/views/layouts"),
  partialsDir: path.join(__dirname, "/views/partials"),
  helpers: require("handlebars-helpers")(), // make sure to call the returned function
});

hbs.handlebars.registerHelper(hbsLayout(hbs.handlebars));

// register new function
hbs.handlebars.registerHelper("slicer", (str, s, e = null) => str.slice(s, e));
hbs.handlebars.registerHelper("ifDev", (options) => {
  if (process.env.NODE_ENV !== "production") {
    return options.fn(this);
  } else return options.inverse(this);
});
hbs.handlebars.registerHelper("ifIsNthItem", function (options) {
  var index = options.data.index + 1,
    nth = options.hash.nth,
    val = options.hash.val;

  if (index % nth === val || 0) return options.fn(this);
  else return options.inverse(this);
});
hbs.handlebars.registerHelper("dateddmmyyy", function (str) {
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  function timeSince(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const interval = intervals.find((i) => i.seconds < seconds);
    const count = Math.floor(seconds / interval.seconds);
    return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`;
  }

  return timeSince(new Date(str));
});

// Minifier setup
app.use(
  minifyHTML({
    override: process.env.NODE_ENV === "production",
    exception_url: false,
    htmlMinifier: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
      minifyJS: true,
      minifyCSS: true,
    },
  })
);

if (process.env.NODE_ENV == "production") {
  app.set("trust proxy", 1);
}

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.engine(".hbs", hbs.engine);
app.set("view engine", ".hbs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// create a middleware to capture domain slug
app.use(async (req, res, next) => {
  // get the url
  // get process.env.DOMAIN_QUERY_PARAM
  // get process.env.DEBUG
  // get process.env.ROOT_DOMAIN
  // domain slug is = if its in debug mode, then DOMAIN_QUERY_PARAM key query value from the url
  // else it is <slug>.ROOT_DOMAIN from base url of the request
  // if domain slug is not found, then redirect to 404 page because we only serve with some domain
  // if domain slug is found, then set it in res.locals.domainSlug
  // then call next()

  if (process.env.DEBUG) {
    res.locals.domainSlug = req.query[process.env.DOMAIN_QUERY_PARAM];
  } else {
    // check if the domain is part of root domain or is it a custom domain
    // if it is a custom domain, then set res.locals.customDomain to true
    // else set it to false
    if (req.hostname.split(".")[1] === process.env.ROOT_DOMAIN) {
      res.locals.customDomain = false;

      res.locals.domainSlug = req.hostname.split(".")[0];

      if (res.locals.domainSlug === "publish") {
        res.locals.domainSlug = req.query[process.env.DOMAIN_QUERY_PARAM];
      }
    } else {
      res.locals.customDomain = true;
      res.locals.domainSlug = req.hostname;
    }
  }

  console.log(
    "A",
    req.hostname,
    res.locals.customDomain,
    res.locals.domainSlug
  );

  if (!res.locals.domainSlug) {
    res.status(404);
  } else {
    next();
  }
});

// Sitemap
app.get("/sitemap.xml", (req, res) => {
  // genSitemap().then((d) => {
  //   res.set("Content-Type", "text/xml");
  //   res.type("application/xml");
  //   res.send(d);
  // });
});

app.use("/", indexRouter);

// // catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  // res.render("error");
});

module.exports = app;
