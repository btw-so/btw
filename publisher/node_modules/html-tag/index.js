/*!
 * html-tag <https://github.com/jonschlinkert/html-tag>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

'use strict';

var typeOf = require('kind-of');
var isVoid = require('is-self-closing');

module.exports = function(tag, attribs, text) {
  var voided = text === false || attribs === false;

  if (typeOf(attribs) !== 'object') {
    text = attribs;
    attribs = {};
  }

  if (typeof text === 'undefined' || text === false) {
    text = '';
  }

  if (typeof text !== 'string') {
    throw new TypeError('expected text to be a string');
  }

  var html = '<' + tag;
  for (var key in attribs) {
    var val = attribs[key];
    if (val === true) {
      html += ' ' + key;
    }
    if (typeof val === 'string') {
      html += ' ' + key + '="' + val + '"';
    }
  }

  if (isVoid(tag) || voided === true) {
    return html + '>' + text;
  }

  return html + '>' + text + '</' + tag + '>';
};
