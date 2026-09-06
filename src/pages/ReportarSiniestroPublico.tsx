import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Upload, X, Loader2 } from 'lucide-react';
import { apiPublico } from '../api/client';

interface InfoVehiculo {
  placa: string;
  marca: string;
  modelo: string;
}

type EstadoPagina = 'cargando' | 'listo' | 'invalido' | 'expirado' | 'completado' | 'enviado';

interface FormState {
  nombreConductor: string;
  cedulaConductor: string;
  telConductor: string;
  correoConductor: string;
  fechaSiniestro: string; // datetime-local
  lugarAccidente: string;
  danosVehiculo: string;
  danosTerceros: string;
  descripcion: string;
  tieneParteP: 'si' | 'no' | '';
}

const FORM_INICIAL: FormState = {
  nombreConductor: '',
  cedulaConductor: '',
  telConductor: '',
  correoConductor: '',
  fechaSiniestro: '',
  lugarAccidente: '',
  danosVehiculo: '',
  danosTerceros: '',
  descripcion: '',
  tieneParteP: '',
};

export default function ReportarSiniestroPublico() {
  const { token } = useParams<{ token: string }>();

  const [estado, setEstado] = useState<EstadoPagina>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [vehiculo, setVehiculo] = useState<InfoVehiculo | null>(null);

  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [fotosLicenciaMatricula, setFotosLicenciaMatricula] = useState<File[]>([]);
  const [partePolicial, setPartePolicial] = useState<File | null>(null);

  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [noSiniestro, setNoSiniestro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    // Supuesto: el router público está montado en /api/publico/siniestros.
    // Ajusta esta ruta si en tu index.ts/app.ts lo montaste en otra base.
    apiPublico
      .get<InfoVehiculo>(`/publico/siniestros/${token}`)
      .then(({ data }) => {
        setVehiculo(data);
        setEstado('listo');
      })
      .catch((err) => {
        const status = err?.response?.status;
        const msg = err?.response?.data?.error ?? '';
        if (status === 410 && msg.includes('expirado')) setEstado('expirado');
        else if (status === 410) setEstado('completado');
        else setEstado('invalido');
      });
  }, [token]);

  function actualizarCampo(campo: keyof FormState, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function manejarArchivos(
    e: ChangeEvent<HTMLInputElement>,
    setter: (files: File[]) => void,
    maxCount: number
  ) {
    const files = Array.from(e.target.files ?? []).slice(0, maxCount);
    setter(files);
  }

  function validar(): boolean {
    const errores: Record<string, string> = {};
    if (!form.nombreConductor.trim()) errores.nombreConductor = 'Requerido';
    if (!form.cedulaConductor.trim()) errores.cedulaConductor = 'Requerido';
    if (!form.telConductor.trim()) errores.telConductor = 'Requerido';
    if (!form.correoConductor.trim() || !/^\S+@\S+\.\S+$/.test(form.correoConductor)) {
      errores.correoConductor = 'Correo inválido';
    }
    if (!form.fechaSiniestro) errores.fechaSiniestro = 'Requerido';
    if (!form.lugarAccidente.trim()) errores.lugarAccidente = 'Requerido';
    if (form.descripcion.trim().length < 10) errores.descripcion = 'Describe con al menos 10 caracteres';
    if (!form.tieneParteP) errores.tieneParteP = 'Selecciona una opción';
    if (form.tieneParteP === 'si' && !partePolicial) {
      errores.partePolicial = 'Adjunta el parte policial o denuncia';
    }
    setErroresCampo(errores);
    return Object.keys(errores).length === 0;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErrorEnvio(null);
    if (!validar()) return;

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append('nombreConductor', form.nombreConductor.trim());
      fd.append('cedulaConductor', form.cedulaConductor.trim());
      fd.append('telConductor', form.telConductor.trim());
      fd.append('correoConductor', form.correoConductor.trim());
      fd.append('fechaSiniestro', form.fechaSiniestro);
      fd.append('lugarAccidente', form.lugarAccidente.trim());
      if (form.danosVehiculo.trim()) fd.append('danosVehiculo', form.danosVehiculo.trim());
      if (form.danosTerceros.trim()) fd.append('danosTerceros', form.danosTerceros.trim());
      fd.append('descripcion', form.descripcion.trim());
      fd.append('tieneParteP', form.tieneParteP);

      evidencias.forEach((f) => fd.append('evidencias', f));
      fotosLicenciaMatricula.forEach((f) => fd.append('fotosLicenciaMatricula', f));
      if (partePolicial) fd.append('partePolicial', partePolicial);

      const { data } = await apiPublico.post<{ ok: boolean; noSiniestro: string }>(
        `/publico/siniestros/${token}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setNoSiniestro(data.noSiniestro);
      setEstado('enviado');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 410) {
        setEstado(err?.response?.data?.error?.includes('expirado') ? 'expirado' : 'completado');
      } else {
        setErrorEnvio(err?.response?.data?.error ?? 'No se pudo enviar el formulario. Intenta de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  // ---------- Estados de pantalla completa ----------
  if (estado === 'cargando') {
    return (
      <PantallaCentrada>
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        <p className="text-slate-500 text-sm mt-3">Cargando…</p>
      </PantallaCentrada>
    );
  }

  if (estado === 'invalido') {
    return (
      <PantallaCentrada>
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <h1 className="text-lg font-semibold text-slate-900 mt-3">Este link no es válido</h1>
        <p className="text-slate-500 text-sm mt-1 text-center max-w-xs">
          Revisa que copiaste el link completo, o contacta a quien te lo envió para que te reenvíe uno nuevo.
        </p>
      </PantallaCentrada>
    );
  }

  if (estado === 'expirado') {
    return (
      <PantallaCentrada>
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <h1 className="text-lg font-semibold text-slate-900 mt-3">Este link ha expirado</h1>
        <p className="text-slate-500 text-sm mt-1 text-center max-w-xs">
          Contacta a quien te lo envió para que te genere un nuevo link de reporte.
        </p>
      </PantallaCentrada>
    );
  }

  if (estado === 'completado') {
    return (
      <PantallaCentrada>
        <CheckCircle2 className="w-8 h-8 text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-900 mt-3">Este formulario ya fue enviado</h1>
        <p className="text-slate-500 text-sm mt-1 text-center max-w-xs">
          Ya recibimos tu reporte de siniestro. Si necesitas hacer cambios, contacta directamente a tu asesor.
        </p>
      </PantallaCentrada>
    );
  }

  if (estado === 'enviado') {
    return (
      <PantallaCentrada>
        <CheckCircle2 className="w-8 h-8 text-green-600" />
        <h1 className="text-lg font-semibold text-slate-900 mt-3">Reporte enviado</h1>
        <p className="text-slate-500 text-sm mt-1 text-center max-w-xs">
          Tu número de siniestro es <span className="font-medium text-slate-700">{noSiniestro}</span>. Te
          contactaremos pronto con los siguientes pasos.
        </p>
      </PantallaCentrada>
    );
  }

  // ---------- Formulario ----------
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Reporte de siniestro</h1>
          {vehiculo && (
            <p className="text-sm text-slate-500 mt-1">
              Vehículo {vehiculo.placa} — {vehiculo.marca} {vehiculo.modelo}
            </p>
          )}
        </div>

        <form onSubmit={enviar} className="space-y-5 bg-white border border-slate-200 rounded-xl p-5">
          <Seccion titulo="Tus datos">
            <Campo label="Nombre completo" error={erroresCampo.nombreConductor}>
              <input
                type="text"
                value={form.nombreConductor}
                onChange={(e) => actualizarCampo('nombreConductor', e.target.value)}
                className={inputClase(!!erroresCampo.nombreConductor)}
              />
            </Campo>
            <Campo label="Cédula" error={erroresCampo.cedulaConductor}>
              <input
                type="text"
                value={form.cedulaConductor}
                onChange={(e) => actualizarCampo('cedulaConductor', e.target.value)}
                className={inputClase(!!erroresCampo.cedulaConductor)}
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Teléfono" error={erroresCampo.telConductor}>
                <input
                  type="tel"
                  value={form.telConductor}
                  onChange={(e) => actualizarCampo('telConductor', e.target.value)}
                  className={inputClase(!!erroresCampo.telConductor)}
                />
              </Campo>
              <Campo label="Correo" error={erroresCampo.correoConductor}>
                <input
                  type="email"
                  value={form.correoConductor}
                  onChange={(e) => actualizarCampo('correoConductor', e.target.value)}
                  className={inputClase(!!erroresCampo.correoConductor)}
                />
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="Qué pasó">
            <Campo label="Fecha y hora del siniestro" error={erroresCampo.fechaSiniestro}>
              <input
                type="datetime-local"
                value={form.fechaSiniestro}
                onChange={(e) => actualizarCampo('fechaSiniestro', e.target.value)}
                className={inputClase(!!erroresCampo.fechaSiniestro)}
              />
            </Campo>
            <Campo label="Lugar del accidente" error={erroresCampo.lugarAccidente}>
              <input
                type="text"
                value={form.lugarAccidente}
                onChange={(e) => actualizarCampo('lugarAccidente', e.target.value)}
                placeholder="Calle, referencia, ciudad"
                className={inputClase(!!erroresCampo.lugarAccidente)}
              />
            </Campo>
            <Campo label="Describe lo que pasó" error={erroresCampo.descripcion}>
              <textarea
                value={form.descripcion}
                onChange={(e) => actualizarCampo('descripcion', e.target.value)}
                rows={4}
                className={inputClase(!!erroresCampo.descripcion)}
              />
            </Campo>
            <Campo label="Daños del vehículo (opcional)">
              <textarea
                value={form.danosVehiculo}
                onChange={(e) => actualizarCampo('danosVehiculo', e.target.value)}
                rows={2}
                className={inputClase(false)}
              />
            </Campo>
            <Campo label="Daños a terceros (opcional)">
              <textarea
                value={form.danosTerceros}
                onChange={(e) => actualizarCampo('danosTerceros', e.target.value)}
                rows={2}
                className={inputClase(false)}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Parte policial">
            <Campo label="¿Tienes parte policial o denuncia?" error={erroresCampo.tieneParteP}>
              <div className="flex gap-2">
                {(['si', 'no'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => actualizarCampo('tieneParteP', v)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.tieneParteP === v
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {v === 'si' ? 'Sí' : 'No'}
                  </button>
                ))}
              </div>
            </Campo>
            {form.tieneParteP === 'si' && (
              <ArchivoUnico
                label="Foto o PDF del parte policial"
                archivo={partePolicial}
                onChange={(f) => setPartePolicial(f)}
                error={erroresCampo.partePolicial}
              />
            )}
          </Seccion>

          <Seccion titulo="Evidencia fotográfica">
            <ArchivosMultiples
              label="Fotos del siniestro (hasta 5)"
              archivos={evidencias}
              maxCount={5}
              onChange={(e) => manejarArchivos(e, setEvidencias, 5)}
              onQuitar={(i) => setEvidencias((prev) => prev.filter((_, idx) => idx !== i))}
            />
            <ArchivosMultiples
              label="Foto de tu licencia y matrícula (hasta 2)"
              archivos={fotosLicenciaMatricula}
              maxCount={2}
              onChange={(e) => manejarArchivos(e, setFotosLicenciaMatricula, 2)}
              onQuitar={(i) => setFotosLicenciaMatricula((prev) => prev.filter((_, idx) => idx !== i))}
            />
          </Seccion>

          {errorEnvio && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorEnvio}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-3 bg-slate-900 text-white text-sm font-medium rounded-lg
                       hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {enviando ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------- Componentes auxiliares ----------

function PantallaCentrada({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">{children}</div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</h2>
      {children}
    </div>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function inputClase(conError: boolean) {
  return `w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
    conError ? 'border-red-300' : 'border-slate-300'
  }`;
}

function ArchivoUnico({
  label,
  archivo,
  onChange,
  error,
}: {
  label: string;
  archivo: File | null;
  onChange: (f: File | null) => void;
  error?: string;
}) {
  return (
    <Campo label={label} error={error}>
      {archivo ? (
        <div className="flex items-center justify-between px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm">
          <span className="truncate">{archivo.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-3 text-sm text-slate-500 cursor-pointer hover:border-slate-400">
          <Upload className="w-4 h-4" />
          Subir archivo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </Campo>
  );
}

function ArchivosMultiples({
  label,
  archivos,
  maxCount,
  onChange,
  onQuitar,
}: {
  label: string;
  archivos: File[];
  maxCount: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onQuitar: (index: number) => void;
}) {
  return (
    <Campo label={label}>
      <div className="space-y-2">
        {archivos.map((f, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <span className="truncate">{f.name}</span>
            <button type="button" onClick={() => onQuitar(i)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {archivos.length < maxCount && (
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg py-3 text-sm text-slate-500 cursor-pointer hover:border-slate-400">
            <Upload className="w-4 h-4" />
            Agregar foto{archivos.length > 0 ? 's' : ''}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={onChange}
            />
          </label>
        )}
      </div>
    </Campo>
  );
}
