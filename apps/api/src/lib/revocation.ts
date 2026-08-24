import { eq, getDb, lt, revokedTokens } from '@kidcare/db';

/** Marca un token como invalido antes de su expiracion natural (logout). */
export async function revokeToken(jti: string, expUnixSeconds: number) {
  const db = getDb();
  await db
    .insert(revokedTokens)
    .values({ jti, expiresAt: new Date(expUnixSeconds * 1000) })
    .onConflictDoNothing();

  // Aprovechamos la escritura para barrer revocaciones ya vencidas: el JWT
  // en si dejo de ser valido por expiracion, asi que la fila ya no aporta nada.
  await db.delete(revokedTokens).where(lt(revokedTokens.expiresAt, new Date()));
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ jti: revokedTokens.jti })
    .from(revokedTokens)
    .where(eq(revokedTokens.jti, jti))
    .limit(1);
  return Boolean(row);
}
