'use strict';

var hljs = require('highlight.js');
var utils = require('handlebars-utils');
var Remarkable = require('remarkable');
var defaults = { html: true, breaks: true, highlight: highlight };

module.exports = function(config) {
  if (typeof config === 'string' || utils.isOptions(config)) {
    return markdown.apply(defaults, arguments);
  }

  function markdown(str, locals, options) {
    if (typeof str !== 'string') {
      options = locals;
      locals = str;
      str = true;
    }

    if (utils.isOptions(locals)) {
      options = locals;
      locals = {};
    }

    var ctx = utils.context(this, locals, options);
    var opts = utils.options(this, locals, options);
    opts = Object.assign({}, defaults, config, opts);

    if (opts.hasOwnProperty('lang')) {
      opts.langPrefix = opts.lang;
    }

    var md = new Remarkable(opts);
    var val = utils.value(str, ctx, options);
    return md.render(val);
  }
  return markdown;
};

function highlight(code, lang) {
  try {
    try {
      return hljs.highlight(lang, code).value;
    } catch (err) {
      if (!/Unknown language/i.test(err.message)) {
        throw err;
      }
      return hljs.highlightAuto(code).value;
    }
  } catch (err) {
    return code;
  }
}
