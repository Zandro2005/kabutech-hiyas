import { create } from 'twrnc';

const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        'brand-deep': '#032514',
        'surface-container-lowest': '#ffffff',
        'success-green': '#16a34a',
        'error-red': '#dc2626',
        'brand-light': '#adf2bc',
        'surface': '#f8fafc',
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular', 'sans-serif'],
        bold: ['PlusJakartaSans_700Bold', 'sans-serif'],
        extrabold: ['PlusJakartaSans_800ExtraBold', 'sans-serif'],
      },
    },
  },
};

const tw = create(tailwindConfig);
export default tw;
