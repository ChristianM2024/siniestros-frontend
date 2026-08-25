import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { VehiculoFormModal, type Vehiculo } from '../components/VehiculoFormModal';

export function Vehiculos() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [vehiculoEditar, setVehiculoEditar] = useState<Vehiculo | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  function cargarVehiculos() {
    setCargando(true);
    setError('');
    api
      .get('/vehiculos')
      .then((res) => setVehiculos(res.data))
      .catch(() => setError('No se pudo cargar la lista de vehículos.'))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargarVehiculos();
  }, []);

  function abrirCrear() {
    setVehiculoEditar(null);
    setModalAbierto(true);
  }

  function abrirEditar(v: Vehiculo) {
    setVehiculoEditar({
      ...v,
      vencimientoPoliza: v.vencimientoPoliza ? String(v.vencimientoPoliza).slice(0, 10) : '',
    });
    setModalAbierto(true);
  }

  async function eliminar(v: Vehiculo) {
    if (!v.id) return;
    const confirmar = window.confirm(
      `¿Eliminar el vehículo con placa ${v.placa}? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    setEliminandoId(v.id);
    try {
      await api.delete(`/vehiculos/${v.id}`);
      setVehiculos((prev) => prev.filter((x) => x.id !== v.id));
    } catch {
      alert('No se pudo eliminar el vehículo. Puede que tenga siniestros asociados.');
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div>
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Registro de Vehículos</h1>
          <p className="text-sm text-slate-500">
            Flota en renting — {vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="w-full sm:w-auto px-4 py-2 text-sm rounded-md bg-slate-800 text-white hover:bg-slate-700"
        >
          + Nuevo vehículo
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {cargando ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">Cargando vehículos...</div>
        ) : vehiculos.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            No hay vehículos registrados todavía.{' '}
            <button onClick={abrirCrear} className="text-slate-700 underline">
              Agrega el primero
            </button>
            .
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                {['Placa', 'Marca', 'Modelo', 'Cliente', 'Ciudad', 'Estado', 'Siniestros', ''].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 font-medium text-slate-600">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((v: any) => (
                <tr key={v.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{v.placa}</td>
                  <td className="px-3 py-2">{v.marca}</td>
                  <td className="px-3 py-2">{v.modelo}</td>
                  <td className="px-3 py-2">{v.cliente}</td>
                  <td className="px-3 py-2">{v.ciudad?.nombre ?? '-'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        v.estado === 'Activo'
                          ? 'bg-green-100 text-green-700'
                          : v.estado === 'Baja'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {v.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2">{v._count?.siniestros ?? 0}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => abrirEditar(v)}
                      className="text-slate-500 hover:text-slate-800 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(v)}
                      disabled={eliminandoId === v.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {eliminandoId === v.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <VehiculoFormModal
        open={modalAbierto}
        vehiculo={vehiculoEditar}
        onClose={() => setModalAbierto(false)}
        onSaved={cargarVehiculos}
      />
    </div>
  );
}
