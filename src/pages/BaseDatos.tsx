import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function BaseDatos() {
  const [siniestros, setSiniestros] = useState<any[]>([]);

  useEffect(() => {
    api.get('/siniestros').then((res) => setSiniestros(res.data));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Base de Datos de Siniestros</h1>
      <p className="text-sm text-slate-500 mb-6">{siniestros.length} registros</p>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                  <span className="px-2 py-0.5 rounded text-xs bg-slate-100">{s.estado.replace('_', ' ')}</span>
                </td>
                <td className="px-3 py-2">{s.tiempos?.tiempoTotal ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
