# GPT3 Tokenizer

[![Build](https://github.com/botisan-ai/gpt3-tokenizer/actions/workflows/main.yml/badge.svg)](https://github.com/botisan-ai/gpt3-tokenizer/actions/workflows/main.yml)
[![NPM Version](https://img.shields.io/npm/v/gpt3-tokenizer.svg)](https://www.npmjs.com/package/gpt3-tokenizer)
[![NPM Downloads](https://img.shields.io/npm/dt/gpt3-tokenizer.svg)](https://www.npmjs.com/package/gpt3-tokenizer)

This is a isomorphic TypeScript tokenizer for OpenAI's GPT-3 model. Including support for `gpt3` and `codex` tokenization. It should work in both NodeJS and Browser environments.
## Usage

First, install:

```shell
yarn add gpt3-tokenizer
```

In code:

```typescript
import GPT3Tokenizer from 'gpt3-tokenizer';

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' }); // or 'codex'
const str = "hello 👋 world 🌍";
const encoded: { bpe: number[]; text: string[] } = tokenizer.encode(str);
const decoded = tokenizer.decode(encoded.bpe);
```

## Reference

This library is based on the following:
- [OpenAI Tokenizer Page Source](https://beta.openai.com/tokenizer?view=bpe)
- [gpt-3-encoder](https://github.com/latitudegames/GPT-3-Encoder)

The main difference between this library and gpt-3-encoder is that this library supports both `gpt3` and `codex` tokenization (The dictionary is taken directly from OpenAI so the tokenization result is on par with the OpenAI Playground). Also Map API is used instead of JavaScript objects, especially the `bpeRanks` object, which should see some performance improvement.

## License

[MIT](./LICENSE)
