import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata = {
  title: 'Keystone Endurance - Race Pacing Calculator',
  description: 'Optimize your race-day execution with science-backed pacing strategies for triathlons and distance running.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

body {
  overflow-x: hidden;
  max-width: 100vw;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Inter', sans-serif;
}

input, select, button {
  font-family: 'Inter', sans-serif;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border-radius: 8px;
  box-sizing: border-box;
}

input, select {
  font-size: 16px !important;
  touch-action: manipulation;
}

button {
  touch-action: manipulation;
  cursor: pointer;
}

/* Hide number input spinners (except custom distances) */
input[type="number"]:not(.keep-spinner)::-webkit-outer-spin-button,
input[type="number"]:not(.keep-spinner)::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"]:not(.keep-spinner) {
  -moz-appearance: textfield;
}

/* Range slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: #ddd;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #D62027;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #D62027;
  cursor: pointer;
  border: none;
}
