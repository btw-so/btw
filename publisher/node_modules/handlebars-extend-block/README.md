# handlebars-extend-block

Create extend blocks for handlebars allowing partials to inject text into parent elements. This is generally useful for script and style tags.

## example

```js
var handlebars = require('handlebars');
var extend = require('handlebars-extend-block');

handlebars = extend(handlebars);
```

Layout File
```html
<head>
    <title>{{title}}</title>
    <link rel='stylesheet' href='/css/style.css'>
    {{{block "stylesheets"}}}
</head>

<body>
    {{{body}}}

    <hr/>
    post body
    <hr/>

    {{{block "scripts"}}}
</body>
```

Partial
```html
{{#extend "stylesheets"}}
<link rel="stylesheet" href="/css/index.css"/>
{{/extend}}

let the magic begin

{{#extend "scripts"}}
<script>
document.write('foo bar!');
</script>
{{/extend}}
```
