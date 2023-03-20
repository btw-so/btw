/**
 * year <https://github.com/jonschlinkert/year>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(pattern) {
  var year = new Date().getUTCFullYear().toString();
  if (typeof pattern !== 'string') {
    return year;
  }

  if (/[Yy]{4}/.test(pattern)) {
    return year;
  }

  if (/[Yy]{2}/.test(pattern)) {
    return year.substr(2, 2);
  }
};