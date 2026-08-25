import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Kpis {
  totalSiniestros: number;
  pendientes: number;
  enProceso: number;
  solucionados: number;
  vehiculosEnFlota: number;
  tiempoPromedioDias: number;
}

const TARJETAS: { key: keyof Kpis; label: string; color: string }[] = [
  { key: 'totalSiniestros', label: 'Total Siniestros', color: 'bg-blue-600' },
  { key: 'pendientes', label: 'Pendientes', color: 'bg-amber-500' },
  { key: 'enProceso', label: 'En Proceso', color: 'bg-orange-600' },
  { key: 'solucionados', label: 'Solucionados', color: 'bg-emerald-600' },
  { key: 'vehiculosEnFlota', label: 'Vehiculos en Flota', color: 'bg-slate-700' },
  { key: 'tiempoPromedioDias', label: 'Tiempo Promedio (dias)', color: 'bg-purple-600' },
];

export function Dashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    api.get('/dashboard').then((res) => setKpis(res.data));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Panel de Control General</h1>
      <p className="text-sm text-slate-500 mb-6">Vista general del sistema de siniestros</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TARJETAS.map((t) => (
          <div key={t.key} className={`${t.color} text-white rounded-lg p-4 shadow`}>
            <p className="text-xs uppercase tracking-wide opacity-80">{t.label}</p>
            <p className="text-3xl font-bold mt-1">{kpis ? kpis[t.key] : '-'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
