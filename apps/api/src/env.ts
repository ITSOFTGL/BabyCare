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
};
