module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        black: {
          900: '#040402',
          DEFAULT: '#040402',
        }
      },
      gridTemplateColumns: {
        '52': 'repeat(52, minmax(0, 1fr))',
        '53': 'repeat(53, minmax(0, 1fr))',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#040402',
            '--tw-prose-body': '#333333',
            '--tw-prose-headings': '#040402',
            '--tw-prose-links': '#333333',
            '--tw-prose-bold': '#333333',
            '--tw-prose-counters': '#333333',
            '--tw-prose-bullets': '#333333',
            '--tw-prose-hr': '#333333',
            '--tw-prose-quotes': '#333333',
            '--tw-prose-quote-borders': '#333333',
            '--tw-prose-captions': '#333333',
            '--tw-prose-code': '#ec5c5c',
            '--tw-prose-pre-code': '#ec5c5c',
            '--tw-prose-pre-bg': '#333333',
            '--tw-prose-th-borders': '#333333',
            '--tw-prose-td-borders': '#333333',
            '--tw-prose-hr': '#E5E7EB',
            a: {
              color: '#333333',
            },
            strong: {
              color: '#333333',
            },
            p: {
              color: '#333333',
            },
            div: {
              color: '#333333',
            },
          },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("tailwindcss-safe-area")
  ],
};
