import type { Metadata, Viewport } from 'next';
import { Quicksand } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
  display: 'swap',
});

const tenant = process.env.NEXT_PUBLIC_TENANT_NAME ?? 'KidCare';

export const metadata: Metadata = {
  title: `${tenant} · KidCare`,
  description: 'Gestión diaria de la guardería: alumnos, salas, agenda y pagos.',
};

export const viewport: Viewport = {
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={quicksand.variable}>
      <body className="min-h-dvh bg-background text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
