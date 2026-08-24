function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

const jwtTtlDays = Number(process.env.JWT_TTL_DAYS ?? 7);

export const env = {
  port: Number(process.env.PORT ?? 3001),
  /** Se usa para firmar los JWT; en produccion debe tener >= 32 caracteres. */
  jwtSecret: required('JWT_SECRET'),
  /** Mismo TTL expresado como lo necesita cada consumidor: jose (duracion) y la cookie (segundos). */
  jwtExpiresIn: `${jwtTtlDays}d`,
  jwtExpiresInSeconds: jwtTtlDays * 24 * 60 * 60,
  /** Nombre de la guarderia de esta instancia; viaja al frontend por la API. */
  tenantName: process.env.TENANT_NAME ?? 'KidCare',
  /**
   * Origenes permitidos por CORS. Con cookies httpOnly + credentials:true no
   * se puede usar '*' (los navegadores lo rechazan), asi que en produccion
   * cada instancia debe listar su propio subdominio explicitamente.
   */
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  /** HTTPS obligatorio para la cookie de sesion; desactivalo solo en dev local sin TLS. */
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production',
  /**
   * Limites de /auth/login en una ventana de 15 minutos. El de IP es
   * generoso a proposito: varias profesoras de la MISMA guarderia suelen
   * compartir el WiFi de la oficina (misma IP publica hacia Cloudflare), asi
   * que un limite bajo bloquearia uso legitimo. El de email es el que hace
   * el trabajo real contra fuerza bruta, por eso es mucho mas estricto.
   */
  loginMaxPerIp: Number(process.env.LOGIN_MAX_PER_IP ?? 40),
  loginMaxPerEmail: Number(process.env.LOGIN_MAX_PER_EMAIL ?? 5),
  /**
   * Claves VAPID para Web Push (sin Firebase, es el protocolo estandar del
   * navegador). Opcionales a proposito: si faltan, lib/push.ts simplemente no
   * envia pushes (las notificaciones in-app siguen funcionando igual), asi
   * que la API no debe morir al arrancar por no tenerlas configuradas.
   */
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@kidcare.test',
  /**
   * Carpeta donde se guardan archivos generados (facturas en PDF). Debe
   * apuntar a un volumen persistente: sin uno, cada redeploy borraria las
   * facturas ya emitidas (ver docker-compose.dev.yml / deployments/_template).
   */
  storageDir: process.env.STORAGE_DIR ?? './storage',
};
