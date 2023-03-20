'use strict';

var createFrame = require('create-frame');
var isObject = require('isobject');

/**
 * Block helper for exposing private `@` variables on the context
 */

module.exports = function(context, options) {
  if (isObject(context) && context.hash) {
    options = context;
    context = options.data;
  }

  var frame = createFrame(context);
  if (!isObject(options)) {
    options = {};
  }

  // extend the frame with hash arguments
  frame.extend(options.hash);
  return options.fn(this, {data: frame});
};
