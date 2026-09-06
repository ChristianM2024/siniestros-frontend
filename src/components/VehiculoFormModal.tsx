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
};

export function VehiculoFormModal({ open, vehiculo, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Vehiculo>(VACIO);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const esEdicion = Boolean(vehiculo?.id);

  useEffect(() => {
    if (!open) return;
    setForm(vehiculo ? { ...VACIO, ...vehiculo } : VACIO);
    setErrores({});
    setErrorGeneral('');

    // Catálogos para los selects. Si tus endpoints tienen otro nombre, ajusta aquí.
    api.get('/ciudades').then((res) => setCiudades(res.data)).catch(() => setCiudades([]));
    api
      .get('/aseguradoras')
      .then((res) => setAseguradoras(res.data))
      .catch(() => setAseguradoras([]));
    api
      .get('/clientes')
      .then((res) => setClientes(res.data))
      .catch(() => setClientes([]));
  }, [open, vehiculo]);

  if (!open) return null;

  function actualizar<K extends keyof Vehiculo>(campo: K, valor: Vehiculo[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

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