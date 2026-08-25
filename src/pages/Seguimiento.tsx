import { useState } from 'react';
import { api } from '../api/client';

const ESTADOS = ['Reportado', 'En_Peritaje', 'En_Reparacion', 'Entregado', 'Cerrado'];

export function Seguimiento() {
  const [noSiniestro, setNoSiniestro] = useState('');
  const [siniestro, setSiniestro] = useState<any>(null);
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState({
    fechaNotifAseg: '', fechaIngresoTaller: '', fechaProforma: '',
    fechaAutorizacion: '', fechaEntrega: '', estado: 'Reportado', notas: '',
  });

  async function buscar() {
    setMensaje('');
    try {
      const { data } = await api.get('/siniestros', { params: { placa: noSiniestro } });
      const encontrado = data.find((s: any) => s.noSiniestro === noSiniestro) || data[0];
      if (!encontrado) throw new Error();
      setSiniestro(encontrado);
      setForm({
        fechaNotifAseg: encontrado.fechaNotifAseg?.slice(0, 10) || '',
        fechaIngresoTaller: encontrado.fechaIngresoTaller?.slice(0, 10) || '',
        fechaProforma: encontrado.fechaProforma?.slice(0, 10) || '',
        fechaAutorizacion: encontrado.fechaAutorizacion?.slice(0, 10) || '',
        fechaEntrega: encontrado.fechaEntrega?.slice(0, 10) || '',
        estado: encontrado.estado,
        notas: encontrado.notas || '',
      });
    } catch {
      setSiniestro(null);
      setMensaje('No se encontro el siniestro (busque por No. de Siniestro o Placa).');
    }
  }

  async function actualizar() {
    if (!siniestro) return;
    try {
      const { data } = await api.patch(`/siniestros/${siniestro.id}/seguimiento`, form);
      setSiniestro(data);
      setMensaje('Siniestro actualizado correctamente.');
    } catch (err: any) {
      setMensaje(err.response?.data?.error || 'Error al actualizar');
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Seguimiento de Siniestro</h1>
      <p className="text-sm text-slate-500 mb-6">Actualice fechas y estado de un siniestro en proceso</p>

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-col sm:flex-row gap-2">
        <input
          value={noSiniestro}
          onChange={(e) => setNoSiniestro(e.target.value)}
          placeholder="No. de Siniestro o Placa"
          className="border rounded px-3 py-2 text-sm flex-1"
        />
        <button onClick={buscar} className="bg-brand-700 text-white text-sm px-4 py-2 sm:py-0 rounded">Buscar</button>
      </div>

      {mensaje && <p className="text-sm text-brand-700 mb-4">{mensaje}</p>}

      {siniestro && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <p className="text-sm text-slate-600">
            <strong>{siniestro.noSiniestro}</strong> — {siniestro.vehiculo?.placa} — {siniestro.conductor}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['fechaNotifAseg', 'Fecha Notif. Aseg.'],
              ['fechaIngresoTaller', 'Fecha Ingreso Taller'],
              ['fechaProforma', 'Fecha Proforma'],
              ['fechaAutorizacion', 'Fecha Autorizacion'],
              ['fechaEntrega', 'Fecha Entrega'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input type="date" value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm">
                {ESTADOS.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm" rows={2} />
          </div>

          {siniestro.tiempos && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
              <div className="bg-slate-100 rounded p-2"><p className="text-xs text-slate-500">Tiempo A</p><p className="font-semibold">{siniestro.tiempos.tiempoA ?? '-'}</p></div>
              <div className="bg-slate-100 rounded p-2"><p className="text-xs text-slate-500">Tiempo B</p><p className="font-semibold">{siniestro.tiempos.tiempoB ?? '-'}</p></div>
              <div className="bg-slate-100 rounded p-2"><p className="text-xs text-slate-500">Tiempo C</p><p className="font-semibold">{siniestro.tiempos.tiempoC ?? '-'}</p></div>
              <div className="bg-slate-100 rounded p-2"><p className="text-xs text-slate-500">Total</p><p className="font-semibold">{siniestro.tiempos.tiempoTotal ?? '-'}</p></div>
            </div>
          )}

          <button onClick={actualizar} className="w-full sm:w-auto bg-brand-700 text-white text-sm px-5 py-2.5 rounded">
            Actualizar Siniestro
          </button>
        </div>
      )}
    </div>
  );
}
