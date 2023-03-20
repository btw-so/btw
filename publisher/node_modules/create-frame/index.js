/*!
 * create-frame <https://github.com/jonschlinkert/create-frame>
 *
 * Copyright (c) 2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */

'use strict';

var utils = require('./utils');

module.exports = function createFrame(data) {
  if (!utils.isObject(data)) {
    throw new TypeError('createFrame expects data to be an object');
  }

  var extend = utils.extend;
  var frame = extend({}, data);
  frame._parent = data;

  utils.define(frame, 'extend', function(data) {
    extend(this, data);
  });

  if (arguments.length > 1) {
    var args = [].slice.call(arguments, 1);
    var len = args.length, i = -1;
    while (++i < len) {
      frame.extend(args[i] || {});
    }
  }
  return frame;
};
