import { eq, getDb, users } from '@kidcare/db';
import { suggestEmail } from '@kidcare/types';
import { hashPassword } from './password.ts';

export async function uniqueEmail(fullName: string, preferred?: string | null) {
  const db = getDb();
  const base = (preferred?.trim().toLowerCase() || suggestEmail(fullName)).toLowerCase();
  const [local, domain = 'guarderia.test'] = base.split('@');
  let candidate = `${local}@${domain}`;
  for (let i = 0; i < 50; i++) {
    const [found] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, candidate))
      .limit(1);
    if (!found) return candidate;
    candidate = `${local}${i + 2}@${domain}`;
  }
  return `${local}.${Date.now()}@${domain}`;
}

export async function createLoginUser(input: {
  name: string;
  email: string;
  password: string;
  role: 'profesora' | 'auxiliar' | 'padre';
  phone?: string | null;
}) {
  const [created] = await getDb()
    .insert(users)
    .values({
      email: input.email.toLowerCase().trim(),
      passwordHash: await hashPassword(input.password),
      name: input.name.trim(),
      role: input.role,
      phone: input.phone ?? null,
    })
    .returning();
  return created!;
}
