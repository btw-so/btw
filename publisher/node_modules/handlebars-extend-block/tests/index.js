var assert = require('assert');
var Handlebars = require('handlebars');
var extend = require('../');

suite('handlebars extend block');

test('should support extend block', function() {
    var source = '{{{block "test"}}}\n{{{body}}}\npost';
    var body = '{{#extend "test"}}foobar{{/extend}}';

    Handlebars = extend(Handlebars);

    var template = Handlebars.compile(source);
    var body_res = Handlebars.compile(body)();

    var result = template({
        body: body_res
    });

    assert.equal(result, 'foobar\n\npost');
});
