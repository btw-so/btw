# Nano Colors

<img align="right" width="128" height="120"
     src="./img/logo.svg"
     title="Nano Colors logo by Roman Shamin">

A tiny and fast Node.js library to ANSI colors to terminal output.

>Started as a fork
> of [**@jorgebucaran**](https://github.com/jorgebucaran/)’s
> [`colorette`](https://github.com/jorgebucaran/colorette) with hacks
> from [**@lukeed**](https://github.com/lukeed/)’s
> [`kleur`](https://github.com/lukeed/kleur).
> See [changes](https://github.com/ai/nanocolors/wiki/Colorette-Changes)
> between Nano Colors and `colorette`.

* It is **4 times faster** than `chalk` for simple use cases.
* **No dependencies.** It takes **5 times less space** in `node_modules`
  than `chalk`.
* **Actively maintained.** Used in many big projects
  like PostCSS or Browserslist.
* **Auto-detects color support.** You can also toggle color mode manually.
* **Tree-shakable.** We use a dual [ESM]/[CJS] package.
* Supports Node.js ≥ 6 and universal Node.js/browser projects.

```js
import { green, bold } from 'nanocolors'

console.log(
  green(`Task ${bold('1')} was finished`)
)
```

<p align="center">
  <img src="./img/example.png" alt="Nano Colors output" width="600">
</p>

<a href="https://evilmartians.com/?utm_source=nanocolors">
  <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg"
       alt="Sponsored by Evil Martians" width="236" height="54">
</a>

[ESM]: https://github.com/ai/nanocolors/blob/main/index.js
[CJS]: https://github.com/ai/nanocolors/blob/main/index.cjs


## Docs
Read **[full docs](https://github.com/ai/nanocolors#readme)** on GitHub.
