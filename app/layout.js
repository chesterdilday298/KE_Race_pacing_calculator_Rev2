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
