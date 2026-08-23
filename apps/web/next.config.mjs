import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para la imagen de produccion: empaqueta solo lo que hace falta.
  output: 'standalone',
  // El monorepo vive dos niveles mas arriba; sin esto el trazado de ficheros
  // del build standalone se queda dentro de apps/web y pierde los packages.
  outputFileTracingRoot: path.join(here, '../../'),
  // @kidcare/types se publica como TypeScript sin compilar.
  transpilePackages: ['@kidcare/types'],
  reactStrictMode: true,
};

export default nextConfig;
