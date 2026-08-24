'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getTenantName } from '@/lib/api';
import { Button, ErrorText, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesion activa no tiene sentido volver a pedir credenciales.
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No pudimos iniciar sesión',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Manchas de color muy tenues detras de la card: sin ellas la pagina
          era un card flotando en un mar de crema vacio. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-secondary/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 animate-float items-center justify-center rounded-card bg-primary text-4xl shadow-lift">
            🧸
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            KidCare
          </h1>
          <p className="mt-1 text-sm font-medium text-ink/55">{getTenantName()}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-card bg-white p-6 shadow-lift ring-1 ring-ink/[0.04] sm:p-7"
        >
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              required
              placeholder="directora@kidcare.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Contraseña">
            <Input
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <ErrorText>{error}</ErrorText>

          <Button type="submit" loading={submitting} className="w-full">
            Entrar 👋
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-ink/40">
          ¿No tienes cuenta? Pídesela a la dirección de la guardería.
        </p>
      </div>
    </main>
  );
}
