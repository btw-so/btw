const benchmark = require('benchmark')
const AKM = require('../main.js')

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')

const lettersMap = new AKM()
for (const x of letters) lettersMap.set(Array(100).fill(x), true)

new benchmark.Suite()
  .add('100-item get', () => {
    for (const x of letters) lettersMap.get(Array(100).fill(x))
  })
  .on('cycle', ev => console.log(String(ev.target)))
  .run()
