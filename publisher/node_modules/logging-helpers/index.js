'use strict';

var isObject = require('isobject');
var utils = require('log-utils');
var helpers = {};

/**
 * Helper for logging an unstyled message to the terminal.
 *
 * ```js
 * // Lo-Dash
 * <%= log("Foo:", someVariable) %>
 * <%= log("%j", foo) %>
 *
 * // Handlebars
 * {{log "this is a message!"}}
 * {{log page}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.log = function() {
  var args = createArgs([].slice.call(arguments));
  console.log.apply(console, args);
};

/**
 * Helper for logging a green colored "ok" message preceded by a checkmark
 * to the terminal.
 *
 * ```js
 * // Lo-Dash
 * <%= ok("stop!") %>
 * <%= ok("%j", {some: 'value'}) %>
 *
 * // Handlebars
 * {{ok "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.ok = function() {
  var args = createArgs([].slice.call(arguments));
  utils.ok.apply(utils.ok, args);
};

/**
 * Helper for logging a green colored "success" message to the terminal.
 *
 * ```js
 * // Lo-Dash
 * <%= success("stop!") %>
 * <%= success("%j", {some: 'value'}) %>
 *
 * // Handlebars
 * {{success "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.success = function() {
  var args = createArgs([].slice.call(arguments), 'green');
  console.log.apply(console, args);
};

/**
 * Helper for logging a cyan colored "informational" message to the terminal.
 *
 * ```js
 * // Lo-Dash
 * <%= info("this is a message!") %>
 * <%= info("%j", foo) %>
 *
 * // Handlebars
 * {{info "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.info = function() {
  var args = createArgs([].slice.call(arguments), 'cyan');
  console.log.apply(console, args);
};

/**
 * Helper for logging a yellow colored "warning" message to the terminal.
 *
 * ```js
 * // Lo-Dash
 * <%= warn("this is a message!") %>
 * <%= warn("%j", foo) %>
 *
 * // Handlebars
 * {{warn "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.warning = function() {
  var args = createArgs([].slice.call(arguments), 'yellow');
  console.error.apply(console, args);
};

/**
 * Alias for [warning](#warning) helper.
 *
 * ```js
 * // Lo-Dash
 * <%= warn("this is a message!") %>
 * <%= warn("%j", foo) %>
 *
 * // Handlebars
 * {{warn "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.warn = helpers.warning;

/**
 * Helper for logging a red colored "error" message to the terminal.
 *
 * ```js
 * // Lo-Dash
 * <%= error("stop!") %>
 * <%= error("%j", {some: 'value'}) %>
 *
 * // Handlebars
 * {{error "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.error = function() {
  var args = createArgs([].slice.call(arguments), 'red');
  console.error.apply(console, args);
};

/**
 * Helper for logging a red colored "danger" message to the terminal.
 *
 * ```js
 * // Lo-Dash
 * <%= danger("this is a message!") %>
 * <%= danger("%j", foo) %>
 *
 * // Handlebars
 * {{danger "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.danger = helpers.error;

/**
 * Helper for logging a bold colored message to the terminal.
 *
 * ```js
 * // Lo-Dash
 * <%= bold("this is a message!") %>
 * <%= bold("%j", foo) %>
 *
 * // Handlebars
 * {{bold "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers.bold = function() {
  var args = createArgs([].slice.call(arguments), 'bold');
  console.error.apply(console, args);
};

/**
 * Outputs a debug statement with the current context,
 * and/or `val`
 *
 * ```js
 * // Lo-Dash
 * <%= _debug("this is a message!") %>
 * <%= _debug("%j", foo) %>
 *
 * // Handlebars
 * {{_debug "this is a message!"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers._debug = function(val) {
  var args = createArgs([].slice.call(arguments));
  if (val && args.length > 0) {
    console.error();
    console.error('=================================');
    console.error('context: %j', this);
    console.error();
    console.error.apply(console, ['value: %j'].concat(args));
    console.error('=================================');
    console.error();
  }
};

/**
 * Returns stringified JSON, wrapped in a gfm codeblock, html `<pre>` tags,
 * or unchanged, based on the `type` passed on the context.
 *
 * ```js
 * // Lo-Dash
 * <%= _inspect(obj, {type: }) %>
 * <%= _inspect("%j", obj) %>
 *
 * // Handlebars
 * {{_inspect this type="html"}}
 * ```
 * @return {undefined}
 * @api public
 */

helpers._inspect = function(context, options) {
  var val = JSON.stringify(context, null, 2);
  var type = options && options.hash && options.hash.type || 'html';
  return switchOutput(type, val);
};

/**
 * Remove handlebars options from the arguments if more than one argument
 * is passed, and apply a color to the first argument if specified
 */

function createArgs(args, color) {
  var last = args[args.length - 1];
  if (args.length > 1 && isObject(last && last.hash)) {
    args.pop();
  }
  if (typeof color === 'string' && utils[color]) {
    args[0] = utils[color](args[0]);
  }
  return args;
}

/**
 * Generate output for the `_inspect` helper based on the
 * given `type`
 */

function switchOutput(type, json) {
  if (type[0] === '.') type = type.slice(1);
  var result = '';

  switch (type) {
    case 'md':
      result = ''
        + '\n```json\n'
        + json
        + '\n```\n';
      break;
    case 'html':
      result = ''
        + '<div class="highlight highlight-json">\n'
        + '<pre><code>\n'
        + json
        + '</code></pre>'
        + '</div>';
      break;
    default: {
      result = json;
      break;
    }
  }
  return result;
}

/**
 * Expose `.createArgs` as a non-enumberable method for unit tests
 */

Object.defineProperty(helpers, 'createArgs', {
  enumerable: false,
  configurable: false,
  get: function() {
    return createArgs;
  }
});

/**
 * Expose `.group` as a non-enumberable method for creating a helper group.
 * This is not supported by handlebars unfortunately
 */

Object.defineProperty(helpers, 'group', {
  enumerable: false,
  configurable: false,
  get: function() {
    var obj = {};
    for (var key in helpers) {
      if (helpers.hasOwnProperty(key)) {
        if (key === 'log') {
          obj[key] = helpers[key];
        } else {
          obj['log.' + key] = helpers[key];
        }
      }
    }
    return obj;
  }
});

/**
 * Expose `helpers`
 * @type {Object}
 */

module.exports = helpers;
