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
            '--tw-prose-body': '#363636',
            '--tw-prose-headings': '#040402',
            '--tw-prose-links': '#363636',
            '--tw-prose-bold': '#363636',
            '--tw-prose-counters': '#363636',
            '--tw-prose-bullets': '#363636',
            '--tw-prose-hr': '#363636',
            '--tw-prose-quotes': '#363636',
            '--tw-prose-quote-borders': '#363636',
            '--tw-prose-captions': '#363636',
            '--tw-prose-code': '#ec5c5c',
            '--tw-prose-pre-code': '#ec5c5c',
            '--tw-prose-pre-bg': '#363636',
            '--tw-prose-th-borders': '#363636',
            '--tw-prose-td-borders': '#363636',
            '--tw-prose-hr': '#E5E7EB',
            a: {
              color: '#363636',
            },
            strong: {
              color: '#363636',
            },
            p: {
              color: '#363636',
            },
            div: {
              color: '#363636',
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
