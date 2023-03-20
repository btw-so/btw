'use strict';

var svgElements = [
  'circle',
  'ellipse',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'stop',
  'use'
];

var voidElements = [
  'area',
  'base',
  'br',
  'col',
  'command',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
];

module.exports = voidElements.concat(svgElements);
module.exports.voidElements = voidElements;
module.exports.svgElements = svgElements;
