const test = require('tape')
const AKM = require('./main.js')
const assert = require('assert')

test('empty', (t) => {
  const p = new AKM()
  t.ok(typeof p.set === 'function', 'set is a function')
  t.ok(typeof p.get === 'function', 'get is a function')
  t.same(
    p.get(['a', 'b']),
    undefined,
    'getting path gives undefined')
  t.end()
})

test('set/get path len 0', (t) => {
  const p = new AKM()
  p.set([], true)
  t.same(p.get([]), true)
  t.end()
})

test('set/get path len 1', (t) => {
  const p = new AKM()
  p.set(['a'], true)
  t.same(p.get(['a']), true)
  t.end()
})

test('set/get path len 2', (t) => {
  const p = new AKM()
  p.set(['a', 'b'], true)
  t.same(p.get(['a', 'b']), true)
  t.end()
})

test('empty strings are ok', (t) => {
  const p = new AKM()
  p.set(['', ''], true)
  t.same(p.get(['']), undefined)
  t.same(p.get(['', '']), true)
  t.end()
})

test('set returns self, allowing chaining', (t) => {
  const p = new AKM()
  p
    .set(['a'], true)
    .set(['a', 'b'], true)
  t.same(p.get(['a']), true)
  t.same(p.get(['a', 'b']), true)
  t.end()
})

test('any objects work as keys or values', (t) => {
  const objects = [
    new Map(),
    new WeakMap(),
    new Set(),
    {},
    ['a'],
    Symbol('test'),
    Math.PI,
    'hello world',
    false,
    0,
    () => {}
  ]

  const p = new AKM()
  const str = (x) => Object.prototype.toString.call(x).slice(8, -1)

  // Try all combinations of two things from the pool of objects as array elements, and values
  objects.forEach((k1) => {
    objects.forEach((k2) => {
      objects.forEach((value) => {
        p.set([k1, k2], value)
        t.same(
          p.get([k1, k2]),
          value,
          `[${str(k1)}, ${str(k2)}] => ${str(value)}`)
      })
    })
  })

  // Try all of them as length-1 paths
  objects.forEach((k) => {
    objects.forEach((value) => {
      p.set([k], value)
      t.same(
        p.get([k]),
        value,
        `[${str(k)}] => ${str(value)}`)
    })
  })

  // The last values set to the length-2 paths should all still be set
  const shouldBeValue = objects[objects.length - 1]
  objects.forEach((k1) => {
    objects.forEach((k2) => {
      t.same(
        p.get([k1, k2]),
        shouldBeValue,
        `[${str(k1)}, ${str(k2)}] => still ${str(shouldBeValue)}`)
    })
  })

  t.end()
})

test('set and delete empty path', (t) => {
  const p = new AKM()

  p.set([], true)

  p.delete([])
  t.same(p.get([]), undefined)
  p.set([], true) // Shouldn't throw
  t.end()
})

test('attempting to delete non-existent path', (t) => {
  const p = new AKM()

  t.same(p.delete([]), false)
  t.same(p.size, 0)
  t.end()
})

test('delete longer paths', (t) => {
  const p = new AKM()

  const paths = [
    [],
    ['a'],
    ['a', 'b'],
    ['a', 'b', 'c']
  ]

  paths.forEach((path) => {
    p.set(path, true)
    p.delete(path)
    t.same(p.get(path), undefined,
      `${JSON.stringify(path)} can be deleted`)
  })

  t.end()
})

test('deleting longer paths doesn\'t affect prefixes', (t) => {
  const p = new AKM()

  p.set(['a', 'b'], 'ab')
  p.set(['a'], 'a')

  p.delete(['a', 'b'])
  t.same(p.get(['a']), 'a')

  t.end()
})

test('deleting shorter paths doesn\'t affect longer continuations', (t) => {
  const p = new AKM()

  p.set(['a', 'b'], 'ab')
  p.set(['a'], 'a')

  p.delete(['a'])
  t.same(p.get(['a', 'b']), 'ab')

  t.end()
})

test('delete return value', t => {
  const p = new AKM()

  p.set(['x'], 'x')
  t.same(p.delete(['x']), true, 'delete returns true when entry existed')
  t.same(p.delete(['x']), false, 'delete returns false when no entry existed')

  t.end()
})

test('has', (t) => {
  const p = new AKM()

  p.set(['a', 'b'], 'ab')

  t.same(p.has(['a', 'b']), true)
  t.same(p.has(['a']), false)

  p.set(['a'], 'a')
  t.same(p.has(['a']), true)

  t.end()
})

