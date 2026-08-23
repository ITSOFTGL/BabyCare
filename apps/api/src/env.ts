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
};
