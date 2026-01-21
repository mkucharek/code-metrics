/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // GitHub-like contribution heatmap colors
        'contribution-0': '#ebedf0',
        'contribution-1': '#9be9a8',
        'contribution-2': '#40c463',
        'contribution-3': '#30a14e',
        'contribution-4': '#216e39',
      },
    },
  },
  plugins: [],
};
