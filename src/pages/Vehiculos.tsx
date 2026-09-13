import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
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

    function exportarExcel() {
    const filas = vehiculos.map((v: any) => ({
      'Placa': v.placa,
      'Marca': v.marca,
      'Modelo': v.modelo,
      'Año': v.anio ?? '',
      'Color': v.color ?? '',
      'Chasis': v.chasis ?? '',
      'No. Motor': v.noMotor ?? '',
      'Cliente': v.cliente?.nombre ?? '',
      'No. Contrato': v.noContrato ?? '',
      'Ciudad': v.ciudad?.nombre ?? '',
      'Aseguradora': v.aseguradora?.nombre ?? '',
      'No. Póliza': v.noPoliza ?? '',
      'Vencimiento Póliza': v.vencimientoPoliza ? String(v.vencimientoPoliza).slice(0, 10) : '',
      'No. Anexo': v.noAnexo ?? '',
      'No. Cotización': v.noCotizacion ?? '',
      'No. Factura': v.noFactura ?? '',
      'Fecha Inicio Contrato': v.fechaInicioContrato ? String(v.fechaInicioContrato).slice(0, 10) : '',
      'Fecha Fin Contrato': v.fechaFinContrato ? String(v.fechaFinContrato).slice(0, 10) : '',
      'Km Anual Contratado': v.kmAnualContratado ?? '',
      'Administrador': v.administrador?.nombre ?? '',
      'Gerente de Cuenta': v.gerenteCuenta?.nombre ?? '',
      'Tipo de Activo': v.tipoActivo?.nombre ?? '',
      'Tipo de Combustible': v.tipoCombustible?.nombre ?? '',
      'Clase': v.clase?.nombre ?? '',
      'Gama': v.gama?.nombre ?? '',
      'Proveedor de Compra': v.proveedorCompra?.nombre ?? '',
      'Tipo de Operación': v.tipoOperacion?.nombre ?? '',
      'Nivel de Blindaje': v.nivelBlindaje?.nombre ?? '',
      'Transmisión': v.transmision?.nombre ?? '',
      'RAM': v.ram ?? '',
      'Blindado': v.blindaje ? 'Sí' : 'No',
      'Sustituto': v.sustituto ? 'Sí' : 'No',
      'Estado': v.estado ?? '',
      'Siniestros': v._count?.siniestros ?? 0,
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Vehículos');

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `vehiculos_${fecha}.xlsx`);
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
              <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportarExcel}
            disabled={vehiculos.length === 0}
            className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Exportar a Excel
          </button>
          <button
            onClick={abrirCrear}
            className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-md bg-slate-800 text-white hover:bg-slate-700"
          >
            + Nuevo vehículo
          </button>
        </div>
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
                  <td className="px-3 py-2">{v.cliente?.nombre ?? '-'}</td>
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