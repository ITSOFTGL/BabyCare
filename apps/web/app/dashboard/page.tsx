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

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data || !user) return <Spinner label="Preparando tu panel…" />;

  const greeting = `¡Hola, ${user.name.split(' ')[0]}! 👋`;

  return (
    <div className="animate-fade-up space-y-6">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">{greeting}</h1>

      {user.role === 'directora' && (
        <DirectoraView data={data} onRefresh={load} />
      )}
      {(user.role === 'profesora' || user.role === 'auxiliar') && (
        <StaffView data={data} onRefresh={load} />
      )}
      {user.role === 'padre' && <ParentView data={data} />}
    </div>
  );
}
