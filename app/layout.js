import './globals.css';
import { PlayerProvider } from '../context/PlayerContext';
import BottomNav from '../components/BottomNav';

export const metadata = {
  title: 'Taaj Music',
  description: 'Upload and stream music',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
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
        <PlayerProvider>{children}</PlayerProvider>
        <BottomNav />
      </body>
    </html>
  );
            }
