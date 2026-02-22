import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Imposter Word Game',
  description: 'A real-time multiplayer word deduction game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-game-bg font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
