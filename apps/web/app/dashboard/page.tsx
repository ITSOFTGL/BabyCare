'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DashboardSummary } from '@kidcare/types';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorText, Spinner } from '@/components/ui';
import { DirectoraView } from '@/components/dashboard/DirectoraView';
import { StaffView } from '@/components/dashboard/StaffView';
import { ParentView } from '@/components/dashboard/ParentView';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [salute, setSalute] = useState('Hola');

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await apiGet<DashboardSummary>('/dashboard'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando el panel');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hour = new Date().getHours();
    setSalute(
      hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches',
    );
  }, []);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data || !user) return <Spinner label="Preparando tu panel…" />;

  const first = user.name.split(' ')[0];

  return (
    <div className="animate-fade-up space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {salute}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Hola, {first}
        </h1>
      </header>

      {user.role === 'directora' && (
        <DirectoraView data={data} onRefresh={load} />
      )}
      {(user.role === 'profesora' || user.role === 'auxiliar') && (
        <StaffView data={data} onRefresh={load} />
      )}
      {user.role === 'padre' && <ParentView data={data} onRefresh={load} />}
    </div>
  );
}
