import { useEffect, useState } from 'react';
import { api } from '../api/client';

const ESTADOS = ['Reportado', 'En_Peritaje', 'En_Reparacion', 'Entregado', 'Cerrado'];

const COLOR_ESTADO: Record<string, string> = {
  Reportado: 'bg-slate-100 text-slate-700',
  En_Peritaje: 'bg-amber-100 text-amber-700',
  En_Reparacion: 'bg-orange-100 text-orange-700',
  Entregado: 'bg-blue-100 text-blue-700',
  Cerrado: 'bg-emerald-100 text-emerald-700',
};

function formatFecha(valor?: string) {
  if (!valor) return null;
  const d = new Date(valor);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function formatBooleano(valor?: boolean) {
  if (valor === undefined || valor === null) return null;
  return valor ? 'Sí' : 'No';
}

export function Seguimiento() {
  const [lista, setLista] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [siniestro, setSiniestro] = useState<any>(null);
  const [mensaje, setMensaje] = useState('');
  const [tiposSiniestro, setTiposSiniestro] = useState<any[]>([]);
  const [form, setForm] = useState({
    fechaNotifAseg: '', fechaIngresoTaller: '', fechaProforma: '',
    fechaAutorizacion: '', fechaEntrega: '', estado: 'Reportado', notas: '',
    tipoSiniestroId: '',
  });

  async function cargarLista() {
    setCargandoLista(true);
    try {
      const { data } = await api.get('/siniestros');
      setLista(data);
    } finally {
      setCargandoLista(false);
    }
  }

  async function cargarTiposSiniestro() {
    try {
      const { data } = await api.get('/tipos-siniestro');
      setTiposSiniestro(data);
    } catch {
      // si falla, el combo simplemente queda vacío; no bloqueamos el resto de la pantalla
    }
  }

  useEffect(() => {
    cargarLista();
    cargarTiposSiniestro();
  }, []);

  function abrirSiniestro(s: any) {
    setSiniestro(s);
    setMensaje('');
    setForm({
      fechaNotifAseg: s.fechaNotifAseg?.slice(0, 10) || '',
      fechaIngresoTaller: s.fechaIngresoTaller?.slice(0, 10) || '',
      fechaProforma: s.fechaProforma?.slice(0, 10) || '',
      fechaAutorizacion: s.fechaAutorizacion?.slice(0, 10) || '',
      fechaEntrega: s.fechaEntrega?.slice(0, 10) || '',
      estado: s.estado,
      notas: s.notas || '',
      tipoSiniestroId: s.tipoSiniestroId ? String(s.tipoSiniestroId) : '',
    });
  }

  async function actualizar() {
    if (!siniestro) return;
    try {
      const payload = {
        ...form,
        tipoSiniestroId: form.tipoSiniestroId ? Number(form.tipoSiniestroId) : undefined,
      };
      const { data } = await api.patch(`/siniestros/${siniestro.id}/seguimiento`, payload);
      setSiniestro(data);
      setMensaje('Siniestro actualizado correctamente.');
      cargarLista(); // refresca la tabla para reflejar el nuevo estado / tipo
    } catch (err: any) {
      setMensaje(err.response?.data?.error || 'Error al actualizar');
    }
  }

  const listaFiltrada = lista.filter((s) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      s.noSiniestro?.toLowerCase().includes(q) ||
      s.vehiculo?.placa?.toLowerCase().includes(q) ||
      s.conductor?.toLowerCase().includes(q)
    );
  });

  // Datos del reporte original, solo lectura. Se arma dinámicamente y se
  // omiten los campos que vinieron vacíos para no llenar la pantalla de "—".
  const datosReporte = siniestro
    ? ([
        ['No. Siniestro', siniestro.noSiniestro],
        ['Origen', siniestro.origen === 'PUBLICO' ? 'Formulario público' : 'Interno (Reportar Siniestro)'],
        ['Placa', siniestro.vehiculo?.placa],
        ['Vehículo', [siniestro.vehiculo?.marca, siniestro.vehiculo?.modelo].filter(Boolean).join(' ') || null],
        ['Fecha del Siniestro', formatFecha(siniestro.fechaSiniestro)],
        ['Conductor', siniestro.conductor],
        ['Cédula Conductor', siniestro.cedulaConductor],
        ['Teléfono Conductor', siniestro.telConductor],
        ['Correo Conductor', siniestro.correoConductor],
        ['Licencia Conductor', siniestro.licenciaConductor],
        ['Categoría Licencia', siniestro.categoriaLicencia],
        ['Vencimiento Licencia', formatFecha(siniestro.vencimientoLicencia)],
        ['Lugar del Accidente', siniestro.lugarAccidente],
        ['Descripción', siniestro.descripcion],
        ['Daños al Vehículo', siniestro.danosVehiculo],
        ['Daños a Terceros', siniestro.danosTerceros],
        ['Intervino Policía', formatBooleano(siniestro.intervinoPolicia)],
        ['Heridos', formatBooleano(siniestro.heridos)],
      ] as [string, any][]).filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Seguimiento de Siniestros</h1>
      <p className="text-sm text-slate-500 mb-6">Todos los siniestros registrados. Selecciona uno para actualizar sus fechas y estado.</p>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por No. de Siniestro, Placa o Conductor"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white rounded-lg shadow mb-6 overflow-x-auto">
        {cargandoLista ? (
          <p className="text-sm text-slate-500 p-4">Cargando siniestros…</p>
        ) : listaFiltrada.length === 0 ? (
          <p className="text-sm text-slate-500 p-4">No hay siniestros que coincidan.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b">
                <th className="px-4 py-2">No. Siniestro</th>
                <th className="px-4 py-2">Placa</th>
                <th className="px-4 py-2">Conductor</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {listaFiltrada.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => abrirSiniestro(s)}
                  className={`cursor-pointer hover:bg-slate-50 ${siniestro?.id === s.id ? 'bg-slate-50' : ''}`}
                >
                  <td className="px-4 py-2 font-medium text-slate-800">{s.noSiniestro}</td>
                  <td className="px-4 py-2">{s.vehiculo?.placa}</td>
                  <td className="px-4 py-2">{s.conductor}</td>
                  <td className="px-4 py-2">{s.tipoSiniestro?.nombre || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${COLOR_ESTADO[s.estado] || 'bg-slate-100 text-slate-700'}`}>
                      {s.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {s.fechaSiniestro ? new Date(s.fechaSiniestro).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {mensaje && !siniestro && <p className="text-sm text-brand-700 mb-4">{mensaje}</p>}

      {siniestro && (
        <div className="bg-white rounded-lg shadow p-4 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              <strong>{siniestro.noSiniestro}</strong> — {siniestro.vehiculo?.placa} — {siniestro.conductor}
            </p>
            <button onClick={() => setSiniestro(null)} className="text-xs text-slate-400 hover:text-slate-700">
              Cerrar
            </button>
          </div>

          {/* ---------- Datos del reporte original: solo lectura ---------- */}
          {datosReporte.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Datos del reporte</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
                {datosReporte.map(([label, valor]) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
                    <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded px-3 py-2 cursor-not-allowed select-text">
                      {valor}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------- Seguimiento: editable ---------- */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Seguimiento</p>
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
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Siniestro</label>
                <select value={form.tipoSiniestroId}
                  onChange={(e) => setForm({ ...form, tipoSiniestroId: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">— Sin asignar —</option>
                  {tiposSiniestro.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
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

          {mensaje && <p className="text-sm text-brand-700">{mensaje}</p>}

          <button onClick={actualizar} className="w-full sm:w-auto bg-brand-700 text-white text-sm px-5 py-2.5 rounded">
            Actualizar Siniestro
          </button>
        </div>
      )}
    </div>
  );
}
