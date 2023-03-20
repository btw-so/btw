/**
 * year <https://github.com/jonschlinkert/year>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT license.
 */

'use strict';

var should = require('should');
var year = require('./');


describe('year()', function() {
  it('should return the current year:', function() {
    year().should.equal('2014');
  });

  it('should return the 2-digit current year when YY is passed:', function() {
    year('YY').should.equal('14');
  });

  it('should return the 4-digit current year when YYYY is passed:', function() {
    year('YYYY').should.equal('2014');
  });

  it('should return the 4-digit current year when yyyy is passed:', function() {
    year('yyyy').should.equal('2014');
  });
});