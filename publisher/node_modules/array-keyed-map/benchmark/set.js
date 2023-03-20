const Benchmark = require('benchmark')
const AKM = require('../main.js')

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')

new Benchmark.Suite()
  .add('1-item set', () => {
    const m = new AKM()
    for (const x of letters) {
      m.set([x], true)
    }
  })
  .add('100-item set', () => {
    const m = new AKM()
    for (const x of letters) {
      m.set(Array(100).fill(x), true)
    }
  })
  .on('cycle', ev => console.log(String(ev.target)))
  .run()
