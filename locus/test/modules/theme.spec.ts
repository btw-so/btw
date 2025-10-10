import theme, { spacer, variants } from 'modules/theme';

describe('modules/theme', () => {
  describe('theme', () => {
    it('should return the theme', () => {
      expect(theme).toMatchSnapshot();
    });
  });

  describe('spacer', () => {
    it.each([
      [1, '4px'],
      [2, '8px'],
      [3, '16px'],
      [4, '32px'],
      [5, '64px'],
      [6, '128px'],
      ['10px', '10px'],
    ])('spacer(%p) should return %p', (amount, expected) => {
      expect(spacer(amount)).toBe(expected);
    });
  });

  describe('variants', () => {
    it('should return the variants', () => {
      expect(variants).toMatchSnapshot();
    });
  });
});
