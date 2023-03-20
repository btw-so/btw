# helper-date [![NPM version](https://img.shields.io/npm/v/helper-date.svg?style=flat)](https://www.npmjs.com/package/helper-date) [![NPM monthly downloads](https://img.shields.io/npm/dm/helper-date.svg?style=flat)](https://npmjs.org/package/helper-date) [![NPM total downloads](https://img.shields.io/npm/dt/helper-date.svg?style=flat)](https://npmjs.org/package/helper-date) [![Linux Build Status](https://img.shields.io/travis/helpers/helper-date.svg?style=flat&label=Travis)](https://travis-ci.org/helpers/helper-date)

> Format dates with date.js and moment.js. Uses date.js to parse human readable date phrases, and moment to format the rendered output. Should work with any Handlebars, Lo-Dash, underscore, or any template engine that allows helper functions to be registered. Also compatible with verb, assemble and Template.

Follow this project's author, [Jon Schlinkert](https://github.com/jonschlinkert), for updates on this project and others.

## Install

Install with [npm](https://www.npmjs.com/):

```sh
$ npm install --save helper-date
```

## Usage

With Handlebars:

```handlebars
{{date "5 years ago" "YYYY"}}
//=> 2010
```

With Lo-Dash or Underscore:

```js
<%= date("5 years ago", "YYYY") %>
//=> 2010
```

With Verb (lo-dash, with special delimiters to avoid delimiter collision in markdown docs):

```js
2012
//=> 2010
```

### [template](https://github.com/jonschlinkert/template)

Register the helper for use with any template engine

```js
template.helper('date', require('helper-date'));
```

### [assemble](https://github.com/assemble/assemble)

To register the helper for use with [assemble](https://github.com/assemble/assemble) v0.6.0 and greater:

```js
assemble.helper('date', require('helper-date'));
```

### [verb](https://github.com/verbose/verb)

Register the helper for use with [verb](https://github.com/verbose/verb):

```js
var verb = require('verb');
verb.helper('date', require('helper-date'));

verb.task('default', function() {
  verb.src('.verb*.md')
    .pipe(verb.dest('./'));
});
```

### [handlebars](http://www.handlebarsjs.com/)

```js
var handlebars = require('handlebars');
handlebars.registerHelper('date', require('helper-date'));
```
Usage

```handlebars
{{date "5 years ago" "YYYY"}}
```

### [lodash](https://lodash.com/) or [underscore](http://underscorejs.org)

```js
// as a mixin
_.mixin({date: dateHelper});
_.template('<%= _.date("5 years ago", "YYYY") %>', {});
//=> 2010

// passed on the context
_.template('<%= date("5 years ago", "YYYY") %>', {date: dateHelper});
//=> 2010

// as an import
var settings = {imports: {date: dateHelper}};
_.template('<%= date("5 years ago", "YYYY") %>', {}, settings);
//=> 2010
```

## About

### Related projects

You might also be interested in these projects:

* [handlebars-helper-moment](https://www.npmjs.com/package/handlebars-helper-moment): A helper to master time! Combining the powers of Assemble, Handlebars.js and Moment.js. This helper… [more](https://github.com/assemble/handlebars-helper-moment) | [homepage](https://github.com/assemble/handlebars-helper-moment "A helper to master time! Combining the powers of Assemble, Handlebars.js and Moment.js. This helper leverages Moment.js to provide ultimate control over manipulating time and dates in your templates.")
* [handlebars-helpers](https://www.npmjs.com/package/handlebars-helpers): More than 130 Handlebars helpers in ~20 categories. Helpers can be used with Assemble, Generate… [more](https://github.com/helpers/handlebars-helpers) | [homepage](https://github.com/helpers/handlebars-helpers "More than 130 Handlebars helpers in ~20 categories. Helpers can be used with Assemble, Generate, Verb, Ghost, gulp-handlebars, grunt-handlebars, consolidate, or any node.js/Handlebars project.")
* [helper-dateformat](https://www.npmjs.com/package/helper-dateformat): Template helper for adding formatted dates using node-dateformat. Works with Handlebars, Lo-Dash, underscore, or any… [more](https://github.com/helpers/helper-dateformat) | [homepage](https://github.com/helpers/helper-dateformat "Template helper for adding formatted dates using node-dateformat. Works with Handlebars, Lo-Dash, underscore, or any template engine that supports helper functions. Also compatible with verb, assemble and Template.")
* [template-helpers](https://www.npmjs.com/package/template-helpers): Generic JavaScript helpers that can be used with any template engine. Handlebars, Lo-Dash, Underscore, or… [more](https://github.com/jonschlinkert/template-helpers) | [homepage](https://github.com/jonschlinkert/template-helpers "Generic JavaScript helpers that can be used with any template engine. Handlebars, Lo-Dash, Underscore, or any engine that supports helper functions.")

### Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).

Please read the [contributing guide](.github/contributing.md) for advice on opening issues, pull requests, and coding standards.

### Contributors

| **Commits** | **Contributor** | 
| --- | --- |
| 20 | [jonschlinkert](https://github.com/jonschlinkert) |
| 1 | [bradtaylorsf](https://github.com/bradtaylorsf) |

### Building docs

_(This project's readme.md is generated by [verb](https://github.com/verbose/verb-generate-readme), please don't edit the readme directly. Any changes to the readme must be made in the [.verb.md](.verb.md) readme template.)_

To generate the readme, run the following command:

```sh
$ npm install -g verbose/verb#dev verb-generate-readme && verb
```

### Running tests

Running and reviewing unit tests is a great way to get familiarized with a library and its API. You can install dependencies and run tests with the following command:

```sh
$ npm install && npm test
```

### Author

**Jon Schlinkert**

* [github/jonschlinkert](https://github.com/jonschlinkert)
* [twitter/jonschlinkert](https://twitter.com/jonschlinkert)

### License

Copyright © 2017, [Jon Schlinkert](https://github.com/jonschlinkert).
Released under the [MIT License](LICENSE).

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.6.0, on September 04, 2017._