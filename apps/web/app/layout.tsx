import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
});

/**
 * Se lee en CADA request (generateMetadata corre en el servidor por
 * peticion), no se congela en el build: la misma imagen `kidcare-frontend`
 * sirve a cualquier cliente solo cambiando TENANT_NAME en su entorno.
 */
export async function generateMetadata(): Promise<Metadata> {
  const tenantName =
    process.env.TENANT_NAME ?? process.env.NEXT_PUBLIC_TENANT_NAME ?? 'KidCare';
  return {
    title: `${tenantName} · KidCare`,
    description:
      'Gestión diaria de la guardería: alumnos, salas, agenda y pagos.',
  };
}

export const viewport: Viewport = {
  themeColor: '#C45C3E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtimeConfig = {
    apiUrl:
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:3001/api',
    tenantName:
      process.env.TENANT_NAME ?? process.env.NEXT_PUBLIC_TENANT_NAME ?? 'KidCare',
  };

  return (
    <html lang="es" className={`${jakarta.variable} ${fraunces.variable}`}>
      <head>
        <script
          id="kidcare-runtime-config"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `window.__KIDCARE_CONFIG__ = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
