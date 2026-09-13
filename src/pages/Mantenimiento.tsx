import { useEffect, useState, FormEvent } from 'react';
import {
  Plus, Pencil, Trash2, X, AlertCircle, Building2, Users,
  UserCog, Briefcase, Tag, Fuel, Layers, LayoutGrid, Truck, ShieldAlert, Shield,
  ListChecks, Wrench, CreditCard, ChevronDown, ChevronRight, MapPin, Cog,
} from 'lucide-react';
import { api } from '../api/client';

interface Cliente {
  id: number;
  nombre: string;
  celular: string | null;
  correo: string | null;
  activo: boolean;
  _count: { vehiculos: number };
}

interface Aseguradora {
  id: number;
  nombre: string;
  _count: { vehiculos: number };
}

// Forma común de los catálogos simples (administrador, gerenteCuenta, transmision, etc.)
interface CatalogoSimple {
  id: number;
  nombre: string;
  _count: { vehiculos: number };
}

interface Clase {
  id: number;
  nombre: string;
  _count: { vehiculos: number };
}

interface Gama {
  id: number;
  nombre: string;
  claseId: number;
  clase: Clase;
  _count: { vehiculos: number };
}

interface TipoSiniestro {
  id: number;
  codigo: string;
  nombre: string;
  estado: boolean;
  _count: { siniestros: number };
}

// ---- NUEVOS TIPOS ----

interface Ciudad {
  id: number;
  nombre: string;
}

interface PuntoAtencionTaller {
  id: number;
  nombre: string;
  tallerCiudadId: number;
}

interface TallerCiudad {
  id: number;
  tallerId: number;
  ciudadId: number;
  ciudad: Ciudad;
  _count: { puntosAtencion: number };
}

interface Taller {
  id: number;
  nombre: string;
  activo: boolean;
  _count: { siniestros: number };
  ciudades: TallerCiudad[];
}

interface EstatusCobroCliente {
  id: number;
  nombre: string;
  _count: { siniestros: number };
}

interface EstatusSiniestro {
  id: number;
  nombre: string;
  tipoSiniestroId: number;
  orden: number;
  activo: boolean;
  _count: { siniestros: number };
}

type Tab =
  | 'clientes' | 'aseguradoras'
  | 'administradores' | 'gerentesCuenta' | 'tiposActivo' | 'tiposCombustible'
  | 'clases' | 'gamas' | 'proveedoresCompra' | 'tiposOperacion' | 'nivelesBlindaje'
  | 'tiposSiniestro'
  | 'talleres' | 'estatusCobroCliente' | 'estatusSiniestro'
  | 'transmisiones'; // <-- NUEVA

// Config de cada catálogo simple: ruta de API, etiquetas y en qué tab vive.
const CATALOGOS_SIMPLES: Record<
  Exclude<Tab, 'clientes' | 'aseguradoras' | 'gamas' | 'tiposSiniestro' | 'talleres' | 'estatusCobroCliente' | 'estatusSiniestro'>,
  { apiPath: string; titulo: string; singular: string; icono: any }
> = {
  administradores:   { apiPath: '/administradores',     titulo: 'Administradores',      singular: 'administrador',       icono: UserCog },
  gerentesCuenta:    { apiPath: '/gerentes-cuenta',      titulo: 'Gerentes de Cuenta',    singular: 'gerente de cuenta',   icono: Briefcase },
  tiposActivo:       { apiPath: '/tipos-activo',         titulo: 'Tipos de Activo',       singular: 'tipo de activo',      icono: Tag },
  tiposCombustible:  { apiPath: '/tipos-combustible',    titulo: 'Tipos de Combustible',  singular: 'tipo de combustible', icono: Fuel },
  clases:            { apiPath: '/clases',               titulo: 'Clases',                singular: 'clase',               icono: Layers },
  proveedoresCompra: { apiPath: '/proveedores-compra',   titulo: 'Proveedores de Compra',  singular: 'proveedor de compra', icono: Truck },
  tiposOperacion:    { apiPath: '/tipos-operacion',      titulo: 'Tipos de Operación',    singular: 'tipo de operación',   icono: LayoutGrid },
  nivelesBlindaje:   { apiPath: '/niveles-blindaje',     titulo: 'Niveles de Blindaje',   singular: 'nivel de blindaje',   icono: ShieldAlert },
  transmisiones:     { apiPath: '/transmisiones',        titulo: 'Transmisiones',         singular: 'transmisión',         icono: Cog }, // <-- NUEVA
};

