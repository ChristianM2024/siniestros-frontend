import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function BaseDatos() {
  const [siniestros, setSiniestros] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    setError('');
    api
      .get('/siniestros')
      .then((res) => setSiniestros(res.data))
      .catch(() => setError('No se pudo cargar la base de datos de siniestros.'))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Base de Datos de Siniestros</h1>
      <p className="text-sm text-slate-500 mb-6">{siniestros.length} registros</p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {cargando ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">Cargando registros...</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                {['No. Siniestro', 'Fecha', 'Placa', 'Conductor', 'Estado', 'Tiempo Total (d)'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siniestros.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">{s.noSiniestro}</td>
                  <td className="px-3 py-2">{new Date(s.fechaSiniestro).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{s.vehiculo?.placa}</td>
                  <td className="px-3 py-2">{s.conductor}</td>
                  <td className="px-3 py-2">
                    {/* Antes: s.estado.replace('_', ' ') — 'estado' era el enum EstadoSiniestro,
                        eliminado del schema. Ahora el estatus viene del catálogo dinámico
                        EstatusSiniestro, vía la relación estatusSiniestro. */}
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-100">
                      {s.estatusSiniestro?.nombre ?? 'Sin estatus'}
                    </span>
                  </td>
                  <td className="px-3 py-2">{s.tiempos?.tiempoTotal ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
