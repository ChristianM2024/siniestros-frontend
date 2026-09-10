import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Ciudad {
  id: number;
  nombre: string;
}

interface Aseguradora {
  id: number;
  nombre: string;
}

interface Cliente {
  id: number;
  nombre: string;
}

// Los 8 catálogos "simples" (solo id + nombre) tienen la misma forma.
interface CatalogoSimple {
  id: number;
  nombre: string;
}

interface Gama {
  id: number;
  nombre: string;
  claseId: number;
}

export interface Vehiculo {
  id?: number;
  placa: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  color?: string | null;
  chasis?: string | null;
  noMotor?: string | null;
  clienteId?: number | null;
  noContrato?: string | null;
  ciudadId?: number | null;
  aseguradoraId?: number | null;
  noPoliza?: string | null;
  vencimientoPoliza?: string | null; // yyyy-mm-dd para <input type="date">
  estado?: string;

  // --- NUEVO: datos de contrato/cotización ---
  noAnexo?: string | null;
  noCotizacion?: string | null;
  noFactura?: string | null;
  fechaInicioContrato?: string | null; // yyyy-mm-dd
  fechaFinContrato?: string | null; // yyyy-mm-dd
  kmAnualContratado?: number | null;

  // --- NUEVO: catálogos ---
  administradorId?: number | null;
  gerenteCuentaId?: number | null;
  tipoActivoId?: number | null;
  tipoCombustibleId?: number | null;
  claseId?: number | null;
  gamaId?: number | null;
  proveedorCompraId?: number | null;
  tipoOperacionId?: number | null;
  nivelBlindajeId?: number | null;

  // --- NUEVO: banderas ---
  blindaje?: boolean;
  sustituto?: boolean;
}

interface Props {
  open: boolean;
  vehiculo: Vehiculo | null; // null = modo "crear"
  onClose: () => void;
  onSaved: () => void; // se llama tras guardar con éxito, para refrescar la lista
}

const VACIO: Vehiculo = {
  placa: '',
  marca: '',
  modelo: '',
  anio: undefined,
  color: '',
  chasis: '',
  noMotor: '',
  clienteId: undefined,
  noContrato: '',
  ciudadId: undefined,
  aseguradoraId: undefined,
  noPoliza: '',
  vencimientoPoliza: '',
  estado: 'Activo',

  noAnexo: '',
  noCotizacion: '',
  noFactura: '',
  fechaInicioContrato: '',
  fechaFinContrato: '',
  kmAnualContratado: undefined,

  administradorId: undefined,
  gerenteCuentaId: undefined,
  tipoActivoId: undefined,
  tipoCombustibleId: undefined,
  claseId: undefined,
  gamaId: undefined,
  proveedorCompraId: undefined,
  tipoOperacionId: undefined,
  nivelBlindajeId: undefined,

  blindaje: false,
  sustituto: false,
};

// Las fechas que vienen del backend llegan como ISO completo (con hora);
// para <input type="date"> hay que recortarlas a yyyy-mm-dd, igual que
// ya se hacía con vencimientoPoliza en Vehiculos.tsx.
function aFechaInput(v: string | null | undefined): string {
  return v ? String(v).slice(0, 10) : '';
}

