// import { TextDecoder } from 'util';

if (typeof TextDecoder === 'undefined') {
  throw new Error(
    'TextDecoder is required for this module to work in the browser'
  );
}

// @ts-ingore
export default TextDecoder;
