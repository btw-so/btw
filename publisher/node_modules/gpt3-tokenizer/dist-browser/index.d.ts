import GPT3Tokenizer from './tokenizer';
export default class GPT3NodeTokenizer extends GPT3Tokenizer {
    private textEncoder;
    private textDecoder;
    constructor(options: {
        type: 'gpt3' | 'codex';
    });
    encodeUtf8(text: string): Uint8Array;
    decodeUtf8(bytes: Uint8Array): string;
}
