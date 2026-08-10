import './globals.css';
import { PlayerProvider } from '../context/PlayerContext';
import BottomNav from '../components/BottomNav';
import LoadingSplash from '../components/LoadingSplash';
import PageTransition from '../components/PageTransition';

export const metadata = {
  title: 'Taaj Music',
  description: 'Upload and stream music',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <meta name="theme-color" content="#0b0e20" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('taaj-theme');
                  var theme = saved || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <LoadingSplash />
        <PlayerProvider>
          <PageTransition>{children}</PageTransition>
        </PlayerProvider>
        <BottomNav />
      </body>
    </html>
  );
            }
