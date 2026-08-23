'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { TENANT_NAME } from '@/lib/api';
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-card bg-primary text-4xl shadow-lift">
            🧸
          </div>
          <h1 className="text-3xl font-bold text-primary">KidCare</h1>
          <p className="mt-1 text-sm font-medium text-ink/55">{TENANT_NAME}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-card bg-white p-6 shadow-soft"
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
