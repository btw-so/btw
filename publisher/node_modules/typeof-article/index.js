'use strict';

var typeOf = require('kind-of');
var types = {
  'arguments': 'an arguments object',
  'array': 'an array',
  'boolean': 'a boolean',
  'buffer': 'a buffer',
  'date': 'a date',
  'error': 'an error',
  'float32array': 'a float32array',
  'float64array': 'a float64array',
  'function': 'a function',
  'int16array': 'an int16array',
  'int32array': 'an int32array',
  'int8array': 'an int8array',
  'map': 'a Map',
  'null': 'null',
  'number': 'a number',
  'object': 'an object',
  'regexp': 'a regular expression',
  'set': 'a Set',
  'string': 'a string',
  'symbol': 'a symbol',
  'uint16array': 'an uint16array',
  'uint32array': 'an uint32array',
  'uint8array': 'an uint8array',
  'uint8clampedarray': 'an uint8clampedarray',
  'undefined': 'undefined',
  'weakmap': 'a WeakMap',
  'weakset': 'a WeakSet'
};

function type(val) {
  return types[typeOf(val)];
}

type.types = types;
type.typeOf = typeOf;

/**
 * Expose `type`
 */

module.exports = type;
