module.exports = {
  mode: 'jit',
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        red: {
          // https://www.w3schools.com/colors/colors_picker.asp with #b02121
          50: '#f7d4d4',
          100: '#f3bfbf',
          200: '#eb9494',
          300: '#e77e7e',
          400: '#e26969',
          500: '#de5454',
          600: '#da3e3e',
          700: '#d62929',
          800: '#c12525',
          900: '#b02121',
        },
      },
    },
    fontFamily: {
      crimson: '"Crimson Text"',
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
