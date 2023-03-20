'use strict';

var tags = require('self-closing-tags');

module.exports = function(name) {
  if (typeof name !== 'string') {
    throw new TypeError('expected name to be a string');
  }
  return tags.indexOf(name.toLowerCase()) !== -1;
};
