import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

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

type TabId = 'cliente' | 'gestion' | 'bitacora';

export function Seguimiento() {
  const { usuario } = useAuth();

  // ---- Control de quién puede reasignar el Tipo/Subtipo de un siniestro
  //      que ya lo tiene. AJUSTA los valores de comparación aquí
  //      si tu campo `rolNombre` usa otro texto exacto (ej. "Administrador"). ----
  const rol = (usuario?.rolNombre || '').toLowerCase();
  const puedeReasignarTipo = rol.includes('admin') || rol.includes('supervisor');

  const [lista, setLista] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [siniestro, setSiniestro] = useState<any>(null);
  const [mensaje, setMensaje] = useState('');
  const [tab, setTab] = useState<TabId>('cliente');

  // ---- Controla si se muestran los combos de Tipo/Subtipo dentro de
  //      "Datos de Gestión" para un siniestro que ya tiene tipo asignado
  //      (solo alcanzable vía el botón "Cambiar", visible solo para
  //      admin/supervisor) ----
  const [editandoTipo, setEditandoTipo] = useState(false);

  // ---- Guardado de la pantalla de asignación inicial (Tipo + Subtipo) ----
  const [asignando, setAsignando] = useState(false);

  // ---- Catálogos que se cargan una sola vez ----
  const [tiposSiniestro, setTiposSiniestro] = useState<any[]>([]);
  const [estatusCobroCliente, setEstatusCobroCliente] = useState<any[]>([]);
  const [talleres, setTalleres] = useState<any[]>([]);

  // ---- Catálogos dependientes (se recargan según la selección) ----
  const [estatusSiniestro, setEstatusSiniestro] = useState<any[]>([]);
  const [ciudadesTaller, setCiudadesTaller] = useState<any[]>([]);
  const [puntosAtencion, setPuntosAtencion] = useState<any[]>([]);

  // ---- Bitácora (se carga solo cuando se abre esa pestaña) ----
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [form, setForm] = useState({
    fechaNotifAseg: '', fechaIngresoTaller: '', fechaProforma: '',
    fechaAutorizacion: '', fechaEntrega: '', notas: '',
    tipoSiniestroId: '',
    estatusSiniestroId: '',
    estatusCobroClienteId: '',
    tallerId: '',
    tallerCiudadId: '',
    puntoAtencionTallerId: '',
    tieneCotizacion: false,
    movilizadoGrua: false,

    // --- NUEVO: KPI / Fechas de proceso (Tipo Simple) ---
    fechaLlegadaRepuestos: '',
    fechaAuditoria: '',
    fechaFiniquito: '',
    fechaSalidaTaller: '',

    // --- NUEVO: Valores (Tipo Simple) ---
    valorSiniestroAntesIva: '',
    valorAseguradoVehiculo: '',
    valorDeducible: '', // se calculará con una fórmula más adelante
    esCandidatoPerdidaTotal: false,

    // --- NUEVO: Cobro al Cliente (Tipo Simple) ---
    fechaNotifCobroCliente: '',
    noOrdenServicioCobroCliente: '',

    // --- NUEVO: Vehículo Sustituto (Tipo Simple) ---
    seEntregoVehiculoSustituto: false,
    fechaHoraEntregaSustituto: '',
    horasReclamoHastaEntrega: '', // se calculará con una fórmula más adelante
    fechaRetiroSustituto: '',
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

  async function cargarCatalogosBase() {
    try {
      const [tipos, cobro, talleresRes] = await Promise.all([
        api.get('/tipos-siniestro'),
        api.get('/estatus-cobro-cliente'),
        api.get('/talleres'),
      ]);
      setTiposSiniestro(tipos.data);
      setEstatusCobroCliente(cobro.data);
      setTalleres(talleresRes.data);
    } catch {
      // si algún catálogo falla, los combos correspondientes simplemente quedan vacíos
    }
  }

  useEffect(() => {
    cargarLista();
    cargarCatalogosBase();
  }, []);

  useEffect(() => {
    if (!form.tipoSiniestroId) {
      setEstatusSiniestro([]);
      return;
    }
    api.get('/estatus-siniestro', { params: { tipoSiniestroId: form.tipoSiniestroId } })
      .then(({ data }) => setEstatusSiniestro(data))
      .catch(() => setEstatusSiniestro([]));
  }, [form.tipoSiniestroId]);

  useEffect(() => {
    if (!form.tallerId) {
      setCiudadesTaller([]);
      return;
    }
    api.get(`/talleres/${form.tallerId}/ciudades`)
      .then(({ data }) => setCiudadesTaller(data))
      .catch(() => setCiudadesTaller([]));
  }, [form.tallerId]);

  useEffect(() => {
    if (!form.tallerCiudadId) {
      setPuntosAtencion([]);
      return;
    }
    api.get(`/taller-ciudades/${form.tallerCiudadId}/puntos-atencion`)
      .then(({ data }) => setPuntosAtencion(data))
      .catch(() => setPuntosAtencion([]));
  }, [form.tallerCiudadId]);

  // ---- Carga la bitácora solo la primera vez que se entra a esa pestaña ----
  useEffect(() => {
    if (tab !== 'bitacora' || !siniestro) return;
    setCargandoHistorial(true);
    api.get(`/siniestros/${siniestro.id}/historial`)
      .then(({ data }) => setHistorial(data))
      .catch(() => setHistorial([]))
      .finally(() => setCargandoHistorial(false));
  }, [tab, siniestro?.id]);

  function abrirSiniestro(s: any) {
    setSiniestro(s);
    setMensaje('');
    setTab('cliente');
    setHistorial([]);
    setEditandoTipo(false);
    setForm({
      fechaNotifAseg: s.fechaNotifAseg?.slice(0, 10) || '',
      fechaIngresoTaller: s.fechaIngresoTaller?.slice(0, 10) || '',
      fechaProforma: s.fechaProforma?.slice(0, 10) || '',
      fechaAutorizacion: s.fechaAutorizacion?.slice(0, 10) || '',
      fechaEntrega: s.fechaEntrega?.slice(0, 10) || '',
      notas: s.notas || '',
      tipoSiniestroId: s.tipoSiniestroId ? String(s.tipoSiniestroId) : '',
      estatusSiniestroId: s.estatusSiniestroId ? String(s.estatusSiniestroId) : '',
      estatusCobroClienteId: s.estatusCobroClienteId ? String(s.estatusCobroClienteId) : '',
      tallerId: s.tallerCiudad?.tallerId ? String(s.tallerCiudad.tallerId) : '',
      tallerCiudadId: s.tallerCiudadId ? String(s.tallerCiudadId) : '',
      puntoAtencionTallerId: s.puntoAtencionTallerId ? String(s.puntoAtencionTallerId) : '',
      tieneCotizacion: !!s.tieneCotizacion,
      movilizadoGrua: !!s.movilizadoGrua,

      // --- NUEVO ---
      fechaLlegadaRepuestos: s.fechaLlegadaRepuestos?.slice(0, 10) || '',
      fechaAuditoria: s.fechaAuditoria?.slice(0, 10) || '',
      fechaFiniquito: s.fechaFiniquito?.slice(0, 10) || '',
      fechaSalidaTaller: s.fechaSalidaTaller?.slice(0, 10) || '',

      valorSiniestroAntesIva: s.valorSiniestroAntesIva ?? '',
      valorAseguradoVehiculo: s.valorAseguradoVehiculo ?? '',
      valorDeducible: s.valorDeducible ?? '',
      esCandidatoPerdidaTotal: !!s.esCandidatoPerdidaTotal,

      fechaNotifCobroCliente: s.fechaNotifCobroCliente?.slice(0, 10) || '',
      noOrdenServicioCobroCliente: s.noOrdenServicioCobroCliente || '',

      seEntregoVehiculoSustituto: !!s.seEntregoVehiculoSustituto,
      // datetime-local necesita yyyy-MM-ddTHH:mm (16 caracteres), no solo la fecha
      fechaHoraEntregaSustituto: s.fechaHoraEntregaSustituto?.slice(0, 16) || '',
      horasReclamoHastaEntrega: s.horasReclamoHastaEntrega ?? '',
      fechaRetiroSustituto: s.fechaRetiroSustituto?.slice(0, 10) || '',
    });
  }

  // ---- Guarda SOLO Tipo + Subtipo de Siniestro (pantalla de asignación inicial,
  //      o reasignación desde "Cambiar" para admin/supervisor) ----
  async function asignarTipo() {
    if (!siniestro) return;
    setAsignando(true);
    try {
      const payload = {
        tipoSiniestroId: form.tipoSiniestroId ? Number(form.tipoSiniestroId) : undefined,
        estatusSiniestroId: form.estatusSiniestroId ? Number(form.estatusSiniestroId) : undefined,
      };
      const { data } = await api.patch(`/siniestros/${siniestro.id}/seguimiento`, payload);
      setSiniestro(data);
      setEditandoTipo(false);
      setMensaje('Tipo de siniestro asignado correctamente.');
      cargarLista();
    } catch (err: any) {
      setMensaje(err.response?.data?.error || 'Error al asignar el tipo de siniestro');
    } finally {
      setAsignando(false);
    }
  }

  async function actualizar() {
    if (!siniestro) return;
    try {
      const payload = {
        fechaNotifAseg: form.fechaNotifAseg || undefined,
        fechaIngresoTaller: form.fechaIngresoTaller || undefined,
        fechaProforma: form.fechaProforma || undefined,
        fechaAutorizacion: form.fechaAutorizacion || undefined,
        fechaEntrega: form.fechaEntrega || undefined,
        notas: form.notas,
        tipoSiniestroId: form.tipoSiniestroId ? Number(form.tipoSiniestroId) : undefined,
        estatusSiniestroId: form.estatusSiniestroId ? Number(form.estatusSiniestroId) : undefined,
        estatusCobroClienteId: form.estatusCobroClienteId ? Number(form.estatusCobroClienteId) : undefined,
        tallerCiudadId: form.tallerCiudadId ? Number(form.tallerCiudadId) : undefined,
        puntoAtencionTallerId: form.puntoAtencionTallerId ? Number(form.puntoAtencionTallerId) : undefined,
        tieneCotizacion: form.tieneCotizacion,
        movilizadoGrua: form.movilizadoGrua,

        // --- NUEVO: KPI / Fechas de proceso ---
        fechaLlegadaRepuestos: form.fechaLlegadaRepuestos || undefined,
        fechaAuditoria: form.fechaAuditoria || undefined,
        fechaFiniquito: form.fechaFiniquito || undefined,
        fechaSalidaTaller: form.fechaSalidaTaller || undefined,

        // --- NUEVO: Valores ---
        valorSiniestroAntesIva: form.valorSiniestroAntesIva !== '' ? Number(form.valorSiniestroAntesIva) : undefined,
        valorAseguradoVehiculo: form.valorAseguradoVehiculo !== '' ? Number(form.valorAseguradoVehiculo) : undefined,
        valorDeducible: form.valorDeducible !== '' ? Number(form.valorDeducible) : undefined,
        esCandidatoPerdidaTotal: form.esCandidatoPerdidaTotal,

        // --- NUEVO: Cobro al Cliente ---
        fechaNotifCobroCliente: form.fechaNotifCobroCliente || undefined,
        noOrdenServicioCobroCliente: form.noOrdenServicioCobroCliente || undefined,

        // --- NUEVO: Vehículo Sustituto ---
        seEntregoVehiculoSustituto: form.seEntregoVehiculoSustituto,
        fechaHoraEntregaSustituto: form.fechaHoraEntregaSustituto || undefined,
        horasReclamoHastaEntrega: form.horasReclamoHastaEntrega !== '' ? Number(form.horasReclamoHastaEntrega) : undefined,
        fechaRetiroSustituto: form.fechaRetiroSustituto || undefined,
      };
      const { data } = await api.patch(`/siniestros/${siniestro.id}/seguimiento`, payload);
      setSiniestro(data);
      setEditandoTipo(false);
      setMensaje('Siniestro actualizado correctamente.');
      cargarLista();
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

  const tabs: { id: TabId; label: string }[] = [
    { id: 'cliente', label: 'Formulario del Cliente' },
    { id: 'gestion', label: 'Datos de Gestión' },
    { id: 'bitacora', label: 'Bitácora' },
  ];

  const tieneTipoAsignado = !!siniestro?.tipoSiniestroId;

  // ---- Los 4 grupos nuevos (KPI/Fechas, Valores, Cobro al Cliente,
  //      Vehículo Sustituto) solo aplican al Tipo de Siniestro "Simple"
  //      (código '001', igual que en siniestros.routes.ts). Ajusta esta
  //      comparación si el código real en tu base es distinto. ----
  const tipoSiniestroActual = tiposSiniestro.find((t) => String(t.id) === form.tipoSiniestroId);
  const esTipoSimple = tipoSiniestroActual?.codigo === '001';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Seguimiento de Siniestros</h1>
      <p className="text-sm text-slate-500 mb-6">Todos los siniestros registrados. Selecciona uno para actualizar sus fechas y estatus.</p>

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
                <th className="px-4 py-2">Subtipo</th>
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
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {s.estatusSiniestro?.nombre || '— Sin asignar —'}
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

      {/* ================= PANTALLA DE ASIGNACIÓN INICIAL =================
          Se muestra cuando el siniestro seleccionado todavía NO tiene
          Tipo de Siniestro asignado. Solo pide Tipo + Subtipo y, al guardar,
          pasa automáticamente a la vista completa de pestañas. */}
      {siniestro && !tieneTipoAsignado && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between mb-6">
            <p className="text-sm font-semibold text-slate-800">
              {siniestro.noSiniestro} <span className="font-normal text-slate-500">— {siniestro.vehiculo?.placa} — {siniestro.conductor}</span>
            </p>
            <button onClick={() => setSiniestro(null)} className="text-xs text-slate-400 hover:text-slate-700">
              Cerrar
            </button>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Asigna el Tipo y Subtipo de Siniestro para habilitar el resto de los datos de gestión.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Siniestro</label>
              <select value={form.tipoSiniestroId}
                onChange={(e) => setForm({ ...form, tipoSiniestroId: e.target.value, estatusSiniestroId: '' })}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Seleccione…</option>
                {tiposSiniestro.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Subtipo de Siniestro</label>
              <select value={form.estatusSiniestroId}
                disabled={!form.tipoSiniestroId}
                onChange={(e) => setForm({ ...form, estatusSiniestroId: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100">
                <option value="">Seleccione…</option>
                {estatusSiniestro.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
              {!form.tipoSiniestroId && (
                <p className="text-xs text-slate-400 mt-1">Seleccione primero el Tipo de Siniestro.</p>
              )}
            </div>
          </div>

          {mensaje && <p className="text-sm text-brand-700 mt-4">{mensaje}</p>}

          <button
            onClick={asignarTipo}
            disabled={!form.tipoSiniestroId || !form.estatusSiniestroId || asignando}
            className="mt-6 bg-brand-700 text-white text-sm px-5 py-2.5 rounded disabled:opacity-50"
          >
            {asignando ? 'Guardando…' : 'Guardar y Asignar'}
          </button>
        </div>
      )}

      {/* ================= VISTA COMPLETA (3 pestañas) =================
          Se muestra una vez que el siniestro ya tiene Tipo asignado. */}
      {siniestro && tieneTipoAsignado && (
        <div className="bg-white rounded-lg shadow p-4">
          {/* ---------- Encabezado ---------- */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {siniestro.noSiniestro} <span className="font-normal text-slate-500">— {siniestro.vehiculo?.placa} — {siniestro.conductor}</span>
              </p>
            </div>
            <div className="flex items-start gap-6">
              <div className="text-right text-xs">
                <p className="text-slate-400">Tipo de Siniestro</p>
                <p className="font-medium text-slate-700">{siniestro.tipoSiniestro?.nombre || '— Sin asignar —'}</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-slate-400">Subtipo de Siniestro</p>
                <p className="font-medium text-slate-700">{siniestro.estatusSiniestro?.nombre || '— Sin asignar —'}</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-slate-400">Cobro al cliente</p>
                <p className="font-medium text-slate-700">{siniestro.estatusCobroCliente?.nombre || '— Sin asignar —'}</p>
              </div>
              <button onClick={() => setSiniestro(null)} className="text-xs text-slate-400 hover:text-slate-700">
                Cerrar
              </button>
            </div>
          </div>

          {/* ---------- Barra de pestañas ---------- */}
          <div className="flex border-b border-slate-200 mb-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ---------- Pestaña: Formulario del Cliente ---------- */}
          {tab === 'cliente' && (
            <div>
              {datosReporte.length > 0 ? (
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
              ) : (
                <p className="text-sm text-slate-500">Este siniestro no tiene datos de reporte registrados.</p>
              )}
            </div>
          )}

          {/* ---------- Pestaña: Datos de Gestión ---------- */}
          {tab === 'gestion' && (
            <div className="space-y-5">
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

                  {/* Tipo y Subtipo del Siniestro: ya asignados -> se muestran como
                      consulta (ya se ven arriba en el encabezado). El botón
                      "Cambiar" para reasignar SOLO aparece para admin/supervisor;
                      un operador nunca ve los combos aquí. */}
                  {!editandoTipo ? (
                    <div className="sm:col-span-2 flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-2">
                      <div className="text-sm">
                        <span className="text-slate-500">Tipo: </span>
                        <span className="font-medium text-slate-700">
                          {tiposSiniestro.find((t) => String(t.id) === form.tipoSiniestroId)?.nombre}
                        </span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-500">Subtipo: </span>
                        <span className="font-medium text-slate-700">
                          {estatusSiniestro.find((e) => String(e.id) === form.estatusSiniestroId)?.nombre || '— Sin asignar —'}
                        </span>
                      </div>
                      {puedeReasignarTipo && (
                        <button
                          type="button"
                          onClick={() => setEditandoTipo(true)}
                          className="text-xs text-brand-700 hover:underline whitespace-nowrap ml-3"
                        >
                          Cambiar
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Tipo de Siniestro</label>
                        <select value={form.tipoSiniestroId}
                          onChange={(e) => setForm({ ...form, tipoSiniestroId: e.target.value, estatusSiniestroId: '' })}
                          className="w-full border rounded px-3 py-2 text-sm">
                          <option value="">— Sin asignar —</option>
                          {tiposSiniestro.map((t) => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Subtipo de Siniestro</label>
                        <select value={form.estatusSiniestroId}
                          disabled={!form.tipoSiniestroId}
                          onChange={(e) => setForm({ ...form, estatusSiniestroId: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100">
                          <option value="">— Sin asignar —</option>
                          {estatusSiniestro.map((e) => (
                            <option key={e.id} value={e.id}>{e.nombre}</option>
                          ))}
                        </select>
                        {!form.tipoSiniestroId && (
                          <p className="text-xs text-slate-400 mt-1">Seleccione primero el Tipo de Siniestro.</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => setEditandoTipo(false)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancelar cambio de tipo
                        </button>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Estatus de Cobro al Cliente</label>
                    <select value={form.estatusCobroClienteId}
                      onChange={(e) => setForm({ ...form, estatusCobroClienteId: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">— Sin asignar —</option>
                      {estatusCobroCliente.map((e) => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Taller Asignado</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Taller</label>
                    <select value={form.tallerId}
                      onChange={(e) => setForm({
                        ...form,
                        tallerId: e.target.value,
                        tallerCiudadId: '',
                        puntoAtencionTallerId: '',
                      })}
                      className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">— Sin asignar —</option>
                      {talleres.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ciudad del Taller</label>
                    <select value={form.tallerCiudadId}
                      disabled={!form.tallerId}
                      onChange={(e) => setForm({ ...form, tallerCiudadId: e.target.value, puntoAtencionTallerId: '' })}
                      className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100">
                      <option value="">— Sin asignar —</option>
                      {ciudadesTaller.map((tc) => (
                        <option key={tc.id} value={tc.id}>{tc.ciudad?.nombre}</option>
                      ))}
                    </select>
                    {!form.tallerId && (
                      <p className="text-xs text-slate-400 mt-1">Seleccione primero el Taller.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Punto de Atención</label>
                    <select value={form.puntoAtencionTallerId}
                      disabled={!form.tallerCiudadId}
                      onChange={(e) => setForm({ ...form, puntoAtencionTallerId: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100">
                      <option value="">— Sin asignar —</option>
                      {puntosAtencion.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    {!form.tallerCiudadId && (
                      <p className="text-xs text-slate-400 mt-1">Seleccione primero la Ciudad del Taller.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.tieneCotizacion}
                    onChange={(e) => setForm({ ...form, tieneCotizacion: e.target.checked })} />
                  ¿Tiene cotización del siniestro?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.movilizadoGrua}
                    onChange={(e) => setForm({ ...form, movilizadoGrua: e.target.checked })} />
                  ¿Vehículo movilizado en grúa?
                </label>
              </div>

              {/* ================= NUEVO: grupos exclusivos del Tipo "Simple" =================
                  Se muestran solo cuando el siniestro es Tipo "Simple" (código '001').
                  Los otros 7 tipos aún no tienen sus campos definidos (pendiente de
                  sesión anterior); cuando se definan, este mismo patrón condicional
                  se repite con el código de cada tipo. */}
              {esTipoSimple && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">KPI / Fechas de Proceso</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        ['fechaLlegadaRepuestos', 'Fecha de llegada de repuestos'],
                        ['fechaAuditoria', 'Fecha de auditoría'],
                        ['fechaFiniquito', 'Fecha de finiquito'],
                        ['fechaSalidaTaller', 'Fecha de salida de taller'],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium mb-1">{label}</label>
                          <input type="date" value={(form as any)[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Valores</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Valor del siniestro antes de IVA</label>
                        <input type="number" step="0.01" value={form.valorSiniestroAntesIva}
                          onChange={(e) => setForm({ ...form, valorSiniestroAntesIva: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Valor asegurado del vehículo</label>
                        <input type="number" step="0.01" value={form.valorAseguradoVehiculo}
                          onChange={(e) => setForm({ ...form, valorAseguradoVehiculo: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Valor deducible</label>
                        <input type="number" step="0.01" value={form.valorDeducible}
                          onChange={(e) => setForm({ ...form, valorDeducible: e.target.value })}
                          placeholder="Se calculará automáticamente (fórmula pendiente)"
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.esCandidatoPerdidaTotal}
                            onChange={(e) => setForm({ ...form, esCandidatoPerdidaTotal: e.target.checked })} />
                          ¿Es candidato a pérdida total?
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Cobro al Cliente</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha notificación cobro al cliente</label>
                        <input type="date" value={form.fechaNotifCobroCliente}
                          onChange={(e) => setForm({ ...form, fechaNotifCobroCliente: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">No. de orden de servicio cobro al cliente</label>
                        <input type="text" value={form.noOrdenServicioCobroCliente}
                          onChange={(e) => setForm({ ...form, noOrdenServicioCobroCliente: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Vehículo Sustituto</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.seEntregoVehiculoSustituto}
                            onChange={(e) => setForm({ ...form, seEntregoVehiculoSustituto: e.target.checked })} />
                          ¿Se entregó vehículo sustituto?
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha/hora de entrega del sustituto</label>
                        <input type="datetime-local" value={form.fechaHoraEntregaSustituto}
                          disabled={!form.seEntregoVehiculoSustituto}
                          onChange={(e) => setForm({ ...form, fechaHoraEntregaSustituto: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Horas desde el reclamo hasta la entrega</label>
                        <input type="number" step="0.01" value={form.horasReclamoHastaEntrega}
                          onChange={(e) => setForm({ ...form, horasReclamoHastaEntrega: e.target.value })}
                          placeholder="Se calculará automáticamente (fórmula pendiente)"
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha de retiro del sustituto</label>
                        <input type="date" value={form.fechaRetiroSustituto}
                          disabled={!form.seEntregoVehiculoSustituto}
                          onChange={(e) => setForm({ ...form, fechaRetiroSustituto: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </>
              )}

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

          {/* ---------- Pestaña: Bitácora ---------- */}
          {tab === 'bitacora' && (
            <div>
              {cargandoHistorial ? (
                <p className="text-sm text-slate-500">Cargando historial…</p>
              ) : historial.length === 0 ? (
                <p className="text-sm text-slate-500">No hay historial disponible para este siniestro.</p>
              ) : (
                <ul className="divide-y">
                  {historial.map((h: any) => (
                    <li key={h.id} className="py-2 flex justify-between text-sm">
                      <span className="text-slate-700">{h.estatusNombre || h.descripcion}</span>
                      <span className="text-slate-400">{formatFecha(h.fecha || h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
