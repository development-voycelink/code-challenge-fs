import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoyceLink | Call Center',
  description: 'Real-time call center dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
