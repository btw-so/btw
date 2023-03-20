/*!
 * get-object <https://github.com/jonschlinkert/get-object>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT License
 */

'use strict';

var isNumber = require('is-number');

module.exports = function getObject(obj, prop) {
  if (!prop) return obj;
  if (!obj) return {};
  var segs = String(prop).split(/[[.\]]/).filter(Boolean);
  var last = segs[segs.length  - 1], res = {};
  while (prop = segs.shift()) {
    obj = obj[prop];
    if (!obj) return {};
  }
  if (isNumber(last)) return [obj];
  res[last] = obj;
  return res;
};
