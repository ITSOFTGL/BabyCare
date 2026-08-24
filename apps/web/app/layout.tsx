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
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Igual que el titulo: leidos por el servidor Node en cada request, no
  // inlineados en el bundle del navegador como los NEXT_PUBLIC_* clasicos.
  const runtimeConfig = {
    apiUrl:
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:3001/api',
    tenantName:
      process.env.TENANT_NAME ?? process.env.NEXT_PUBLIC_TENANT_NAME ?? 'KidCare',
  };

  return (
    <html lang="es" className={quicksand.variable}>
      <head>
        <script
          id="kidcare-runtime-config"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `window.__KIDCARE_CONFIG__ = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-background text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
