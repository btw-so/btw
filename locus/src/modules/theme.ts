import is from 'is-lite';
import { getTheme, px } from 'styled-minimal';

export const headerHeight = 70;

export const appColor = '#00b4d5';

export const easing = 'cubic-bezier(0.35, 0.01, 0.77, 0.34);';

const theme = getTheme({
  button: {
    borderRadius: {
      xs: 4,
      lg: 28,
      xl: 32,
    },
    padding: {
      lg: [12, 28],
      xl: [14, 32],
    },
  },
});

export const variants = theme.colors;
export const spacer = (value: number | string): string =>
  px(is.string(value) ? value : theme.space[value]);

export default theme;