test('size', (t) => {
  const p = new AKM()

  p.set(['a', 'b', 'c'], 'abc')
  t.same(p.size, 1)

  p.set(['a'], 'a')
  t.same(p.size, 2)

  p.set(['a', 'd'], 'ad')
  t.same(p.size, 3)

  p.delete(['a'])
  t.same(p.size, 2)

  p.size = 0
  t.same(p.size, 2)

  t.end()
})

test('clear', (t) => {
  const p = new AKM()

  p.set(['a', 'b', 'c'], 'abc')
  p.set(['a'], 'a')
  p.set(['a', 'd'], 'ad')
  t.same(p.size, 3)

  p.clear()

  t.same(p.size, 0)
  t.same(p.has(['a', 'b', 'c']), false)
  t.same(p.has(['a']), false)
  t.same(p.has(['a', 'd']), false)

  t.end()
})

test('iterators', (t) => {
  const p = new AKM()

  const key1 = []
  const value1 = 'empty path'
  p.set(key1, value1)

  const key2 = ['b']
  const value2 = 'b'
  p.set(key2, value2)

  const key3 = ['a']
  const value3 = 'a'
  p.set(key3, value3)

  const key4 = ['b', 'a']
  const value4 = 'ba'
  p.set(key4, value4)

  // We don't guarantee any particular order in which entries are emitted by
  // iterators.  So to make this test work even if the implementation changes,
  // we specifically disregard order when checking them.
  function containsAllOf (t, array, expectedItems) {
    t.same(
      array.length,
      expectedItems.length,
      'Iterator has right number of elements')

    expectedItems.forEach(expectedItem => {
      const wasFound = array.some(actualItem => {
        try {
          assert.deepStrictEqual(actualItem, expectedItem)
        } catch (e) {
          if (e instanceof assert.AssertionError) return false
          else throw e
        }
        return true
      })
      t.ok(wasFound, `Iterator contains ${JSON.stringify(expectedItem)}`)
    })
  }

  test('entries', (t) => {
    containsAllOf(t, [...p.entries()], [
      [key1, value1],
      [key2, value2],
      [key3, value3],
      [key4, value4]
    ])
    t.end()
  })

  test('@@iterator', (t) => {
    containsAllOf(t, Array.from(p), [
      [key1, value1],
      [key2, value2],
      [key3, value3],
      [key4, value4]
    ])
    t.end()
  })

  test('keys', (t) => {
    containsAllOf(t, [...p.keys()], [
      key1, key2, key3, key4
    ])
    t.end()
  })

  test('values', (t) => {
    containsAllOf(t, [...p.values()], [
      value1, value2, value3, value4
    ])
    t.end()
  })

  test('forEach', (t) => {
    const kvs = []
    const thisValue = {}
    const forEachReturnValue = p.forEach(
      function () {
        kvs.push({ thisValue: this, args: Array.from(arguments) })
      },
      thisValue)
    t.same(forEachReturnValue, undefined)
    containsAllOf(t, kvs, [
      { thisValue, args: [value1, key1, p] },
      { thisValue, args: [value2, key2, p] },
      { thisValue, args: [value4, key4, p] },
      { thisValue, args: [value3, key3, p] }
    ])
    t.end()
  })

  t.end()
})

test('hasPrefix', (t) => {
  // Even the empty map has the empty prefix
  const pEmpty = new AKM()

  t.ok(pEmpty.hasPrefix([]))

  // - - -

  const p = new AKM()
  p.set(['a', 'b', 'c'], 'abc')
  p.set(['c'], 'c')

  t.ok(p.hasPrefix([]))
  t.ok(p.hasPrefix(['a']))
  t.ok(p.hasPrefix(['a', 'b']))
  t.ok(p.hasPrefix(['a', 'b', 'c']))
  t.ok(!p.hasPrefix(['a', 'b', 'c', 'd']))
  t.ok(!p.hasPrefix(['b']))
  t.ok(p.hasPrefix(['c']))

  t.end()
})

test('constructor property', (t) => {
  const p = new AKM()
  t.same(p.constructor, AKM)
  t.end()
})

test('@@toStringTag property', (t) => {
  const p = new AKM()
  t.same(Object.prototype.toString.call(p), '[object ArrayKeyedMap]')
  t.end()
})

test('construct copy by passing entries of previous to constructor', (t) => {
  const p1 = new AKM()
  p1.set(['a', 'b'], 'ab')
  p1.set(['c'], 'c')
  const p2 = new AKM(p1.entries())
  t.same(p2.get(['a', 'b']), 'ab')
  t.same(p2.get(['c']), 'c')
  t.end()
})
