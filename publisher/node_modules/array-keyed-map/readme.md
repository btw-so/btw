# array-keyed-map [![](https://img.shields.io/npm/v/array-keyed-map.svg?style=flat-square)](https://www.npmjs.com/package/array-keyed-map) [![](https://img.shields.io/travis/anko/array-keyed-map.svg?style=flat-square)](https://travis-ci.org/anko/array-keyed-map) [![](https://img.shields.io/coveralls/github/anko/array-keyed-map?style=flat-square)](https://coveralls.io/github/anko/array-keyed-map) ![](https://img.shields.io/endpoint?url=https://untitled-2flzixuijb4j.runkit.sh/array-keyed-map&style=flat-square&cacheSeconds=3600)

A map data structure (a.k.a. associative array, dictionary) which maps from
arrays of arbitrary values ("paths") to arbitrary values.  Like if the JS
built-in [`Map`][map] took arrays as keys.  Uses the key objects' identities;
does not stringify anything, [because that way lies madness](#faq).

<!-- !test program node test-readme-example.js -->

<!-- !test check initial example -->

```js
const ArrayKeyedMap = require('array-keyed-map')
const m = new ArrayKeyedMap()

const obj = { x: true }
const objIdentical = { x: true }
const fun = function() {}
const reg = /regexp/

// Set values
m.set([obj],            1)
m.set([obj, fun],       2)
m.set([reg, reg, true], 3)
m.set([],               4)

// Get values
console.log( m.get([obj]) )            // => 1
console.log( m.get([objIdentical]) )   // => undefined
console.log( m.get([obj, fun]) )       // => 2
console.log( m.get([reg, reg, true]) ) // => 3
console.log( m.get([]) )               // => 4
```

Features:

- Implements all the same methods as [`Map`][map], with the only API difference
  of *not iterating in insertion order*.
- Stores paths compactly as a tree.  Shared prefixes are stored once only.
- Algorithms are iterative, because it's faster than recursive.  (I checked.)
- Thoroughly unit-tested.
- No dependencies.

## API

### `new ArrayKeyedMap([iterable])`

**Arguments:**

 - (optional) `iterable`: any iterable value of `[key, value]` entries from
   which to initialise contents

**Returns** ArrayKeyedMap `akmap`.

Array keyed maps are iterable, so you can use them in `for`-loops, pass them to
`Array.from`, pass them into the constructor to create a copy (`let copy = new
ArrayKeyedMap(akmap)`), etc.  (See [`.entries`](#akmapentries).)

### `akmap.set(array, value)`

**Arguments:**

 - `array`: `Array` of values
 - `value`: any value

Sets the value for the given array.

Objects in the array are treated by identity.  The identity of the array object
itself is irrelevant.

**Returns** ArrayKeyedMap `akmap`: a reference to the same map, handy for
chaining multiple `.set` calls.

### `akmap.has(array)`

**Arguments:**

 - `array`: `Array` of values

**Returns** a Boolean: whether a previously set value exists for that key array.

### `akmap.get(array)`

**Arguments:**

 - `array`: `Array` of values

**Returns** the previously assigned value for this array, or `undefined` otherwise.

### `akmap.delete(array)`

**Arguments:**

 - `array`: `Array` of values

Deletes the value at this exact array.  Does not affect other array, even if
they are prefixes or extensions of this one.  Remember to do this if you no
longer need a array: the keys and values are not automatically
garbage-collected, even if the objects used as keys go out of scope!

**Returns** a Boolean: `true` if an entry with that key existed and was
deleted, or `false` if no such entry was found.

### `akmap.clear()`

Deletes all entries from `akmap`.

**Returns** `undefined`.

### `akmap.hasPrefix(array)`

**Arguments:**

 - `array`: `Array` of values

**Returns** a Boolean: whether the map has some key starting with values
matching the given array.

### `akmap.entries()`

**Returns** an iterator that yields `[key, value]` for every entry in `akmap`.

:warning: Note that these are in *arbitrary order; __not__ insertion order*!
This differs from the basic `Map`!

### `akmap.keys()`

**Returns** an iterator that yields the key part (type `Array`) of each entry
in `akmap`.

:warning: Note that these are in *arbitrary order; __not__ insertion order*!
This differs from the basic `Map`!

### `akmap.values()`

**Returns** an iterator that yields the value part of each entry in `akmap`.

:warning: Note that these are in *arbitrary order; __not__ insertion order*!
This differs from the basic `Map`!

### `akmap.forEach(callback[, thisArg])`

**Arguments**:

 - `callback`:  `Function` that will be called for each entry in `akmap`,
   passing the value, key, and map as arguments.
 - (optional) `thisArg`: `Object` passed to the `callback` as the value for
   `this`.

**Returns** `undefined`.

:warning: Note that these are in *arbitrary order; __not__ insertion order*!
This differs from the basic `Map`!

## Performance characteristics

- The paths are stored as a tree.  If multiple paths are stored that share a
  prefix, the prefix is not duplicated in storage, but shared between them.
  For example: `['a', 'b']` and `['a', 'c']` have a shared prefix `['a']`.
  Only 1 instance of `'a'` is stored, with `'b'` and `'c'` branching from it.

  This means any operation involving a path scales linearly with that path's
  length, as it is traversed.

- `.size` is cached, so it does not traverse the data structure.

- The algorithms are implemented iteratively, because the VM stack is faster
  than a JS stack.

## FAQ

### Why is this better than stringify → `.join('/')` → regular `Map`?

 1. Because you might want your key array to contain objects (by identity)
    rather than strings, and objects cannot be stringified by identity, so
    identical objects would get mixed up.  But this module can handle that:

    <!-- !test check by identity -->

    ```js
    let akmap = new ArrayKeyedMap()
    // These are distinct paths!
    const path1 = [{}, {}, {}]
    const path2 = [{}, {}, {}]
    akmap.set(path1, 1)
    akmap.set(path2, 2)
    console.log(akmap.get(path1)) // → 1
    console.log(akmap.get(path2)) // → 2
    ```

 2. Even if you only care about the object's content (and not identity),
    objects may contain cyclic references, which can't be stringified in
    isolation.  But this module can handle that.

    <!-- !test check cyclic -->

    ```js
    const akmap = new ArrayKeyedMap()
    const cyclic = {}
    // Contains a reference to itself.  How would you stringify this?
    cyclic.x = cyclic
    akmap.set([ cyclic ], 1)
    console.log(akmap.get([ cyclic ])) // → 1
    ```

 3. Even if you are only using string keys, the separator you choose (e.g. `/`)
    may appear as part of your path elements, so the arrays `['a/b']` and
    `['a', 'b']` would both resolve to the key `a/b` and overwrite each other.

    So use a separator other than `/`?  Sure, but then you have the same
    problem with elements possibly containing *that*.

    So use a sufficiently long probabilistically unguessable separator like
    `03f2a8291a700b95904190583dba17c4ae1bf3bdfc2834391d60985ac6724940`?  That
    wastes RAM/disk.  Also this is the code police speaking, you are under
    assert for crimes against humanity, go to BSD jail.

So please use this module instead of a hack.

### What version of JS does this rely on?

ES2015 I think—it uses
[`Map`](http://kangax.github.io/compat-table/es6/#test-Map)s and
[`Symbol`](http://kangax.github.io/compat-table/es6/#test-Symbol)s (← caniuse
links).  At time of writing, it works in any recent Node.js or browser.  Except
IE, of course.

## Development

Pull requests with improvements of any size are appreciated.  If anything about
the code or documentation is unclear, do ask.

To install the testing dependencies, run `npm install`.

To run the automated tests and coding style check, run `npm test`.

## License

[ISC](https://opensource.org/licenses/isc).

[map]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
