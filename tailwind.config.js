// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skblue: "#0056b3",   // SK Primary Blue
        skred: "#d62828",    // SK Red
        skyellow: "#ffd60a", // SK Yellow
      },
    },
  },
  plugins: [],
}
