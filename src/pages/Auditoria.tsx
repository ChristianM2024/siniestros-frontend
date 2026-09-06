import { useEffect, useState, FormEvent } from 'react';
import { ScrollText, AlertCircle, Filter } from 'lucide-react';
import { api } from '../api/client';

interface AuditLog {
  id: number;
  usuarioId: number | null;
  usuarioEmail: string | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalle: unknown;
  ip: string | null;
  creadoEn: string;
}

const BADGE_ACCION: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN_OK: 'bg-slate-100 text-slate-700',
  LOGIN_FALLIDO: 'bg-amber-100 text-amber-700',
};

export function Auditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entidad, setEntidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  async function cargar(filtros?: { entidad?: string; desde?: string; hasta?: string }) {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.get<AuditLog[]>('/auditoria', {
        params: {
          entidad: filtros?.entidad || undefined,
          desde: filtros?.desde || undefined,
          hasta: filtros?.hasta || undefined,
        },
      });
      setLogs(data);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('No tienes permiso para ver la auditoría (solo Admin).');
      } else {
        setError('No se pudo cargar la auditoría. Intenta de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function aplicarFiltros(e: FormEvent) {
    e.preventDefault();
    cargar({ entidad, desde, hasta });
  }

  function limpiarFiltros() {
    setEntidad('');
    setDesde('');
    setHasta('');
    cargar();
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-slate-700" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Auditoría</h1>
          <p className="text-slate-500 text-sm">Registro de acciones realizadas en el sistema.</p>
        </div>
      </div>

      <form onSubmit={aplicarFiltros} className="flex flex-wrap items-end gap-3 mb-6 bg-white border border-slate-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Entidad</label>
          <input
            type="text"
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
            placeholder="siniestro, usuario, vehiculo…"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          <Filter className="w-3.5 h-3.5" />
          Filtrar
        </button>
        <button
          type="button"
          onClick={limpiarFiltros}
          className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Limpiar
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : !error && logs.length === 0 ? (
        <p className="text-sm text-slate-500">No hay registros de auditoría con esos filtros.</p>
      ) : !error ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Fecha</th>
                <th className="text-left px-4 py-2.5">Usuario</th>
                <th className="text-left px-4 py-2.5">Acción</th>
                <th className="text-left px-4 py-2.5">Entidad</th>
                <th className="text-left px-4 py-2.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                    {new Date(log.creadoEn).toLocaleString('es-EC')}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{log.usuarioEmail ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${BADGE_ACCION[log.accion] ?? 'bg-slate-100 text-slate-700'}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {log.entidad ?? '—'}
                    {log.entidadId ? ` #${log.entidadId}` : ''}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{log.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
