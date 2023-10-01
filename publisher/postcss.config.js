const tailwindcss = require('tailwindcss')
const autoprefixer = require('autoprefixer')

module.exports = {
  plugins: [
    tailwindcss('./tailwind.config.js'),
    process.env.NODE_ENV === 'production' ? autoprefixer : null,
  ],
}