const TABS: { id: Tab; label: string; icono: any }[] = [
  { id: 'clientes', label: 'Clientes', icono: Users },
  { id: 'aseguradoras', label: 'Aseguradoras', icono: Building2 },
  { id: 'administradores', label: 'Administradores', icono: UserCog },
  { id: 'gerentesCuenta', label: 'Gerentes de Cuenta', icono: Briefcase },
  { id: 'tiposActivo', label: 'Tipos de Activo', icono: Tag },
  { id: 'tiposCombustible', label: 'Tipos de Combustible', icono: Fuel },
  { id: 'clases', label: 'Clases', icono: Layers },
  { id: 'gamas', label: 'Gamas', icono: LayoutGrid },
  { id: 'proveedoresCompra', label: 'Proveedores de Compra', icono: Truck },
  { id: 'tiposOperacion', label: 'Tipos de Operación', icono: LayoutGrid },
  { id: 'nivelesBlindaje', label: 'Niveles de Blindaje', icono: Shield },
  { id: 'tiposSiniestro', label: 'Tipos de Siniestro', icono: ListChecks },
  { id: 'talleres', label: 'Talleres', icono: Wrench },
  { id: 'estatusCobroCliente', label: 'Estatus de Cobro al Cliente', icono: CreditCard },
  { id: 'estatusSiniestro', label: 'Estatus de Siniestro', icono: ListChecks },
  { id: 'transmisiones', label: 'Transmisiones', icono: Cog }, // <-- NUEVA
];

const TABS_CON_COMPONENTE_PROPIO: Tab[] = [
  'clientes', 'aseguradoras', 'gamas', 'tiposSiniestro',
  'talleres', 'estatusCobroCliente', 'estatusSiniestro',
];

export default function Mantenimiento() {
  const [tab, setTab] = useState<Tab>('clientes');

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Mantenimiento</h1>
        <p className="text-slate-500 mt-1 text-sm">Administra los catálogos usados en Vehículos, Contratos y Siniestros.</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ id, label, icono: Icono }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icono className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'clientes' && <TabClientes />}
      {tab === 'aseguradoras' && <TabAseguradoras />}
      {tab === 'gamas' && <TabGamas />}
      {tab === 'tiposSiniestro' && <TabTiposSiniestro />}
      {tab === 'talleres' && <TabTalleres />}
      {tab === 'estatusCobroCliente' && <TabEstatusCobroCliente />}
      {tab === 'estatusSiniestro' && <TabEstatusSiniestro />}
      {!TABS_CON_COMPONENTE_PROPIO.includes(tab) && (
        <TabCatalogoSimple config={CATALOGOS_SIMPLES[tab as Exclude<Tab, 'clientes' | 'aseguradoras' | 'gamas' | 'tiposSiniestro' | 'talleres' | 'estatusCobroCliente' | 'estatusSiniestro'>]} />
      )}
    </div>
  );
}

// ============================================================
// CATALOGO SIMPLE GENERICO (Administradores, Gerentes de Cuenta,
// Tipos de Activo, Tipos de Combustible, Clases, Proveedores de
// Compra, Tipos de Operación, Niveles de Blindaje, Transmisiones)
// ============================================================

function TabCatalogoSimple({ config }: { config: { apiPath: string; titulo: string; singular: string } }) {
  const [items, setItems] = useState<CatalogoSimple[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<CatalogoSimple | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get<CatalogoSimple[]>(config.apiPath);
      setItems(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [config.apiPath]);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(item: CatalogoSimple) {
    setEditando(item);
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(nombre: string) {
    setError(null);
    try {
      if (editando) {
        await api.put(`${config.apiPath}/${editando.id}`, { nombre: nombre.trim() });
      } else {
        await api.post(config.apiPath, { nombre: nombre.trim() });
      }
      setModalAbierto(false);
      cargar();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? `No se pudo guardar ${config.singular}.`);
    }
  }

  async function eliminar(item: CatalogoSimple) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    try {
      await api.delete(`${config.apiPath}/${item.id}`);
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? `No se pudo eliminar ${config.singular}.`);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Nuevo {config.singular}
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No hay {config.titulo.toLowerCase()} registrados todavía.</p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{item.nombre}</div>
                <div className="text-sm text-slate-500">{item._count.vehiculos} vehículo(s)</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(item)} className="p-2 text-slate-500 hover:text-slate-900">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(item)} className="p-2 text-slate-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalNombreUnico
          titulo={editando ? `Editar ${config.singular}` : `Nuevo ${config.singular}`}
          inicial={editando?.nombre ?? ''}
          error={error}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

