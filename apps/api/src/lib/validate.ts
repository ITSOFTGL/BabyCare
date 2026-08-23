import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

/** Parsea y valida el body JSON; responde 400 con detalle si no encaja. */
export async function parseBody<S extends z.ZodTypeAny>(
  c: Context,
  schema: S,
): Promise<z.infer<S>> {
  const raw = await c.req.json().catch(() => null);
  if (raw === null) {
    throw new HTTPException(400, { message: 'El body debe ser JSON valido' });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, {
      res: c.json(
        { error: 'Datos invalidos', details: result.error.flatten() },
        400,
      ),
    });
  }
  return result.data;
}

/** Valida los query params de la request. */
export function parseQuery<S extends z.ZodTypeAny>(
  c: Context,
  schema: S,
): z.infer<S> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    throw new HTTPException(400, {
      res: c.json(
        { error: 'Parametros invalidos', details: result.error.flatten() },
        400,
      ),
    });
  }
  return result.data;
}

export const uuidSchema = z.string().uuid('Identificador invalido');

/** Lee `:id` de la ruta y verifica que sea un UUID. */
export function paramId(c: Context, name = 'id'): string {
  const value = c.req.param(name);
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new HTTPException(400, { message: `Parametro ${name} invalido` });
  }
  return result.data;
}
