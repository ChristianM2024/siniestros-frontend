import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type TipoDocumento =
  | 'foto_siniestro'
  | 'foto_vehiculo'
  | 'foto_conductor'
  | 'foto_licencia'
  | 'croquis'
  | 'acta_policial';

const DOCUMENTOS_REQUERIDOS: { tipo: TipoDocumento; label: string; accept: string }[] = [
  { tipo: 'foto_siniestro', label: 'Foto del siniestro', accept: 'image/*' },
  { tipo: 'foto_vehiculo', label: 'Foto del vehiculo', accept: 'image/*' },
  { tipo: 'foto_conductor', label: 'Foto documento conductor', accept: 'image/*' },
  { tipo: 'foto_licencia', label: 'Foto licencia', accept: 'image/*' },
  { tipo: 'croquis', label: 'Croquis / Sketch', accept: 'image/*,application/pdf' },
  { tipo: 'acta_policial', label: 'Acta policial (si aplica)', accept: 'image/*,application/pdf' },
];

export function ReportarSiniestro() {
  const [placa, setPlaca] = useState('');
  const [vehiculo, setVehiculo] = useState<any>(null);
  const [mensaje, setMensaje] = useState('');
  const [siniestroCreado, setSiniestroCreado] = useState<any>(null);
  const [archivos, setArchivos] = useState<Partial<Record<TipoDocumento, File>>>({});
  const [subiendo, setSubiendo] = useState(false);

  const [form, setForm] = useState({
    fechaSiniestro: '',
    horaSiniestro: '',
    conductor: '',
    cedulaConductor: '',
    telConductor: '',
    licenciaConductor: '',
    categoriaLicencia: '',
    vencimientoLicencia: '',
    lugarAccidente: '',
    ciudadId: '',
    descripcion: '',
    danosVehiculo: '',
    danosTerceros: '',
    intervinoPolicia: false,
    heridos: false,
  });

  const [ciudades, setCiudades] = useState<{ id: number; nombre: string }[]>([]);

  useEffect(() => {
    api.get('/ciudades').then(({ data }) => setCiudades(data)).catch(() => setCiudades([]));
  }, []);

  async function buscarVehiculo() {
    setMensaje('');
    try {
      const { data } = await api.get(`/vehiculos/buscar/${placa.toUpperCase()}`);
      setVehiculo(data);
    } catch {
      setVehiculo(null);
      setMensaje('No se encontro un vehiculo con esa placa.');
    }
  }

  async function guardarSiniestro(e: FormEvent) {
    e.preventDefault();
    if (!vehiculo) {
      setMensaje('Primero busque un vehiculo valido por placa.');
      return;
    }

    // Combina fecha + hora en un solo datetime para fechaSiniestro
    const fechaHora = form.horaSiniestro
      ? `${form.fechaSiniestro}T${form.horaSiniestro}`
      : form.fechaSiniestro;

    try {
      const { data } = await api.post('/siniestros', {
        placa: vehiculo.placa,
        fechaSiniestro: fechaHora,
        conductor: form.conductor,
        cedulaConductor: form.cedulaConductor || undefined,
        telConductor: form.telConductor || undefined,
        licenciaConductor: form.licenciaConductor || undefined,
        categoriaLicencia: form.categoriaLicencia || undefined,
        vencimientoLicencia: form.vencimientoLicencia || undefined,
        lugarAccidente: form.lugarAccidente,
        ciudadId: form.ciudadId ? Number(form.ciudadId) : undefined,
        descripcion: form.descripcion || undefined,
        danosVehiculo: form.danosVehiculo || undefined,
        danosTerceros: form.danosTerceros || undefined,
        intervinoPolicia: form.intervinoPolicia,
        heridos: form.heridos,
      });
      setSiniestroCreado(data);
      setMensaje(`Siniestro creado: ${data.noSiniestro}. Ahora puede subir los documentos abajo.`);
    } catch (err: any) {
      setMensaje(err.response?.data?.error || 'Error al guardar el siniestro');
    }
  }

  function onArchivoSeleccionado(tipo: TipoDocumento, file: File | null) {
    setArchivos((prev) => {
      const copia = { ...prev };
      if (file) copia[tipo] = file;
      else delete copia[tipo];
      return copia;
    });
  }

  async function subirDocumentos() {
    if (!siniestroCreado) return;
    setSubiendo(true);
    setMensaje('');
    try {
      for (const [tipo, file] of Object.entries(archivos)) {
        const formData = new FormData();
        formData.append('archivo', file as File);
        formData.append('tipo', tipo);
        await api.post(`/siniestros/${siniestroCreado.id}/documentos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setMensaje('Documentos subidos correctamente.');
      setArchivos({});
    } catch (err: any) {
      setMensaje(err.response?.data?.error || 'Error al subir uno o mas documentos');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Reportar Siniestro</h1>
      <p className="text-sm text-slate-500 mb-6">Complete los datos del siniestro</p>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <label className="block text-sm font-medium mb-1">1. Placa del vehiculo *</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
            placeholder="Ej. PBA1234"
          />
          <button type="button" onClick={buscarVehiculo} className="bg-brand-700 text-white text-sm px-4 py-2 sm:py-0 rounded">
            Buscar Vehiculo
          </button>
        </div>
        {vehiculo && (
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="bg-brand-700 text-white text-sm font-semibold px-3 py-2">
              1. Datos del Vehiculo
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 p-3 bg-slate-50 text-sm">
              <CampoVehiculo label="Placa" value={vehiculo.placa} />
              <CampoVehiculo label="Marca" value={vehiculo.marca} />
              <CampoVehiculo label="Modelo" value={vehiculo.modelo} />
              <CampoVehiculo label="Anio" value={vehiculo.anio} />
              <CampoVehiculo label="Cliente" value={vehiculo.cliente} />
              <CampoVehiculo label="No. Contrato" value={vehiculo.noContrato} />
              <CampoVehiculo label="Chasis" value={vehiculo.chasis} />
              <CampoVehiculo label="No. Motor" value={vehiculo.noMotor} />
              <CampoVehiculo label="Color" value={vehiculo.color} />
              <CampoVehiculo label="Ciudad Base" value={vehiculo.ciudad?.nombre} />
            </div>
          </div>
        )}
      </div>

      {!siniestroCreado && (
        <form onSubmit={guardarSiniestro} className="bg-white rounded-lg shadow p-4 space-y-4">
          {/* ---- 2. DATOS DEL SINIESTRO ---- */}
          <div>
            <h2 className="text-sm font-semibold bg-brand-700 text-white px-3 py-2 rounded-t -mx-4 -mt-4 mb-3">
              2. Datos del Siniestro
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha del siniestro *</label>
                <input type="date" required value={form.fechaSiniestro}
                  onChange={(e) => setForm({ ...form, fechaSiniestro: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora</label>
                <input type="time" value={form.horaSiniestro}
                  onChange={(e) => setForm({ ...form, horaSiniestro: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lugar *</label>
                <input required value={form.lugarAccidente}
                  onChange={(e) => setForm({ ...form, lugarAccidente: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ciudad</label>
                <select value={form.ciudadId}
                  onChange={(e) => setForm({ ...form, ciudadId: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm bg-white">
                  <option value="">Seleccione...</option>
                  {ciudades.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Descripcion</label>
              <textarea value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm" rows={2} />
            </div>
          </div>

          {/* ---- 3. DATOS DEL CONDUCTOR ---- */}
          <div>
            <h2 className="text-sm font-semibold bg-brand-700 text-white px-3 py-2 rounded -mx-4 mb-3">
              3. Datos del Conductor
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input required value={form.conductor}
                  onChange={(e) => setForm({ ...form, conductor: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cedula</label>
                <input value={form.cedulaConductor}
                  onChange={(e) => setForm({ ...form, cedulaConductor: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefono</label>
                <input value={form.telConductor}
                  onChange={(e) => setForm({ ...form, telConductor: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Licencia</label>
                <input value={form.licenciaConductor}
                  onChange={(e) => setForm({ ...form, licenciaConductor: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <input value={form.categoriaLicencia}
                  onChange={(e) => setForm({ ...form, categoriaLicencia: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vencimiento Lic.</label>
                <input type="date" value={form.vencimientoLicencia}
                  onChange={(e) => setForm({ ...form, vencimientoLicencia: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* ---- 4. DANOS Y PERDIDAS ---- */}
          <div>
            <h2 className="text-sm font-semibold bg-brand-700 text-white px-3 py-2 rounded -mx-4 mb-3">
              4. Danos y Perdidas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Danos vehiculo</label>
                <input value={form.danosVehiculo}
                  onChange={(e) => setForm({ ...form, danosVehiculo: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Danos terceros</label>
                <input value={form.danosTerceros}
                  onChange={(e) => setForm({ ...form, danosTerceros: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 text-sm mt-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.intervinoPolicia}
                  onChange={(e) => setForm({ ...form, intervinoPolicia: e.target.checked })} />
                Intervino policia
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.heridos}
                  onChange={(e) => setForm({ ...form, heridos: e.target.checked })} />
                Heridos
              </label>
            </div>
          </div>

          {mensaje && <p className="text-sm text-brand-700">{mensaje}</p>}

          <button className="w-full sm:w-auto bg-brand-700 text-white text-sm px-5 py-2.5 rounded">
            Guardar Siniestro
          </button>
        </form>
      )}

      {/* ---- 5. DOCUMENTOS REQUERIDOS (aparece despues de guardar el siniestro) ---- */}
      {siniestroCreado && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold bg-brand-700 text-white px-3 py-2 rounded -mx-4 -mt-4 mb-4">
            5. Documentos Requeridos — {siniestroCreado.noSiniestro}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOCUMENTOS_REQUERIDOS.map(({ tipo, label, accept }) => (
              <div key={tipo}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  type="file"
                  accept={accept}
                  onChange={(e) => onArchivoSeleccionado(tipo, e.target.files?.[0] ?? null)}
                  className="w-full text-sm border rounded px-2 py-1.5"
                />
                {archivos[tipo] && (
                  <p className="text-xs text-slate-500 mt-1">{archivos[tipo]!.name}</p>
                )}
              </div>
            ))}
          </div>

          {mensaje && <p className="text-sm text-brand-700 mt-4">{mensaje}</p>}

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              type="button"
              disabled={subiendo || Object.keys(archivos).length === 0}
              onClick={subirDocumentos}
              className="bg-brand-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded"
            >
              {subiendo ? 'Subiendo...' : 'Subir Documentos'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSiniestroCreado(null);
                setVehiculo(null);
                setPlaca('');
                setArchivos({});
                setMensaje('');
                setForm({
                  fechaSiniestro: '', horaSiniestro: '', conductor: '', cedulaConductor: '',
                  telConductor: '', licenciaConductor: '', categoriaLicencia: '', vencimientoLicencia: '',
                  lugarAccidente: '', ciudadId: '', descripcion: '', danosVehiculo: '', danosTerceros: '',
                  intervinoPolicia: false, heridos: false,
                });
              }}
              className="bg-slate-200 text-slate-700 text-sm px-5 py-2.5 rounded"
            >
              Reportar otro siniestro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CampoVehiculo({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-slate-600 font-medium">{label}</span>
      <span className="flex-1 bg-white border rounded px-2 py-1 text-slate-800">
        {value ?? '—'}
      </span>
    </div>
  );
}
