'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getTenantName } from '@/lib/api';
import { BrandMark } from '@/components/icons';
import { Button, ErrorText, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <main className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink text-surface lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-10 right-0 h-72 w-72 rounded-full bg-gold/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center gap-3 text-primary-light">
            <BrandMark size={44} className="text-primary" />
            <span className="font-display text-2xl font-semibold tracking-tight text-surface">
              KidCare
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-gold-light/80">
            {getTenantName()}
          </p>
        </div>

        <div className="relative max-w-md">
          <p className="font-display text-4xl font-semibold leading-[1.15] tracking-tight text-balance xl:text-5xl">
            El día a día de la casa, con la calma de un atelier.
          </p>
          <p className="mt-6 text-base leading-relaxed text-surface/70">
            Alumnos, equipo, agenda y pagos en un solo lugar. Pensado para
            directoras que quieren cuidar sin perder el detalle.
          </p>
          <ul className="mt-10 space-y-3 text-sm text-surface/65">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Fichas médicas y personas autorizadas
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Agenda diaria visible para las familias
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Cobros, facturas y comunicados
            </li>
          </ul>
        </div>

        <p className="relative text-xs tracking-wide text-surface/40">
          KidCare · gestión boutique para guarderías
        </p>
      </aside>

      <section className="relative flex flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl lg:hidden"
        />

        <div className="relative w-full max-w-[400px] animate-fade-up">
          <div className="mb-10 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <BrandMark size={42} className="text-primary" />
              <span className="font-display text-2xl font-semibold text-ink">
                KidCare
              </span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Bienvenida
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
              Entra a tu casa
            </h1>
            <p className="mt-2 text-sm text-ink-mute">
              Usa la cuenta que te dio la dirección.
            </p>
          </div>

          {mounted ? (
            <form
              onSubmit={onSubmit}
              className="space-y-4 rounded-card bg-surface p-6 shadow-soft ring-1 ring-ink/[0.05] sm:p-8"
            >
              <Field label="Email">
                <Input
                  type="email"
                  name="email"
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
                  name="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <ErrorText>{error}</ErrorText>

              <Button type="submit" loading={submitting} className="mt-2 w-full">
                Entrar
              </Button>
            </form>
          ) : (
            <div className="space-y-4 rounded-card bg-surface p-6 shadow-soft ring-1 ring-ink/[0.05] sm:p-8">
              <div className="h-12 animate-pulse rounded-2xl bg-canvas" />
              <div className="h-12 animate-pulse rounded-2xl bg-canvas" />
              <div className="h-11 animate-pulse rounded-pill bg-canvas" />
            </div>
          )}

          <p className="mt-8 text-center text-xs text-ink-mute lg:text-left">
            ¿No tienes cuenta? Pídesela a la dirección de la guardería.
          </p>
        </div>
      </section>
    </main>
  );
}
