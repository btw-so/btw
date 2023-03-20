/*!
 * helper-markdown <https://github.com/jonschlinkert/helper-markdown>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var Remarkable = require('remarkable');
var extend = require('extend-shallow');
var exists = require('fs-exists-sync');
var ent = require('ent');

/**
 * Expose `md` helper
 */

var helper = module.exports = function(name, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  if (typeof cb !== 'function') {
    return helper.sync.apply(this, arguments);
  }
  if (typeof this === 'undefined' || typeof this.app === 'undefined') {
    throw new Error('md async helper expects `app` to be exposed on the context');
  }

  var opts = extend({cwd: process.cwd()}, this.options, options);
  opts = extend({}, opts, opts.hash);
  var md = markdown(opts);

  var filepath = path.resolve(opts.cwd, name);
  var view;
  var str = '';

  if (exists(filepath)) {
    // create a collection to ensure middleware is consistent
    this.app.create('mdfiles');
    str = fs.readFileSync(filepath, 'utf8');
    view = this.app.mdfile(filepath, {path: filepath, content: str});
  } else {
    view = this.app.find(name);
  }

  if (typeof view === 'undefined') {
    cb(null, '');
    return;
  }

  view.content = ent.decode(md.render(view.content));
  this.app.render(view, this.context, function(err, res) {
    if (err) return cb(err);
    cb(null, res.content);
  });
};

helper.sync = function(name, options) {
  var ctx = this || {};
  var app = ctx.app || {};

  var opts = extend({cwd: process.cwd()}, ctx.options, options);
  opts = extend({}, opts, opts.hash);
  var md = markdown(opts);

  var filepath = path.resolve(opts.cwd, name);
  var view;
  var html = '';
  var str = '';

  if (exists(filepath)) {
    str = fs.readFileSync(filepath, 'utf8');
    html = ent.decode(md.render(str));
  } else if (app.views) {
    view = app.find(name);
    if (view) {
      html = view.content = ent.decode(md.render(view.content));
    }
  }

  if (view && typeof view.compile === 'function') {
    view.compile(opts);
    var data = ctx.cache ? ctx.cache.data : {};
    ctx = extend({}, data, view.data);
    return view.fn(ctx);
  }

  if (typeof this.compile === 'function') {
    var fn = this.compile(html);
    return fn(this);
  }
  return html;
};

/**
 * Shared settings for remarkable
 *
 * @param {Object} `options`
 * @return {Object}
 * @api private
 */

function markdown(options) {
  return new Remarkable(extend({
    breaks: false,
    html: true,
    langPrefix: 'lang-',
    linkify: true,
    typographer: false,
    xhtmlOut: false
  }, options));
}
