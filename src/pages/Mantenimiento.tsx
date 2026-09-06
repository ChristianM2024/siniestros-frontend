import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, AlertCircle, Building2, Users } from 'lucide-react';
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

type Tab = 'clientes' | 'aseguradoras';

export default function Mantenimiento() {
  const [tab, setTab] = useState<Tab>('clientes');

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Mantenimiento</h1>
        <p className="text-slate-500 mt-1 text-sm">Administra los catálogos de clientes y aseguradoras.</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setTab('clientes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'clientes' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> Clientes
        </button>
        <button
          onClick={() => setTab('aseguradoras')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'aseguradoras' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" /> Aseguradoras
        </button>
      </div>

      {tab === 'clientes' ? <TabClientes /> : <TabAseguradoras />}
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