/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: "#00b4d5",
                    50: "#ecfeff",
                    100: "#cffafe",
                    200: "#a5f3fc",
                    300: "#67e8f9",
                    400: "#22d3ee",
                    500: "#00b4d5",
                    600: "#0891b2",
                    700: "#0e7490",
                    800: "#155e75",
                    900: "#164e63",
                },
            },
            fontFamily: {
                sans: ['"Inter"', "system-ui", "sans-serif"],
                display: ['"Satoshi"', '"Inter"', "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};
