
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./gpt3-tokenizer.cjs.production.min.js')
} else {
  module.exports = require('./gpt3-tokenizer.cjs.development.js')
}