function ModalNombreUnico({
  titulo, inicial, error, onGuardar, onCerrar,
}: {
  titulo: string;
  inicial: string;
  error: string | null;
  onGuardar: (nombre: string) => void;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    onGuardar(nombre);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// GAMAS (depende de Clase — no usa el genérico)
// ============================================================

function TabGamas() {
  const [gamas, setGamas] = useState<Gama[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Gama | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const [gamasRes, clasesRes] = await Promise.all([
        api.get<Gama[]>('/gamas'),
        api.get<Clase[]>('/clases'),
      ]);
      setGamas(gamasRes.data);
      setClases(clasesRes.data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(g: Gama) {
    setEditando(g);
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(datos: { nombre: string; claseId: number }) {
    setError(null);
    try {
      if (editando) {
        await api.put(`/gamas/${editando.id}`, datos);
      } else {
        await api.post('/gamas', datos);
      }
      setModalAbierto(false);
      cargar();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo guardar la gama.');
    }
  }

  async function eliminar(g: Gama) {
    if (!confirm(`¿Eliminar "${g.nombre}" (${g.clase.nombre})?`)) return;
    try {
      await api.delete(`/gamas/${g.id}`);
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo eliminar la gama.');
    }
  }

  if (!cargando && clases.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Primero crea al menos una <strong>Clase</strong> (pestaña "Clases") — cada gama pertenece a una clase.
      </p>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Nueva gama
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : gamas.length === 0 ? (
        <p className="text-sm text-slate-500">No hay gamas registradas todavía.</p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {gamas.map((g) => (
            <div key={g.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{g.nombre}</div>
                <div className="text-sm text-slate-500">{g.clase.nombre} · {g._count.vehiculos} vehículo(s)</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(g)} className="p-2 text-slate-500 hover:text-slate-900">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(g)} className="p-2 text-slate-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalGama
          inicial={editando}
          clases={clases}
          error={error}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

function ModalGama({
  inicial, clases, error, onGuardar, onCerrar,
}: {
  inicial: Gama | null;
  clases: Clase[];
  error: string | null;
  onGuardar: (d: { nombre: string; claseId: number }) => void;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [claseId, setClaseId] = useState<number>(inicial?.claseId ?? clases[0]?.id ?? 0);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !claseId) return;
    onGuardar({ nombre: nombre.trim(), claseId });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">{inicial ? 'Editar gama' : 'Nueva gama'}</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Clase *</label>
            <select
              value={claseId}
              onChange={(e) => setClaseId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            >
              {clases.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la gama *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Gama Alta"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TIPOS DE SINIESTRO (código + nombre + estado — no usa el genérico)
// ============================================================

function TabTiposSiniestro() {
  const [items, setItems] = useState<TipoSiniestro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<TipoSiniestro | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get<TipoSiniestro[]>('/tipos-siniestro');
      setItems(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(item: TipoSiniestro) {
    setEditando(item);
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(datos: { codigo: string; nombre: string; estado: boolean }) {
    setError(null);
    try {
      if (editando) {
        await api.put(`/tipos-siniestro/${editando.id}`, datos);
      } else {
        await api.post('/tipos-siniestro', datos);
      }
      setModalAbierto(false);
      cargar();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo guardar el tipo de siniestro.');
    }
  }

  async function eliminar(item: TipoSiniestro) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    try {
      await api.delete(`/tipos-siniestro/${item.id}`);
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo eliminar el tipo de siniestro.');
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Nuevo tipo de siniestro
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay tipos de siniestro registrados. Crea al menos "Simple" y "Por Ingresar".
        </p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  {item.nombre}
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {item.codigo}
                  </span>
                  {!item.estado && (
                    <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Inactivo</span>
                  )}
                </div>
                <div className="text-sm text-slate-500">{item._count.siniestros} siniestro(s)</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(item)} className="p-2 text-slate-500 hover:text-slate-900">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(item)} className="p-2 text-slate-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalTipoSiniestro
          inicial={editando}
          error={error}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

function ModalTipoSiniestro({
  inicial, error, onGuardar, onCerrar,
}: {
  inicial: TipoSiniestro | null;
  error: string | null;
  onGuardar: (d: { codigo: string; nombre: string; estado: boolean }) => void;
  onCerrar: () => void;
}) {
  const [codigo, setCodigo] = useState(inicial?.codigo ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [estado, setEstado] = useState(inicial?.estado ?? true);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) return;
    onGuardar({ codigo: codigo.trim(), nombre: nombre.trim(), estado });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {inicial ? 'Editar tipo de siniestro' : 'Nuevo tipo de siniestro'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Código *</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="SIMPLE"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Simple"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={estado}
              onChange={(e) => setEstado(e.target.checked)}
              className="rounded border-slate-300"
            />
            Activo
          </label>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TALLERES (Taller -> Ciudades del Taller -> Puntos de Atención)
// UI de acordeón: cada taller se puede expandir para ver/gestionar
// sus ciudades, y cada ciudad se puede expandir para ver/gestionar
// sus puntos de atención.
// ============================================================

function TabTalleres() {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [ciudadesCatalogo, setCiudadesCatalogo] = useState<Ciudad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Taller | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tallerExpandido, setTallerExpandido] = useState<number | null>(null);
  const [ciudadExpandida, setCiudadExpandida] = useState<number | null>(null); // id de TallerCiudad

  async function cargar() {
    setCargando(true);
    try {
      const [talleresRes, ciudadesRes] = await Promise.all([
        api.get<Taller[]>('/talleres'),
        api.get<Ciudad[]>('/ciudades'),
      ]);
      setTalleres(talleresRes.data);
      setCiudadesCatalogo(ciudadesRes.data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(t: Taller) {
    setEditando(t);
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(nombre: string) {
    setError(null);
    try {
      if (editando) {
        await api.put(`/talleres/${editando.id}`, { nombre: nombre.trim() });
      } else {
        await api.post('/talleres', { nombre: nombre.trim() });
      }
      setModalAbierto(false);
      cargar();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo guardar el taller.');
    }
  }

  async function eliminar(t: Taller) {
    if (!confirm(`¿Eliminar el taller "${t.nombre}"?`)) return;
    try {
      await api.delete(`/talleres/${t.id}`);
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo eliminar el taller.');
    }
  }

  function toggleTaller(id: number) {
    setTallerExpandido(tallerExpandido === id ? null : id);
    setCiudadExpandida(null);
  }

  async function agregarCiudad(tallerId: number, ciudadId: number) {
    try {
      await api.post(`/talleres/${tallerId}/ciudades`, { ciudadId });
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo asignar la ciudad a este taller.');
    }
  }

  async function quitarCiudad(tallerCiudadId: number) {
    if (!confirm('¿Quitar esta ciudad del taller?')) return;
    try {
      await api.delete(`/taller-ciudades/${tallerCiudadId}`);
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo quitar la ciudad de este taller.');
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Nuevo taller
        </button>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Haz clic en un taller para ver sus ciudades, y en una ciudad para ver sus puntos de atención.
      </p>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : talleres.length === 0 ? (
        <p className="text-sm text-slate-500">No hay talleres registrados todavía.</p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {talleres.map((t) => (
            <div key={t.id}>
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => toggleTaller(t.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {tallerExpandido === t.id ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-medium text-slate-900">
                      {t.nombre}
                      {!t.activo && (
                        <span className="ml-2 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Inactivo</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      {t.ciudades.length} ciudad(es) · {t._count.siniestros} siniestro(s)
                    </div>
                  </div>
                </button>
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(t)} className="p-2 text-slate-500 hover:text-slate-900">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => eliminar(t)} className="p-2 text-slate-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {tallerExpandido === t.id && (
                <div className="bg-slate-50 px-4 py-3 pl-10">
                  <PanelCiudadesTaller
                    taller={t}
                    ciudadesCatalogo={ciudadesCatalogo}
                    ciudadExpandida={ciudadExpandida}
                    onToggleCiudad={(id) => setCiudadExpandida(ciudadExpandida === id ? null : id)}
                    onAgregarCiudad={(ciudadId) => agregarCiudad(t.id, ciudadId)}
                    onQuitarCiudad={quitarCiudad}
                    onCambio={cargar}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalNombreUnico
          titulo={editando ? 'Editar taller' : 'Nuevo taller'}
          inicial={editando?.nombre ?? ''}
          error={error}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

function PanelCiudadesTaller({
  taller, ciudadesCatalogo, ciudadExpandida, onToggleCiudad, onAgregarCiudad, onQuitarCiudad, onCambio,
}: {
  taller: Taller;
  ciudadesCatalogo: Ciudad[];
  ciudadExpandida: number | null;
  onToggleCiudad: (id: number) => void;
  onAgregarCiudad: (ciudadId: number) => void;
  onQuitarCiudad: (tallerCiudadId: number) => void;
  onCambio: () => void;
}) {
  const [ciudadNuevaId, setCiudadNuevaId] = useState('');

  // Ciudades del catálogo general que este taller todavía NO tiene asignadas
  const ciudadesDisponibles = ciudadesCatalogo.filter(
    (c) => !taller.ciudades.some((tc) => tc.ciudadId === c.id)
  );

  function agregar() {
    if (!ciudadNuevaId) return;
    onAgregarCiudad(Number(ciudadNuevaId));
    setCiudadNuevaId('');
  }

  return (
    <div className="space-y-2">
      {taller.ciudades.length === 0 ? (
        <p className="text-sm text-slate-500">Este taller no tiene ciudades asignadas todavía.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
          {taller.ciudades.map((tc) => (
            <div key={tc.id}>
              <div className="flex items-center justify-between px-3 py-2">
                <button
                  onClick={() => onToggleCiudad(tc.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {ciudadExpandida === tc.id ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-800">{tc.ciudad.nombre}</span>
                  <span className="text-xs text-slate-400">
                    ({tc._count.puntosAtencion} punto{tc._count.puntosAtencion !== 1 ? 's' : ''} de atención)
                  </span>
                </button>
                <button onClick={() => onQuitarCiudad(tc.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {ciudadExpandida === tc.id && (
                <div className="bg-slate-50 px-3 py-2 pl-9">
                  <PanelPuntosAtencion tallerCiudadId={tc.id} onCambio={onCambio} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ciudadesDisponibles.length > 0 ? (
        <div className="flex gap-2 pt-1">
          <select
            value={ciudadNuevaId}
            onChange={(e) => setCiudadNuevaId(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">Agregar ciudad…</option>
            {ciudadesDisponibles.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button
            onClick={agregar}
            disabled={!ciudadNuevaId}
            className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          Todas las ciudades del catálogo ya están asignadas a este taller.
        </p>
      )}
    </div>
  );
}

function PanelPuntosAtencion({ tallerCiudadId, onCambio }: { tallerCiudadId: number; onCambio: () => void }) {
  const [puntos, setPuntos] = useState<PuntoAtencionTaller[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombreNuevo, setNombreNuevo] = useState('');

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get<PuntoAtencionTaller[]>(`/taller-ciudades/${tallerCiudadId}/puntos-atencion`);
      setPuntos(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [tallerCiudadId]);

  async function agregar() {
    if (!nombreNuevo.trim()) return;
    try {
      await api.post(`/taller-ciudades/${tallerCiudadId}/puntos-atencion`, { nombre: nombreNuevo.trim() });
      setNombreNuevo('');
      cargar();
      onCambio(); // refresca el contador en el panel de arriba
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo agregar el punto de atención.');
    }
  }

  async function eliminar(p: PuntoAtencionTaller) {
    if (!confirm(`¿Eliminar el punto de atención "${p.nombre}"?`)) return;
    try {
      await api.delete(`/puntos-atencion-taller/${p.id}`);
      cargar();
      onCambio();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo eliminar el punto de atención.');
    }
  }

  return (
    <div className="space-y-2">
      {cargando ? (
        <p className="text-xs text-slate-400">Cargando puntos de atención…</p>
      ) : puntos.length === 0 ? (
        <p className="text-xs text-slate-400">Sin puntos de atención en esta ciudad todavía.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
          {puntos.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-1.5">
              <span className="text-sm text-slate-700">{p.nombre}</span>
              <button onClick={() => eliminar(p)} className="p-1 text-slate-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre del punto de atención"
          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
        />
        <button
          onClick={agregar}
          disabled={!nombreNuevo.trim()}
          className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg disabled:opacity-40"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ESTATUS DE COBRO AL CLIENTE (catálogo simple, cuenta
// siniestros en vez de vehículos — por eso no usa el genérico)
// ============================================================

function TabEstatusCobroCliente() {
  const [items, setItems] = useState<EstatusCobroCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<EstatusCobroCliente | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get<EstatusCobroCliente[]>('/estatus-cobro-cliente');
      setItems(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(item: EstatusCobroCliente) {
    setEditando(item);
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(nombre: string) {
    setError(null);
    try {
      if (editando) {
        await api.put(`/estatus-cobro-cliente/${editando.id}`, { nombre: nombre.trim() });
      } else {
        await api.post('/estatus-cobro-cliente', { nombre: nombre.trim() });
      }
      setModalAbierto(false);
      cargar();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo guardar el estatus de cobro.');
    }
  }

  async function eliminar(item: EstatusCobroCliente) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    try {
      await api.delete(`/estatus-cobro-cliente/${item.id}`);
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo eliminar el estatus de cobro.');
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Nuevo estatus de cobro
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No hay estatus de cobro registrados todavía.</p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{item.nombre}</div>
                <div className="text-sm text-slate-500">{item._count.siniestros} siniestro(s)</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(item)} className="p-2 text-slate-500 hover:text-slate-900">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(item)} className="p-2 text-slate-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalNombreUnico
          titulo={editando ? 'Editar estatus de cobro' : 'Nuevo estatus de cobro'}
          inicial={editando?.nombre ?? ''}
          error={error}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// ESTATUS DE SINIESTRO (filtrado por Tipo de Siniestro)
// Primero se elige el tipo, luego se ve/gestiona su lista de
// estatus posibles (con orden de aparición en los combos).
// ============================================================

function TabEstatusSiniestro() {
  const [tipos, setTipos] = useState<TipoSiniestro[]>([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<number | null>(null);
  const [items, setItems] = useState<EstatusSiniestro[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<EstatusSiniestro | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargarTipos() {
    setCargandoTipos(true);
    try {
      const { data } = await api.get<TipoSiniestro[]>('/tipos-siniestro');
      setTipos(data);
      if (data.length > 0 && tipoSeleccionado === null) {
        setTipoSeleccionado(data[0].id);
      }
    } finally {
      setCargandoTipos(false);
    }
  }

  async function cargarItems(tipoId: number) {
    setCargandoItems(true);
    try {
      const { data } = await api.get<EstatusSiniestro[]>('/estatus-siniestro', {
        params: { tipoSiniestroId: tipoId },
      });
      setItems(data);
    } finally {
      setCargandoItems(false);
    }
  }

  useEffect(() => { cargarTipos(); }, []);
  useEffect(() => {
    if (tipoSeleccionado !== null) cargarItems(tipoSeleccionado);
  }, [tipoSeleccionado]);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(item: EstatusSiniestro) {
    setEditando(item);
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(datos: { nombre: string; orden: number }) {
    if (!tipoSeleccionado) return;
    setError(null);
    try {
      if (editando) {
        await api.put(`/estatus-siniestro/${editando.id}`, datos);
      } else {
        await api.post('/estatus-siniestro', { ...datos, tipoSiniestroId: tipoSeleccionado });
      }
      setModalAbierto(false);
      cargarItems(tipoSeleccionado);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo guardar el estatus.');
    }
  }

  async function eliminar(item: EstatusSiniestro) {
    if (!confirm(`¿Eliminar el estatus "${item.nombre}"?`)) return;
    try {
      await api.delete(`/estatus-siniestro/${item.id}`);
      if (tipoSeleccionado) cargarItems(tipoSeleccionado);
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo eliminar el estatus.');
    }
  }

  if (!cargandoTipos && tipos.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Primero crea al menos un <strong>Tipo de Siniestro</strong> (pestaña "Tipos de Siniestro") —
        cada estatus pertenece a un tipo específico.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <select
          value={tipoSeleccionado ?? ''}
          onChange={(e) => setTipoSeleccionado(Number(e.target.value))}
          className="px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm flex-1 max-w-xs"
        >
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
        <button
          onClick={abrirNuevo}
          disabled={!tipoSeleccionado}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Nuevo estatus
        </button>
      </div>

      {cargandoItems ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Este tipo de siniestro todavía no tiene estatus configurados.</p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  {item.nombre}
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    orden {item.orden}
                  </span>
                  {!item.activo && (
                    <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Inactivo</span>
                  )}
                </div>
                <div className="text-sm text-slate-500">{item._count.siniestros} siniestro(s)</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(item)} className="p-2 text-slate-500 hover:text-slate-900">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(item)} className="p-2 text-slate-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalEstatusSiniestro
          inicial={editando}
          error={error}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

function ModalEstatusSiniestro({
  inicial, error, onGuardar, onCerrar,
}: {
  inicial: EstatusSiniestro | null;
  error: string | null;
  onGuardar: (d: { nombre: string; orden: number }) => void;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [orden, setOrden] = useState<number>(inicial?.orden ?? 0);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    onGuardar({ nombre: nombre.trim(), orden });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {inicial ? 'Editar estatus' : 'Nuevo estatus'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="En Peritaje"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Orden</label>
            <input
              type="number"
              value={orden}
              onChange={(e) => setOrden(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-xs text-slate-400 mt-1">Define el orden en que aparece este estatus en el combo (menor primero).</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CLIENTES
// ============================================================

function TabClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get<Cliente[]>('/clientes');
      setClientes(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(c: Cliente) {
    setEditando(c);
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(datos: { nombre: string; celular: string; correo: string }) {
    setError(null);
    try {
      const payload = {
        nombre: datos.nombre.trim(),
        celular: datos.celular.trim() || undefined,
        correo: datos.correo.trim() || undefined,
      };
      if (editando) {
        await api.put(`/clientes/${editando.id}`, payload);
      } else {
        await api.post('/clientes', payload);
      }
      setModalAbierto(false);
      cargar();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo guardar el cliente.');
    }
  }

  async function eliminar(c: Cliente) {
    if (!confirm(`¿Eliminar a "${c.nombre}"?`)) return;
    try {
      await api.delete(`/clientes/${c.id}`);
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo eliminar el cliente.');
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : clientes.length === 0 ? (
        <p className="text-sm text-slate-500">No hay clientes registrados todavía.</p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {clientes.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{c.nombre}</div>
                <div className="text-sm text-slate-500">
                  {c.celular || 'sin celular'} · {c.correo || 'sin correo'} · {c._count.vehiculos} vehículo(s)
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(c)} className="p-2 text-slate-500 hover:text-slate-900">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(c)} className="p-2 text-slate-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalCliente
          inicial={editando}
          error={error}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

function ModalCliente({
  inicial, error, onGuardar, onCerrar,
}: {
  inicial: Cliente | null;
  error: string | null;
  onGuardar: (d: { nombre: string; celular: string; correo: string }) => void;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [celular, setCelular] = useState(inicial?.celular ?? '');
  const [correo, setCorreo] = useState(inicial?.correo ?? '');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    onGuardar({ nombre, celular, correo });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">{inicial ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Celular</label>
            <input
              type="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="0991234567"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="cliente@correo.com"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ASEGURADORAS
// ============================================================

function TabAseguradoras() {
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Aseguradora | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get<Aseguradora[]>('/aseguradoras');
      setAseguradoras(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(a: Aseguradora) {
    setEditando(a);
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(nombre: string) {
    setError(null);
    try {
      if (editando) {
        await api.put(`/aseguradoras/${editando.id}`, { nombre: nombre.trim() });
      } else {
        await api.post('/aseguradoras', { nombre: nombre.trim() });
      }
      setModalAbierto(false);
      cargar();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo guardar la aseguradora.');
    }
  }

  async function eliminar(a: Aseguradora) {
    if (!confirm(`¿Eliminar "${a.nombre}"?`)) return;
    try {
      await api.delete(`/aseguradoras/${a.id}`);
      cargar();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'No se pudo eliminar la aseguradora.');
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Nueva aseguradora
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : aseguradoras.length === 0 ? (
        <p className="text-sm text-slate-500">No hay aseguradoras registradas todavía.</p>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {aseguradoras.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{a.nombre}</div>
                <div className="text-sm text-slate-500">{a._count.vehiculos} vehículo(s)</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(a)} className="p-2 text-slate-500 hover:text-slate-900">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(a)} className="p-2 text-slate-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalAseguradora
          inicial={editando}
          error={error}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

function ModalAseguradora({
  inicial, error, onGuardar, onCerrar,
}: {
  inicial: Aseguradora | null;
  error: string | null;
  onGuardar: (nombre: string) => void;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    onGuardar(nombre);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">{inicial ? 'Editar aseguradora' : 'Nueva aseguradora'}</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
