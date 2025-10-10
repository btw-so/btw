import { hasValidCache } from 'modules/helpers';

declare const navigator: any;

describe('modules/helpers', () => {
  describe('hasValidCache', () => {
    beforeAll(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    afterAll(() => {
      navigator.onLine = true;
    });

    it('should return properly', () => {
      expect(hasValidCache(1234567890 - 60 * 11)).toBe(false);
    });

    it('should return true if not onLine', () => {
      navigator.onLine = false;
      expect(hasValidCache(1234567890)).toBe(true);
    });
  });
});
