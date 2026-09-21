import './globals.css';
import Providers from '../components/Providers';

export const metadata = {
  title: 'نظام متابعة يمن نت | Yemen Net Monitor',
  description: 'نظام احترافي لمتابعة اشتراكات ADSL يمن نت',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
