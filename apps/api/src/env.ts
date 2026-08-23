function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  /** Se usa para firmar los JWT; en produccion debe tener >= 32 caracteres. */
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  /** Nombre de la guarderia de esta instancia; viaja al frontend por la API. */
  tenantName: process.env.TENANT_NAME ?? 'KidCare',
  /**
   * Origenes permitidos por CORS. En produccion cada instancia sirve web y API
   * bajo el mismo subdominio, asi que basta con listar ese origen.
   */
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  /**
   * Claves VAPID para Web Push (sin Firebase, es el protocolo estandar del
   * navegador). Opcionales a proposito: si faltan, lib/push.ts simplemente no
   * envia pushes (las notificaciones in-app siguen funcionando igual), asi
   * que la API no debe morir al arrancar por no tenerlas configuradas.
   */
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@kidcare.test',
};