export function VehiculoFormModal({ open, vehiculo, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Vehiculo>(VACIO);

  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [administradores, setAdministradores] = useState<CatalogoSimple[]>([]);
  const [gerentesCuenta, setGerentesCuenta] = useState<CatalogoSimple[]>([]);
  const [tiposActivo, setTiposActivo] = useState<CatalogoSimple[]>([]);
  const [tiposCombustible, setTiposCombustible] = useState<CatalogoSimple[]>([]);
  const [clases, setClases] = useState<CatalogoSimple[]>([]);
  const [gamas, setGamas] = useState<Gama[]>([]);
  const [proveedoresCompra, setProveedoresCompra] = useState<CatalogoSimple[]>([]);
  const [tiposOperacion, setTiposOperacion] = useState<CatalogoSimple[]>([]);
  const [nivelesBlindaje, setNivelesBlindaje] = useState<CatalogoSimple[]>([]);

  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const esEdicion = Boolean(vehiculo?.id);

  useEffect(() => {
    if (!open) return;
    setForm(
      vehiculo
        ? {
            ...VACIO,
            ...vehiculo,
            vencimientoPoliza: aFechaInput(vehiculo.vencimientoPoliza),
            fechaInicioContrato: aFechaInput(vehiculo.fechaInicioContrato),
            fechaFinContrato: aFechaInput(vehiculo.fechaFinContrato),
          }
        : VACIO
    );
    setErrores({});
    setErrorGeneral('');

    // Catálogos para los selects. Si tus endpoints tienen otro nombre, ajusta aquí.
    api.get('/ciudades').then((res) => setCiudades(res.data)).catch(() => setCiudades([]));
    api.get('/aseguradoras').then((res) => setAseguradoras(res.data)).catch(() => setAseguradoras([]));
    api.get('/clientes').then((res) => setClientes(res.data)).catch(() => setClientes([]));

    api.get('/administradores').then((res) => setAdministradores(res.data)).catch(() => setAdministradores([]));
    api.get('/gerentes-cuenta').then((res) => setGerentesCuenta(res.data)).catch(() => setGerentesCuenta([]));
    api.get('/tipos-activo').then((res) => setTiposActivo(res.data)).catch(() => setTiposActivo([]));
    api.get('/tipos-combustible').then((res) => setTiposCombustible(res.data)).catch(() => setTiposCombustible([]));
    api.get('/clases').then((res) => setClases(res.data)).catch(() => setClases([]));
    api.get('/gamas').then((res) => setGamas(res.data)).catch(() => setGamas([]));
    api.get('/proveedores-compra').then((res) => setProveedoresCompra(res.data)).catch(() => setProveedoresCompra([]));
    api.get('/tipos-operacion').then((res) => setTiposOperacion(res.data)).catch(() => setTiposOperacion([]));
    api.get('/niveles-blindaje').then((res) => setNivelesBlindaje(res.data)).catch(() => setNivelesBlindaje([]));
  }, [open, vehiculo]);

  if (!open) return null;

  function actualizar<K extends keyof Vehiculo>(campo: K, valor: Vehiculo[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  // Al cambiar la clase, la gama elegida deja de ser válida si pertenecía a otra clase.
  function actualizarClase(claseId: number | undefined) {
    setForm((prev) => ({ ...prev, claseId, gamaId: undefined }));
  }

  const gamasDeClaseSeleccionada = form.claseId
    ? gamas.filter((g) => g.claseId === form.claseId)
    : [];

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrores({});
    setErrorGeneral('');

    const payload = {
      ...form,
      placa: form.placa.trim().toUpperCase(),
      anio: form.anio ? Number(form.anio) : undefined,
      clienteId: form.clienteId ? Number(form.clienteId) : undefined,
      ciudadId: form.ciudadId ? Number(form.ciudadId) : undefined,
      aseguradoraId: form.aseguradoraId ? Number(form.aseguradoraId) : undefined,
      vencimientoPoliza: form.vencimientoPoliza || undefined,

      kmAnualContratado: form.kmAnualContratado ? Number(form.kmAnualContratado) : undefined,
      fechaInicioContrato: form.fechaInicioContrato || undefined,
      fechaFinContrato: form.fechaFinContrato || undefined,

      administradorId: form.administradorId ? Number(form.administradorId) : undefined,
      gerenteCuentaId: form.gerenteCuentaId ? Number(form.gerenteCuentaId) : undefined,
      tipoActivoId: form.tipoActivoId ? Number(form.tipoActivoId) : undefined,
      tipoCombustibleId: form.tipoCombustibleId ? Number(form.tipoCombustibleId) : undefined,
      claseId: form.claseId ? Number(form.claseId) : undefined,
      gamaId: form.gamaId ? Number(form.gamaId) : undefined,
      proveedorCompraId: form.proveedorCompraId ? Number(form.proveedorCompraId) : undefined,
      tipoOperacionId: form.tipoOperacionId ? Number(form.tipoOperacionId) : undefined,
      // si desmarcan blindaje, no tiene sentido conservar el nivel
      nivelBlindajeId: form.blindaje && form.nivelBlindajeId ? Number(form.nivelBlindajeId) : undefined,
    };

    try {
      if (esEdicion) {
        await api.put(`/vehiculos/${vehiculo!.id}`, payload);
      } else {
        await api.post('/vehiculos', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const detalles = err?.response?.data?.detalles?.fieldErrors;
      if (detalles) {
        const mapa: Record<string, string> = {};
        Object.entries(detalles).forEach(([campo, msgs]) => {
          if (Array.isArray(msgs) && msgs.length) mapa[campo] = msgs[0];
        });
        setErrores(mapa);
      }
      setErrorGeneral(
        err?.response?.data?.error || 'No se pudo guardar el vehículo. Intenta de nuevo.'
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg shadow-xl max-h-[92vh] overflow-y-auto rounded-t-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {esEdicion ? 'Editar vehículo' : 'Nuevo vehículo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={guardar} className="px-4 sm:px-6 py-5 space-y-5">
          {errorGeneral && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {errorGeneral}
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Identificación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Placa" required error={errores.placa}>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.placa}
                  onChange={(e) => actualizar('placa', e.target.value)}
                  placeholder="PBX-1234"
                  required
                />
              </Campo>
              <Campo label="Cliente" required error={errores.clienteId}>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.clienteId ?? ''}
                  onChange={(e) =>
                    actualizar('clienteId', e.target.value ? Number(e.target.value) : undefined)
                  }
                  required
                >
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Marca" required error={errores.marca}>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.marca}
                  onChange={(e) => actualizar('marca', e.target.value)}
                  required
                />
              </Campo>
              <Campo label="Modelo" required error={errores.modelo}>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.modelo}
                  onChange={(e) => actualizar('modelo', e.target.value)}
                  required
                />
              </Campo>
              <Campo label="Año">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  type="number"
                  value={form.anio ?? ''}
                  onChange={(e) =>
                    actualizar('anio', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="2023"
                />
              </Campo>
              <Campo label="Color">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.color ?? ''}
                  onChange={(e) => actualizar('color', e.target.value)}
                />
              </Campo>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Datos técnicos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Chasis">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.chasis ?? ''}
                  onChange={(e) => actualizar('chasis', e.target.value)}
                />
              </Campo>
              <Campo label="No. de motor">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.noMotor ?? ''}
                  onChange={(e) => actualizar('noMotor', e.target.value)}
                />
              </Campo>
              <Campo label="No. de contrato">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.noContrato ?? ''}
                  onChange={(e) => actualizar('noContrato', e.target.value)}
                />
              </Campo>
              <Campo label="Ciudad">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.ciudadId ?? ''}
                  onChange={(e) =>
                    actualizar('ciudadId', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {ciudades.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Tipo de combustible">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.tipoCombustibleId ?? ''}
                  onChange={(e) =>
                    actualizar('tipoCombustibleId', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {tiposCombustible.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Clasificación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Clase">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.claseId ?? ''}
                  onChange={(e) => actualizarClase(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">— Sin especificar —</option>
                  {clases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Gama">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                  value={form.gamaId ?? ''}
                  onChange={(e) => actualizar('gamaId', e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!form.claseId}
                >
                  <option value="">
                    {form.claseId ? '— Sin especificar —' : 'Elige primero una clase'}
                  </option>
                  {gamasDeClaseSeleccionada.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Tipo de activo">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.tipoActivoId ?? ''}
                  onChange={(e) =>
                    actualizar('tipoActivoId', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {tiposActivo.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Tipo de operación">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.tipoOperacionId ?? ''}
                  onChange={(e) =>
                    actualizar('tipoOperacionId', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {tiposOperacion.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Blindaje
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={Boolean(form.blindaje)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      blindaje: e.target.checked,
                      nivelBlindajeId: e.target.checked ? prev.nivelBlindajeId : undefined,
                    }))
                  }
                />
                Vehículo blindado
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={Boolean(form.sustituto)}
                  onChange={(e) => actualizar('sustituto', e.target.checked)}
                />
                Es vehículo sustituto
              </label>
              <Campo label="Nivel de blindaje">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                  value={form.nivelBlindajeId ?? ''}
                  onChange={(e) =>
                    actualizar('nivelBlindajeId', e.target.value ? Number(e.target.value) : undefined)
                  }
                  disabled={!form.blindaje}
                >
                  <option value="">{form.blindaje ? '— Sin especificar —' : 'N/A'}</option>
                  {nivelesBlindaje.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Contrato y compra
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="No. de anexo">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.noAnexo ?? ''}
                  onChange={(e) => actualizar('noAnexo', e.target.value)}
                />
              </Campo>
              <Campo label="No. de cotización">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.noCotizacion ?? ''}
                  onChange={(e) => actualizar('noCotizacion', e.target.value)}
                />
              </Campo>
              <Campo label="No. de factura">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.noFactura ?? ''}
                  onChange={(e) => actualizar('noFactura', e.target.value)}
                />
              </Campo>
              <Campo label="Km anual contratado">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  type="number"
                  value={form.kmAnualContratado ?? ''}
                  onChange={(e) =>
                    actualizar('kmAnualContratado', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="20000"
                />
              </Campo>
              <Campo label="Fecha inicio de contrato">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  type="date"
                  value={form.fechaInicioContrato ?? ''}
                  onChange={(e) => actualizar('fechaInicioContrato', e.target.value)}
                />
              </Campo>
              <Campo label="Fecha fin de contrato">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  type="date"
                  value={form.fechaFinContrato ?? ''}
                  onChange={(e) => actualizar('fechaFinContrato', e.target.value)}
                />
              </Campo>
              <Campo label="Proveedor de compra">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.proveedorCompraId ?? ''}
                  onChange={(e) =>
                    actualizar('proveedorCompraId', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {proveedoresCompra.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Gestión
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Administrador">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.administradorId ?? ''}
                  onChange={(e) =>
                    actualizar('administradorId', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {administradores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Gerente de cuenta">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.gerenteCuentaId ?? ''}
                  onChange={(e) =>
                    actualizar('gerenteCuentaId', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {gerentesCuenta.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Seguro
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Aseguradora">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.aseguradoraId ?? ''}
                  onChange={(e) =>
                    actualizar(
                      'aseguradoraId',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                >
                  <option value="">— Sin especificar —</option>
                  {aseguradoras.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="No. de póliza">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.noPoliza ?? ''}
                  onChange={(e) => actualizar('noPoliza', e.target.value)}
                />
              </Campo>
              <Campo label="Vencimiento de póliza">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  type="date"
                  value={form.vencimientoPoliza ?? ''}
                  onChange={(e) => actualizar('vencimientoPoliza', e.target.value)}
                />
              </Campo>
              <Campo label="Estado">
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  value={form.estado ?? 'Activo'}
                  onChange={(e) => actualizar('estado', e.target.value)}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Baja">Baja</option>
                </select>
              </Campo>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 text-sm rounded-md bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}
