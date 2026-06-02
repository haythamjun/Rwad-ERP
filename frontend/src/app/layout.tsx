import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Roya - رؤية', template: '%s | Roya - رؤية' },
  description: 'نظام إدارة مركز التأهيل - رؤية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                fontFamily: 'Tajawal, sans-serif',
                direction: 'rtl',
              },
              success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
