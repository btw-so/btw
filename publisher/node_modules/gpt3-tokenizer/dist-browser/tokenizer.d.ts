export default abstract class GPT3Tokenizer {
    private vocab;
    private nMergedSpaces;
    private nVocab;
    private encodings;
    private decodings;
    private byteEncoder;
    private byteDecoder;
    private bpeRanks;
    private cache;
    constructor(options: {
        type: 'gpt3' | 'codex';
    });
    initialize(): void;
    zip<X, Y>(result: Map<X, Y>, x: X[], y: Y[]): Map<X, Y>;
    bytesToUnicode(): Map<number, string>;
    getPairs(word: string[]): Set<[string, string]>;
    bpe(token: string): string;
    abstract encodeUtf8(text: string): Uint8Array;
    encode(text: string): {
        bpe: number[];
        text: string[];
    };
    abstract decodeUtf8(bytes: Uint8Array): string;
    decode(tokens: number[]): string;
}
