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

function formatFechaHora(valor?: string) {
  if (!valor) return null;
  const d = new Date(valor);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

// ---- Bitácora / Auditoría ----
// Etiquetas legibles para los campos más consultados en el historial de cambios.
// Si un campo no está en este mapa, se usa un fallback automático (separa camelCase).
const ETIQUETAS_CAMPO: Record<string, string> = {
  tipoSiniestroId: 'Tipo de Siniestro',
  estatusSiniestroId: 'Subtipo de Siniestro',
  estatusCobroClienteId: 'Estatus de Cobro al Cliente',
  tallerCiudadId: 'Taller / Ciudad',
  puntoAtencionTallerId: 'Punto de Atención',
  notas: 'Notas',
  fechaNotifAseg: 'Fecha Notif. Aseg.',
  fechaIngresoTaller: 'Fecha Ingreso Taller',
  fechaProforma: 'Fecha Proforma',
  fechaAutorizacion: 'Fecha Autorizacion',
  fechaEntrega: 'Fecha Entrega',
  valorSiniestroAntesIva: 'Valor del siniestro antes de IVA',
  valorAseguradoVehiculo: 'Valor asegurado del vehículo',
  numeroEventoCliente: 'Número de evento del cliente',
  valorDeducible: 'Valor deducible',
  esCandidatoPerdidaTotal: '¿Es candidato a pérdida total?',
  fechaNotifCobroCliente: 'Fecha notificación cobro al cliente',
  noOrdenServicioCobroCliente: 'No. de orden de servicio',
  seEntregoVehiculoSustituto: '¿Se entregó vehículo sustituto?',
  fechaHoraEntregaSustituto: 'Fecha/hora de entrega del sustituto',
  fechaRetiroSustituto: 'Fecha de retiro del sustituto',
  placaTercero: 'Placa del tercero',
  marcaModeloTercero: 'Marca / Modelo del tercero',
  nombreTerceroCausante: 'Nombre del tercero causante',
  terceroAfectoPoliza: '¿Tercero afectó su póliza?',
  causalDetencion: 'Causal de detención',
  abogadoAsignado: 'Abogado asignado',
};

function etiquetaCampo(campo: string): string {
  if (ETIQUETAS_CAMPO[campo]) return ETIQUETAS_CAMPO[campo];
  // Fallback: "fechaSalidaTaller" -> "Fecha Salida Taller"
  return campo
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValorAuditoria(valor: any): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
}

const ETIQUETAS_ACCION: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
};

// ======================= Fórmulas de negocio =======================
// Funciones puras: reciben el `form` actual y devuelven el valor calculado
// (o null si todavía faltan datos para calcular). Se usan tanto para mostrar
// el valor en pantalla (siempre bloqueado/no editable) como para armar el
// payload que se envía al backend en `actualizar()`.

function diasEntre(fechaFin?: string, fechaInicio?: string): number | null {
  if (!fechaFin || !fechaInicio) return null;
  const f1 = new Date(fechaFin);
  const f0 = new Date(fechaInicio);
  if (isNaN(f1.getTime()) || isNaN(f0.getTime())) return null;
  return Math.round((f1.getTime() - f0.getTime()) / 86400000);
}

function horasEntre(fechaFin?: string, fechaInicio?: string): number | null {
  if (!fechaFin || !fechaInicio) return null;
  const f1 = new Date(fechaFin);
  const f0 = new Date(fechaInicio);
  if (isNaN(f1.getTime()) || isNaN(f0.getTime())) return null;
  return Math.round(((f1.getTime() - f0.getTime()) / 3600000) * 100) / 100;
}

// Días en taller = Fecha_Salida_Taller - Fecha_Ingreso_Taller
function calcDiasTaller(form: any): number | null {
  return diasEntre(form.fechaSalidaTaller, form.fechaIngresoTaller);
}

// Total tiempo siniestro = Fecha_Salida_Taller - Fecha_Aviso_Siniestro (Fecha Notif. Aseg.)
function calcTotalTiempoSiniestro(form: any): number | null {
  return diasEntre(form.fechaSalidaTaller, form.fechaNotifAseg);
}

// Valor deducible = MAX(%evento * Valor_Siniestro, %evento_min * Valor_Asegurado, monto_minimo)
// según Número de evento del cliente (1°, 2° o 3°)
const TIERS_DEDUCIBLE: Record<string, { pct: number; pctMin: number; piso: number }> = {
  '1': { pct: 0.10, pctMin: 0.01, piso: 300 },
  '2': { pct: 0.125, pctMin: 0.0125, piso: 500 },
  '3': { pct: 0.15, pctMin: 0.015, piso: 750 },
};
function calcValorDeducible(form: any): number | null {
  const tier = TIERS_DEDUCIBLE[form.numeroEventoCliente];
  if (!tier || form.valorSiniestroAntesIva === '' || form.valorAseguradoVehiculo === '') return null;
  const valorSiniestro = Number(form.valorSiniestroAntesIva);
  const valorAsegurado = Number(form.valorAseguradoVehiculo);
  const valor = Math.max(tier.pct * valorSiniestro, tier.pctMin * valorAsegurado, tier.piso);
  return Math.round(valor * 100) / 100;
}

// Valor pendiente de indemnización P.T. 2 = Valor_Asegurado - Valor_Indemnizado_PT1
function calcValorPendienteIndemnizacionPT2(form: any): number | null {
  if (form.valorAseguradoVehiculo === '' || form.valorIndemnizadoPT1 === '') return null;
  return Number(form.valorAseguradoVehiculo) - Number(form.valorIndemnizadoPT1);
}

// ¿Es candidato a pérdida total? = Valor_Siniestro > 75% del Valor_Asegurado
function calcEsCandidatoPerdidaTotal(form: any): boolean {
  if (form.valorSiniestroAntesIva === '' || form.valorAseguradoVehiculo === '') return false;
  return Number(form.valorSiniestroAntesIva) > 0.75 * Number(form.valorAseguradoVehiculo);
}

// Deducible por robo de componentes electrónicos = 20% del Valor_Siniestro
function calcDeducibleRoboComponentesElectronicos(form: any): number | null {
  if (form.valorSiniestroAntesIva === '') return null;
  return Math.round(0.20 * Number(form.valorSiniestroAntesIva) * 100) / 100;
}

// % de avance del checklist = documentos en "Entregada" / total de documentos del checklist
const CAMPOS_CHECKLIST_DOCUMENTOS = [
  'docCuvFinal', 'docCertificadoGravamen', 'docOriginalMatricula', 'docCopiaCiPvRucRl',
  'docComprobantePagoMatricula', 'docOriginalCopiaLlave', 'docCopiaFacturaVenta', 'docVehiculoSinMultas',
];
function calcPorcentajeAvanceChecklist(form: any): number {
  const completados = CAMPOS_CHECKLIST_DOCUMENTOS.filter((k) => form[k] === 'Entregada').length;
  return Math.round((completados / CAMPOS_CHECKLIST_DOCUMENTOS.length) * 10000) / 100;
}

// Cobertura Tasa Spatt por ocupante lesionado: $2,000 si el vehículo vale hasta $45,000; si no, $3,000
// (se usa el "Valor asegurado del vehículo" como Valor_Vehiculo — ver nota al usuario)
function calcCoberturaTasaSpattOcupanteLesionado(form: any): number | null {
  if (form.valorAseguradoVehiculo === '') return null;
  return Number(form.valorAseguradoVehiculo) <= 45000 ? 2000 : 3000;
}

// Cobertura todo riesgo por fallecido: $7,000 hasta $45,000 de valor; $10,000 si supera ese valor
function calcCoberturaTodoRiesgoFallecido(form: any): number | null {
  if (form.valorAseguradoVehiculo === '') return null;
  return Number(form.valorAseguradoVehiculo) <= 45000 ? 7000 : 10000;
}

// Montos fijos de política (no se multiplican por número de personas)
const GASTOS_FUNERARIOS_FIJO = 400;
const GASTOS_AMBULANCIA_FIJO = 200;

// Límite seguro todo riesgo si supera Tasa Spatt: $30,000 si el vehículo vale menos de $45,000; si no, $50,000
function calcLimiteSeguroTodoRiesgoSiSuperaSpatt(form: any): number | null {
  if (form.valorAseguradoVehiculo === '') return null;
  return Number(form.valorAseguradoVehiculo) < 45000 ? 30000 : 50000;
}

// Horas desde el reclamo hasta la entrega = (Fecha_Entrega_Sustituto - Fecha_Reclamo) en horas
function calcHorasReclamoHastaEntrega(form: any): number | null {
  return horasEntre(form.fechaHoraEntregaSustituto, form.fechaHoraReclamo);
}

// ¿Cumple KPI de 6 horas del vehículo sustituto?
function calcCumpleKpi6Horas(form: any): string | null {
  const horas = calcHorasReclamoHastaEntrega(form);
  if (horas === null) return null;
  return horas <= 6 ? 'En KPI' : 'Fuera de KPI';
}

type TabId = 'cliente' | 'gestion' | 'bitacora';

// ---- Opciones de los combos "Selección" del grupo Pérdida Total ----
const OPCIONES_CHECKLIST_4 = ['Pendiente', 'Solicitado', 'En proceso', 'Entregada'];
const OPCIONES_PENDIENTE_OK = ['Pendiente', 'OK'];

// ---- Códigos de Tipo de Siniestro (ver Mantenimiento → Tipos de Siniestro) ----
const CODIGO_SIMPLE = '001';
const CODIGO_RC_USUARIO_AFECTA_TERCERO = '002'; // Siniestro con RC donde usuario afecta a tercero
const CODIGO_RC_ASEGURADORA_TERCERO = '003'; // Siniestro con RC atendido por aseguradora del tercero
const CODIGO_NO_CULPOSO_SIN_POLIZA_TERCERO = '004'; // Siniestro no culposo sin afectación de póliza tercero
const CODIGO_PERDIDA_TOTAL_DANIOS = '005'; // Siniestro posible pérdida total por daños
const CODIGO_PERDIDA_TOTAL_ROBO = '006'; // Siniestro posible pérdida total por robo
const CODIGO_DETENCION_HERIDOS_TERCERO = '007'; // Siniestro con detención y personas heridas o fallecidas donde se afecta a un tercero
const CODIGO_DETENCION_HERIDOS_USUARIO = '008'; // Siniestro con detención y personas heridas o fallecidas donde el tercero es quien afecta a usuario ISIRENT

// ---- Opciones del combo "Causal de detención" (grupo Legal / Vehículo Detenido, Tipo 007) ----
const OPCIONES_CAUSAL_DETENCION = [
  'Daños terceros/propios',
  'Lesionados',
  'Fallecidos',
  'Embriaguez',
  'Daños propiedad pública',
  'Abandono',
  'Robo recuperado',
];

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

    // --- KPI / Fechas de proceso (Tipo Simple y RC usuario afecta a tercero) ---
    fechaLlegadaRepuestos: '',
    fechaAuditoria: '',
    fechaFiniquito: '',
    fechaSalidaTaller: '',

    // --- Valores ---
    valorSiniestroAntesIva: '',
    valorAseguradoVehiculo: '',
    numeroEventoCliente: '', // 1, 2 o 3 — usado para calcular el Valor deducible
    valorDeducible: '', // calculado: ver calcValorDeducible()
    esCandidatoPerdidaTotal: false, // calculado: ver calcEsCandidatoPerdidaTotal()

    // --- Cobro al Cliente ---
    fechaNotifCobroCliente: '',
    noOrdenServicioCobroCliente: '',

    // --- Vehículo Sustituto ---
    seEntregoVehiculoSustituto: false,
    fechaHoraReclamo: '', // usado para calcular Horas desde el reclamo hasta la entrega
    fechaHoraEntregaSustituto: '',
    horasReclamoHastaEntrega: '', // calculado: ver calcHorasReclamoHastaEntrega()
    fechaRetiroSustituto: '',

    // --- Datos del Tercero (Tipos 002, 003 y 004) ---
    placaTercero: '',
    marcaModeloTercero: '',
    nombreTerceroCausante: '',
    terceroAfectoPoliza: false,

    // --- Datos del Tercero adicionales (solo Tipo 003) ---
    aseguradoraTercero: '',
    polizaTercero: '',
    tallerTerceroEstadia: '',

    // --- Valores adicionales (solo Tipo 005) ---
    valorIndemnizadoPT1: '',
    valorPendienteIndemnizacionPT2: '', // se calculará con una fórmula más adelante

    // --- Pérdida Total - Proceso (solo Tipo 005) ---
    motivoPerdidaTotal: '',
    fechaDeclaratoriaPerdidaTotal: '',
    solicitudCambioEstatusKimerasoft: false,
    fechaSolicitudCambioEstatusKimerasoft: '',
    notificacionRetiroSustitutoPT: '',
    gestionRenovacionVehiculo: '',
    fechaRetiroSustitutoPT: '',

    // --- Pérdida Total - Prenda bancaria (solo Tipo 005) ---
    entregaEstadoFinancieroBancoPrenda: false,
    nombreBancoPrenda: '',
    fechaSolicitudLiberacionPrenda: '',
    cartaLevantamientoPrendaBanco: '',
    tramiteLiberacionPrenda: '',
    entregaChequeFinanciero: '',

    // --- Pérdida Total - Documentos (solo Tipo 005) ---
    docCuvFinal: '',
    docCertificadoGravamen: '',
    docOriginalMatricula: '',
    docCopiaCiPvRucRl: '',
    docComprobantePagoMatricula: '',
    docOriginalCopiaLlave: '',
    docCopiaFacturaVenta: '',
    docVehiculoSinMultas: '',
    entregaDocumentosBroker: '',
    porcentajeAvanceChecklist: '', // se calculará con una fórmula más adelante

    // --- Pérdida Total - Notaría y cierre (Tipos 005 y 006) ---
    firmaContratoCompraVentaNotaria: '',
    fechaPagoPerdidaTotal: '',
    cambioEstatusPTotal: '',
    cambioEstatusFinalTotalVendido: false,

    // --- Robo (solo Tipo 006) ---
    fechaDenunciaRobo: '',
    numeroDenuncia: '',
    vehiculoRecuperado: false,
    fechaRecuperacion: '',
    vehiculoDetenidoTrasRecuperacion: false,
    estadoVehiculoRecuperado: '',
    deducibleRoboComponentesElectronicos: '', // se calculará con una fórmula más adelante

    // --- KPI reducido (solo Tipo 007) ---
    totalTiempoSiniestro: '', // se calculará con una fórmula más adelante

    // --- Legal / Vehículo Detenido (solo Tipo 007) ---
    causalDetencion: '',
    requiereAcompanamientoAbogadoPenal: false,
    confirmacionAcompanamientoAbogadoPenal: '',
    abogadoAsignado: '',
    fechaSeguimientoPartePolicial: '',
    fechaEnvioParteBroker: '',
    fechaAsignacionFiscalia: '',
    fechaOrdenLiberacion: '',
    valorCancelarParqueadero: '',
    valorCancelarGrua: '',
    fechaLiberacionVehiculo: '',
    seguimientoIndemnizacionTercero: '', // solo Tipo 007
    seguimientoIndemnizacionUsuario: '', // solo Tipo 008

    // --- Tasa Spatt / Heridos-Fallecidos (solo Tipo 007) ---
    hayPersonasLesionadas: false,
    numeroOcupantesLesionados: '',
    coberturaTasaSpattOcupanteLesionado: '', // se calculará con una fórmula más adelante
    hayPersonasFallecidas: false,
    numeroFallecidos: '',
    coberturaTodoRiesgoFallecido: '', // se calculará con una fórmula más adelante
    gastosFunerariosFallecido: '', // se calculará con una fórmula más adelante
    gastosAmbulancia: '', // se calculará con una fórmula más adelante
    limiteSeguroTodoRiesgoSiSuperaSpatt: '', // se calculará con una fórmula más adelante
    historiaClinicaSolicitada: false,
    fechaPagoFacturasTasaSpatt: '',
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

      fechaLlegadaRepuestos: s.fechaLlegadaRepuestos?.slice(0, 10) || '',
      fechaAuditoria: s.fechaAuditoria?.slice(0, 10) || '',
      fechaFiniquito: s.fechaFiniquito?.slice(0, 10) || '',
      fechaSalidaTaller: s.fechaSalidaTaller?.slice(0, 10) || '',

      valorSiniestroAntesIva: s.valorSiniestroAntesIva ?? '',
      valorAseguradoVehiculo: s.valorAseguradoVehiculo ?? '',
      numeroEventoCliente: s.numeroEventoCliente ? String(s.numeroEventoCliente) : '',
      valorDeducible: s.valorDeducible ?? '',
      esCandidatoPerdidaTotal: !!s.esCandidatoPerdidaTotal,

      fechaNotifCobroCliente: s.fechaNotifCobroCliente?.slice(0, 10) || '',
      noOrdenServicioCobroCliente: s.noOrdenServicioCobroCliente || '',

      seEntregoVehiculoSustituto: !!s.seEntregoVehiculoSustituto,
      // datetime-local necesita yyyy-MM-ddTHH:mm (16 caracteres), no solo la fecha
      fechaHoraReclamo: s.fechaHoraReclamo?.slice(0, 16) || '',
      fechaHoraEntregaSustituto: s.fechaHoraEntregaSustituto?.slice(0, 16) || '',
      horasReclamoHastaEntrega: s.horasReclamoHastaEntrega ?? '',
      fechaRetiroSustituto: s.fechaRetiroSustituto?.slice(0, 10) || '',

      placaTercero: s.placaTercero || '',
      marcaModeloTercero: s.marcaModeloTercero || '',
      nombreTerceroCausante: s.nombreTerceroCausante || '',
      terceroAfectoPoliza: !!s.terceroAfectoPoliza,

      aseguradoraTercero: s.aseguradoraTercero || '',
      polizaTercero: s.polizaTercero || '',
      tallerTerceroEstadia: s.tallerTerceroEstadia || '',

      valorIndemnizadoPT1: s.valorIndemnizadoPT1 ?? '',
      valorPendienteIndemnizacionPT2: s.valorPendienteIndemnizacionPT2 ?? '',

      motivoPerdidaTotal: s.motivoPerdidaTotal || '',
      fechaDeclaratoriaPerdidaTotal: s.fechaDeclaratoriaPerdidaTotal?.slice(0, 10) || '',
      solicitudCambioEstatusKimerasoft: !!s.solicitudCambioEstatusKimerasoft,
      fechaSolicitudCambioEstatusKimerasoft: s.fechaSolicitudCambioEstatusKimerasoft?.slice(0, 10) || '',
      notificacionRetiroSustitutoPT: s.notificacionRetiroSustitutoPT?.slice(0, 10) || '',
      gestionRenovacionVehiculo: s.gestionRenovacionVehiculo || '',
      fechaRetiroSustitutoPT: s.fechaRetiroSustitutoPT?.slice(0, 10) || '',

      entregaEstadoFinancieroBancoPrenda: !!s.entregaEstadoFinancieroBancoPrenda,
      nombreBancoPrenda: s.nombreBancoPrenda || '',
      fechaSolicitudLiberacionPrenda: s.fechaSolicitudLiberacionPrenda?.slice(0, 10) || '',
      cartaLevantamientoPrendaBanco: s.cartaLevantamientoPrendaBanco || '',
      tramiteLiberacionPrenda: s.tramiteLiberacionPrenda || '',
      entregaChequeFinanciero: s.entregaChequeFinanciero || '',

      docCuvFinal: s.docCuvFinal || '',
      docCertificadoGravamen: s.docCertificadoGravamen || '',
      docOriginalMatricula: s.docOriginalMatricula || '',
      docCopiaCiPvRucRl: s.docCopiaCiPvRucRl || '',
      docComprobantePagoMatricula: s.docComprobantePagoMatricula || '',
      docOriginalCopiaLlave: s.docOriginalCopiaLlave || '',
      docCopiaFacturaVenta: s.docCopiaFacturaVenta || '',
      docVehiculoSinMultas: s.docVehiculoSinMultas || '',
      entregaDocumentosBroker: s.entregaDocumentosBroker || '',
      porcentajeAvanceChecklist: s.porcentajeAvanceChecklist ?? '',

      firmaContratoCompraVentaNotaria: s.firmaContratoCompraVentaNotaria || '',
      fechaPagoPerdidaTotal: s.fechaPagoPerdidaTotal?.slice(0, 10) || '',
      cambioEstatusPTotal: s.cambioEstatusPTotal || '',
      cambioEstatusFinalTotalVendido: !!s.cambioEstatusFinalTotalVendido,

      fechaDenunciaRobo: s.fechaDenunciaRobo?.slice(0, 10) || '',
      numeroDenuncia: s.numeroDenuncia || '',
      vehiculoRecuperado: !!s.vehiculoRecuperado,
      fechaRecuperacion: s.fechaRecuperacion?.slice(0, 10) || '',
      vehiculoDetenidoTrasRecuperacion: !!s.vehiculoDetenidoTrasRecuperacion,
      estadoVehiculoRecuperado: s.estadoVehiculoRecuperado || '',
      deducibleRoboComponentesElectronicos: s.deducibleRoboComponentesElectronicos ?? '',

      totalTiempoSiniestro: s.totalTiempoSiniestro ?? '',

      causalDetencion: s.causalDetencion || '',
      requiereAcompanamientoAbogadoPenal: !!s.requiereAcompanamientoAbogadoPenal,
      confirmacionAcompanamientoAbogadoPenal: s.confirmacionAcompanamientoAbogadoPenal?.slice(0, 10) || '',
      abogadoAsignado: s.abogadoAsignado || '',
      fechaSeguimientoPartePolicial: s.fechaSeguimientoPartePolicial?.slice(0, 10) || '',
      fechaEnvioParteBroker: s.fechaEnvioParteBroker?.slice(0, 10) || '',
      fechaAsignacionFiscalia: s.fechaAsignacionFiscalia?.slice(0, 10) || '',
      fechaOrdenLiberacion: s.fechaOrdenLiberacion?.slice(0, 10) || '',
      valorCancelarParqueadero: s.valorCancelarParqueadero ?? '',
      valorCancelarGrua: s.valorCancelarGrua ?? '',
      fechaLiberacionVehiculo: s.fechaLiberacionVehiculo?.slice(0, 10) || '',
      seguimientoIndemnizacionTercero: s.seguimientoIndemnizacionTercero || '',
      seguimientoIndemnizacionUsuario: s.seguimientoIndemnizacionUsuario || '',

      hayPersonasLesionadas: !!s.hayPersonasLesionadas,
      numeroOcupantesLesionados: s.numeroOcupantesLesionados ?? '',
      coberturaTasaSpattOcupanteLesionado: s.coberturaTasaSpattOcupanteLesionado ?? '',
      hayPersonasFallecidas: !!s.hayPersonasFallecidas,
      numeroFallecidos: s.numeroFallecidos ?? '',
      coberturaTodoRiesgoFallecido: s.coberturaTodoRiesgoFallecido ?? '',
      gastosFunerariosFallecido: s.gastosFunerariosFallecido ?? '',
      gastosAmbulancia: s.gastosAmbulancia ?? '',
      limiteSeguroTodoRiesgoSiSuperaSpatt: s.limiteSeguroTodoRiesgoSiSuperaSpatt ?? '',
      historiaClinicaSolicitada: !!s.historiaClinicaSolicitada,
      fechaPagoFacturasTasaSpatt: s.fechaPagoFacturasTasaSpatt?.slice(0, 10) || '',
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

        // --- KPI / Fechas de proceso ---
        fechaLlegadaRepuestos: form.fechaLlegadaRepuestos || undefined,
        fechaAuditoria: form.fechaAuditoria || undefined,
        fechaFiniquito: form.fechaFiniquito || undefined,
        fechaSalidaTaller: form.fechaSalidaTaller || undefined,

        // --- Valores ---
        valorSiniestroAntesIva: form.valorSiniestroAntesIva !== '' ? Number(form.valorSiniestroAntesIva) : undefined,
        valorAseguradoVehiculo: form.valorAseguradoVehiculo !== '' ? Number(form.valorAseguradoVehiculo) : undefined,
        numeroEventoCliente: form.numeroEventoCliente ? Number(form.numeroEventoCliente) : undefined,
        valorDeducible: calcValorDeducible(form) ?? undefined, // calculado
        esCandidatoPerdidaTotal: calcEsCandidatoPerdidaTotal(form), // calculado
        diasTaller: calcDiasTaller(form) ?? undefined, // calculado

        // --- Cobro al Cliente ---
        fechaNotifCobroCliente: form.fechaNotifCobroCliente || undefined,
        noOrdenServicioCobroCliente: form.noOrdenServicioCobroCliente || undefined,

        // --- Vehículo Sustituto ---
        seEntregoVehiculoSustituto: form.seEntregoVehiculoSustituto,
        fechaHoraReclamo: form.fechaHoraReclamo || undefined,
        fechaHoraEntregaSustituto: form.fechaHoraEntregaSustituto || undefined,
        horasReclamoHastaEntrega: calcHorasReclamoHastaEntrega(form) ?? undefined, // calculado
        cumpleKpi6Horas: calcCumpleKpi6Horas(form) ?? undefined, // calculado
        fechaRetiroSustituto: form.fechaRetiroSustituto || undefined,

        // --- Datos del Tercero ---
        placaTercero: form.placaTercero || undefined,
        marcaModeloTercero: form.marcaModeloTercero || undefined,
        nombreTerceroCausante: form.nombreTerceroCausante || undefined,
        terceroAfectoPoliza: form.terceroAfectoPoliza,
        aseguradoraTercero: form.aseguradoraTercero || undefined,
        polizaTercero: form.polizaTercero || undefined,
        tallerTerceroEstadia: form.tallerTerceroEstadia || undefined,

        // --- Valores adicionales (Tipo 005) ---
        valorIndemnizadoPT1: form.valorIndemnizadoPT1 !== '' ? Number(form.valorIndemnizadoPT1) : undefined,
        valorPendienteIndemnizacionPT2: calcValorPendienteIndemnizacionPT2(form) ?? undefined, // calculado

        // --- Pérdida Total - Proceso ---
        motivoPerdidaTotal: form.motivoPerdidaTotal || undefined,
        fechaDeclaratoriaPerdidaTotal: form.fechaDeclaratoriaPerdidaTotal || undefined,
        solicitudCambioEstatusKimerasoft: form.solicitudCambioEstatusKimerasoft,
        fechaSolicitudCambioEstatusKimerasoft: form.fechaSolicitudCambioEstatusKimerasoft || undefined,
        notificacionRetiroSustitutoPT: form.notificacionRetiroSustitutoPT || undefined,
        gestionRenovacionVehiculo: form.gestionRenovacionVehiculo || undefined,
        fechaRetiroSustitutoPT: form.fechaRetiroSustitutoPT || undefined,

        // --- Pérdida Total - Prenda bancaria ---
        entregaEstadoFinancieroBancoPrenda: form.entregaEstadoFinancieroBancoPrenda,
        nombreBancoPrenda: form.nombreBancoPrenda || undefined,
        fechaSolicitudLiberacionPrenda: form.fechaSolicitudLiberacionPrenda || undefined,
        cartaLevantamientoPrendaBanco: form.cartaLevantamientoPrendaBanco || undefined,
        tramiteLiberacionPrenda: form.tramiteLiberacionPrenda || undefined,
        entregaChequeFinanciero: form.entregaChequeFinanciero || undefined,

        // --- Pérdida Total - Documentos ---
        docCuvFinal: form.docCuvFinal || undefined,
        docCertificadoGravamen: form.docCertificadoGravamen || undefined,
        docOriginalMatricula: form.docOriginalMatricula || undefined,
        docCopiaCiPvRucRl: form.docCopiaCiPvRucRl || undefined,
        docComprobantePagoMatricula: form.docComprobantePagoMatricula || undefined,
        docOriginalCopiaLlave: form.docOriginalCopiaLlave || undefined,
        docCopiaFacturaVenta: form.docCopiaFacturaVenta || undefined,
        docVehiculoSinMultas: form.docVehiculoSinMultas || undefined,
        entregaDocumentosBroker: form.entregaDocumentosBroker || undefined,
        porcentajeAvanceChecklist: calcPorcentajeAvanceChecklist(form), // calculado

        // --- Pérdida Total - Notaría y cierre ---
        firmaContratoCompraVentaNotaria: form.firmaContratoCompraVentaNotaria || undefined,
        fechaPagoPerdidaTotal: form.fechaPagoPerdidaTotal || undefined,
        cambioEstatusPTotal: form.cambioEstatusPTotal || undefined,
        cambioEstatusFinalTotalVendido: form.cambioEstatusFinalTotalVendido,

        // --- Robo (Tipo 006) ---
        fechaDenunciaRobo: form.fechaDenunciaRobo || undefined,
        numeroDenuncia: form.numeroDenuncia || undefined,
        vehiculoRecuperado: form.vehiculoRecuperado,
        fechaRecuperacion: form.fechaRecuperacion || undefined,
        vehiculoDetenidoTrasRecuperacion: form.vehiculoDetenidoTrasRecuperacion,
        estadoVehiculoRecuperado: form.estadoVehiculoRecuperado || undefined,
        deducibleRoboComponentesElectronicos: calcDeducibleRoboComponentesElectronicos(form) ?? undefined, // calculado

        // --- KPI reducido (Tipos 007/008) ---
        totalTiempoSiniestro: calcTotalTiempoSiniestro(form) ?? undefined, // calculado

        // --- Legal / Vehículo Detenido (Tipo 007) ---
        causalDetencion: form.causalDetencion || undefined,
        requiereAcompanamientoAbogadoPenal: form.requiereAcompanamientoAbogadoPenal,
        confirmacionAcompanamientoAbogadoPenal: form.confirmacionAcompanamientoAbogadoPenal || undefined,
        abogadoAsignado: form.abogadoAsignado || undefined,
        fechaSeguimientoPartePolicial: form.fechaSeguimientoPartePolicial || undefined,
        fechaEnvioParteBroker: form.fechaEnvioParteBroker || undefined,
        fechaAsignacionFiscalia: form.fechaAsignacionFiscalia || undefined,
        fechaOrdenLiberacion: form.fechaOrdenLiberacion || undefined,
        valorCancelarParqueadero: form.valorCancelarParqueadero !== '' ? Number(form.valorCancelarParqueadero) : undefined,
        valorCancelarGrua: form.valorCancelarGrua !== '' ? Number(form.valorCancelarGrua) : undefined,
        fechaLiberacionVehiculo: form.fechaLiberacionVehiculo || undefined,
        seguimientoIndemnizacionTercero: form.seguimientoIndemnizacionTercero || undefined,
        seguimientoIndemnizacionUsuario: form.seguimientoIndemnizacionUsuario || undefined,

        // --- Tasa Spatt / Heridos-Fallecidos (Tipos 007/008) ---
        hayPersonasLesionadas: form.hayPersonasLesionadas,
        numeroOcupantesLesionados: form.numeroOcupantesLesionados !== '' ? Number(form.numeroOcupantesLesionados) : undefined,
        coberturaTasaSpattOcupanteLesionado: calcCoberturaTasaSpattOcupanteLesionado(form) ?? undefined, // calculado
        hayPersonasFallecidas: form.hayPersonasFallecidas,
        numeroFallecidos: form.numeroFallecidos !== '' ? Number(form.numeroFallecidos) : undefined,
        coberturaTodoRiesgoFallecido: calcCoberturaTodoRiesgoFallecido(form) ?? undefined, // calculado
        gastosFunerariosFallecido: GASTOS_FUNERARIOS_FIJO, // monto fijo de política
        gastosAmbulancia: GASTOS_AMBULANCIA_FIJO, // monto fijo de política
        limiteSeguroTodoRiesgoSiSuperaSpatt: calcLimiteSeguroTodoRiesgoSiSuperaSpatt(form) ?? undefined, // calculado
        historiaClinicaSolicitada: form.historiaClinicaSolicitada,
        fechaPagoFacturasTasaSpatt: form.fechaPagoFacturasTasaSpatt || undefined,
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

  // ---- Qué grupos de campos se muestran según el Tipo de Siniestro ----
  //  - Los grupos KPI / Valores / Cobro al Cliente / Vehículo Sustituto aplican
  //    a los Tipos 001 (Simple), 002 (RC usuario afecta a tercero), 003 (RC atendido por aseguradora
  //    del tercero) y 004 (no culposo sin afectación de póliza tercero).
  //  - El grupo "Datos del Tercero" aplica a 002, 003 y 004 (los mismos 4 campos base);
  //    los 3 campos extra (aseguradora, póliza, taller/estadía) solo al 003.
  //  Cuando se definan los otros tipos, se agrega su código aquí.
  const tipoSiniestroActual = tiposSiniestro.find((t) => String(t.id) === form.tipoSiniestroId);
  const esTipoSimple = tipoSiniestroActual?.codigo === CODIGO_SIMPLE;
  const esRcUsuarioAfectaTercero = tipoSiniestroActual?.codigo === CODIGO_RC_USUARIO_AFECTA_TERCERO;
  const esRcAseguradoraTercero = tipoSiniestroActual?.codigo === CODIGO_RC_ASEGURADORA_TERCERO;
  const esNoCulposoSinPolizaTercero = tipoSiniestroActual?.codigo === CODIGO_NO_CULPOSO_SIN_POLIZA_TERCERO;
  const esPerdidaTotalDanios = tipoSiniestroActual?.codigo === CODIGO_PERDIDA_TOTAL_DANIOS;
  const esPerdidaTotalRobo = tipoSiniestroActual?.codigo === CODIGO_PERDIDA_TOTAL_ROBO;
  const esDetencionHeridosTercero = tipoSiniestroActual?.codigo === CODIGO_DETENCION_HERIDOS_TERCERO;
  const esDetencionHeridosUsuario = tipoSiniestroActual?.codigo === CODIGO_DETENCION_HERIDOS_USUARIO;
  // Los 4 grupos "Pérdida Total - ..." (Proceso, Prenda bancaria, Documentos, Notaría y cierre)
  // son idénticos en 005 y 006; el 006 además agrega el grupo "Robo".
  const esAlgunaPerdidaTotal = esPerdidaTotalDanios || esPerdidaTotalRobo;
  // Los Tipos 007 y 008 comparten el mismo "esqueleto" reducido del Tipo Simple (no muestran
  // Taller Asignado, reducen KPI a un solo campo fórmula y Valores a un solo campo, mantienen
  // Vehículo Sustituto igual que el Tipo Simple, y agregan los grupos "Legal / Vehículo Detenido"
  // y "Tasa Spatt / Heridos-Fallecidos"). La única diferencia entre ambos es el campo de
  // "Seguimiento indemnización..." dentro de "Legal / Vehículo Detenido": el 007 hace
  // seguimiento a la indemnización AL TERCERO, el 008 la hace AL USUARIO ISIRENT.
  const esAlgunaDetencionHeridos = esDetencionHeridosTercero || esDetencionHeridosUsuario;
  const mostrarCamposSimple =
    esTipoSimple || esRcUsuarioAfectaTercero || esRcAseguradoraTercero ||
    esNoCulposoSinPolizaTercero || esAlgunaPerdidaTotal || esAlgunaDetencionHeridos;
  const mostrarTallerAsignado = !esAlgunaDetencionHeridos;
  const mostrarVehiculoSustituto = mostrarCamposSimple;
  const mostrarDatosTercero =
    esRcUsuarioAfectaTercero || esRcAseguradoraTercero || esNoCulposoSinPolizaTercero ||
    esAlgunaDetencionHeridos;

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

              {/* Taller Asignado: no aplica al Tipo 007 (detención con heridos/fallecidos afectando a tercero). */}
              {mostrarTallerAsignado && (
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
              )}

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

              {/* ================= Datos del Tercero =================
                  Tipos 002, 003 y 004. Los 3 últimos campos (aseguradora, póliza, taller/estadía)
                  solo se muestran en el 003 (RC atendido por aseguradora del tercero). */}
              {mostrarDatosTercero && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Datos del Tercero</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Placa del tercero</label>
                      <input type="text" value={form.placaTercero}
                        onChange={(e) => setForm({ ...form, placaTercero: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Marca / Modelo del tercero</label>
                      <input type="text" value={form.marcaModeloTercero}
                        onChange={(e) => setForm({ ...form, marcaModeloTercero: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nombre del tercero causante</label>
                      <input type="text" value={form.nombreTerceroCausante}
                        onChange={(e) => setForm({ ...form, nombreTerceroCausante: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    {!esAlgunaDetencionHeridos && (
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.terceroAfectoPoliza}
                            onChange={(e) => setForm({ ...form, terceroAfectoPoliza: e.target.checked })} />
                          ¿Tercero afectó su póliza?
                        </label>
                      </div>
                    )}
                    {esRcAseguradoraTercero && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Aseguradora del tercero</label>
                          <input type="text" value={form.aseguradoraTercero}
                            onChange={(e) => setForm({ ...form, aseguradoraTercero: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Póliza del tercero</label>
                          <input type="text" value={form.polizaTercero}
                            onChange={(e) => setForm({ ...form, polizaTercero: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1">Taller del tercero / estadía provisional</label>
                          <input type="text" value={form.tallerTerceroEstadia}
                            onChange={(e) => setForm({ ...form, tallerTerceroEstadia: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ================= Grupos de los Tipos 001, 002, 003, 004, 005 y 006 =================
                  KPI / Valores / Cobro al Cliente / Vehículo Sustituto.
                  En 005 y 006 (posible pérdida total) no se muestran Fecha de finiquito ni
                  Fecha de salida de taller (ver filtro más abajo), y se agregan 2 campos
                  extra en Valores. Cuando se definan los otros tipos, se repite este patrón. */}
              {mostrarCamposSimple && (
                <>
                  {/* KPI / Fechas de Proceso: los Tipos 007 y 008 lo reducen a un único campo (fórmula). */}
                  {esAlgunaDetencionHeridos ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">KPI / Fechas de Proceso</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Fecha de salida de taller</label>
                          <input type="date" value={form.fechaSalidaTaller}
                            onChange={(e) => setForm({ ...form, fechaSalidaTaller: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm" />
                          <p className="text-xs text-slate-400 mt-1">Necesaria para calcular el Total tiempo siniestro.</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Total tiempo siniestro (días)</label>
                          <input type="number" step="0.01" value={calcTotalTiempoSiniestro(form) ?? ''} disabled
                            placeholder="Falta Fecha Notif. Aseg. / Fecha de salida de taller"
                            className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">KPI / Fechas de Proceso</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          ['fechaLlegadaRepuestos', 'Fecha de llegada de repuestos'],
                          ['fechaAuditoria', 'Fecha de auditoría'],
                          // Fecha de finiquito y Fecha de salida de taller no aplican a los Tipos 005/006
                          // (posible pérdida total: el vehículo no vuelve al flujo normal de reparación).
                          ...(esAlgunaPerdidaTotal ? [] : [
                            ['fechaFiniquito', 'Fecha de finiquito'],
                            ['fechaSalidaTaller', 'Fecha de salida de taller'],
                          ]),
                        ].map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-sm font-medium mb-1">{label}</label>
                            <input type="date" value={(form as any)[key]}
                              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                              className="w-full border rounded px-3 py-2 text-sm" />
                          </div>
                        ))}
                        {/* Días en taller: solo tiene sentido cuando se captura Fecha de salida de taller
                            (no aplica a 005/006, posible pérdida total). */}
                        {!esAlgunaPerdidaTotal && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Días en taller</label>
                            <input type="number" step="0.01" value={calcDiasTaller(form) ?? ''} disabled
                              placeholder="Falta Fecha Ingreso Taller / Fecha de salida de taller"
                              className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Valores: los Tipos 007 y 008 lo reducen a "Valor asegurado del vehículo" (viene de la ficha del vehículo). */}
                  {esAlgunaDetencionHeridos ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Valores</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Valor asegurado del vehículo</label>
                          <input type="number" step="0.01" value={form.valorAseguradoVehiculo}
                            onChange={(e) => setForm({ ...form, valorAseguradoVehiculo: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm" />
                          <p className="text-xs text-slate-400 mt-1">Viene de la ficha del vehículo.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                        <label className="block text-sm font-medium mb-1">Número de evento del cliente</label>
                        <select value={form.numeroEventoCliente}
                          onChange={(e) => setForm({ ...form, numeroEventoCliente: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">— Sin asignar —</option>
                          <option value="1">1 — Primer evento</option>
                          <option value="2">2 — Segundo evento</option>
                          <option value="3">3 — Tercer evento</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Define el % y el piso aplicados al Valor deducible.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Valor deducible</label>
                        <input type="number" step="0.01" value={calcValorDeducible(form) ?? ''} disabled
                          placeholder="Falta Valor del siniestro / Valor asegurado / Nº de evento"
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={calcEsCandidatoPerdidaTotal(form)} disabled />
                          ¿Es candidato a pérdida total? (calculado: &gt;75% del valor asegurado)
                        </label>
                      </div>
                      {esAlgunaPerdidaTotal && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-1">Valor indemnizado P.T. 1</label>
                            <input type="number" step="0.01" value={form.valorIndemnizadoPT1}
                              onChange={(e) => setForm({ ...form, valorIndemnizadoPT1: e.target.value })}
                              className="w-full border rounded px-3 py-2 text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Valor pend. indemnización P.T. 2</label>
                            <input type="number" step="0.01" value={calcValorPendienteIndemnizacionPT2(form) ?? ''} disabled
                              placeholder="Falta Valor asegurado / Valor indemnizado P.T. 1"
                              className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  )}

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

                  {mostrarVehiculoSustituto && (
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
                        <label className="block text-sm font-medium mb-1">Fecha/hora del reclamo</label>
                        <input type="datetime-local" value={form.fechaHoraReclamo}
                          disabled={!form.seEntregoVehiculoSustituto}
                          onChange={(e) => setForm({ ...form, fechaHoraReclamo: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100" />
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
                        <input type="number" step="0.01" value={calcHorasReclamoHastaEntrega(form) ?? ''} disabled
                          placeholder="Falta Fecha/hora del reclamo o de entrega"
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">¿Cumple KPI de 6 horas?</label>
                        <input type="text" value={calcCumpleKpi6Horas(form) ?? ''} disabled
                          placeholder="Falta Fecha/hora del reclamo o de entrega"
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
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
                  )}
                </>
              )}

              {/* ================= Grupo Legal / Vehículo Detenido y Tasa Spatt / Heridos-Fallecidos =================
                  Tipos 007 (detención con heridos/fallecidos, afecta a tercero) y 008 (detención
                  con heridos/fallecidos, el tercero afecta al usuario ISIRENT). Idénticos salvo
                  el campo "Seguimiento indemnización...": al tercero en el 007, al usuario en el 008. */}
              {esAlgunaDetencionHeridos && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Legal / Vehículo Detenido</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Causal de detención</label>
                        <select value={form.causalDetencion}
                          onChange={(e) => setForm({ ...form, causalDetencion: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">— Sin asignar —</option>
                          {OPCIONES_CAUSAL_DETENCION.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.requiereAcompanamientoAbogadoPenal}
                            onChange={(e) => setForm({ ...form, requiereAcompanamientoAbogadoPenal: e.target.checked })} />
                          ¿Requiere acompañamiento de abogado penal?
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Confirmación acompañamiento abogado penal</label>
                        <input type="date" value={form.confirmacionAcompanamientoAbogadoPenal}
                          disabled={!form.requiereAcompanamientoAbogadoPenal}
                          onChange={(e) => setForm({ ...form, confirmacionAcompanamientoAbogadoPenal: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Abogado asignado</label>
                        <input type="text" value={form.abogadoAsignado}
                          onChange={(e) => setForm({ ...form, abogadoAsignado: e.target.value })}
                          placeholder="Por ciudad"
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha seguimiento parte policial</label>
                        <input type="date" value={form.fechaSeguimientoPartePolicial}
                          onChange={(e) => setForm({ ...form, fechaSeguimientoPartePolicial: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha envío parte al broker</label>
                        <input type="date" value={form.fechaEnvioParteBroker}
                          onChange={(e) => setForm({ ...form, fechaEnvioParteBroker: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha asignación fiscalía</label>
                        <input type="date" value={form.fechaAsignacionFiscalia}
                          onChange={(e) => setForm({ ...form, fechaAsignacionFiscalia: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha orden de liberación</label>
                        <input type="date" value={form.fechaOrdenLiberacion}
                          onChange={(e) => setForm({ ...form, fechaOrdenLiberacion: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Valor a cancelar en parqueadero</label>
                        <input type="number" step="0.01" value={form.valorCancelarParqueadero}
                          onChange={(e) => setForm({ ...form, valorCancelarParqueadero: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Valor a cancelar en grúa</label>
                        <input type="number" step="0.01" value={form.valorCancelarGrua}
                          onChange={(e) => setForm({ ...form, valorCancelarGrua: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha de liberación del vehículo</label>
                        <input type="date" value={form.fechaLiberacionVehiculo}
                          onChange={(e) => setForm({ ...form, fechaLiberacionVehiculo: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      {/* Solo Tipo 007: el tercero es el afectado, se le hace seguimiento a su indemnización. */}
                      {esDetencionHeridosTercero && (
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1">Seguimiento indemnización al tercero</label>
                          <input type="text" value={form.seguimientoIndemnizacionTercero}
                            onChange={(e) => setForm({ ...form, seguimientoIndemnizacionTercero: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm" />
                        </div>
                      )}
                      {/* Solo Tipo 008: el tercero afecta al usuario ISIRENT, se le hace seguimiento a SU indemnización. */}
                      {esDetencionHeridosUsuario && (
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1">Seguimiento indemnización al usuario</label>
                          <input type="text" value={form.seguimientoIndemnizacionUsuario}
                            onChange={(e) => setForm({ ...form, seguimientoIndemnizacionUsuario: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Tasa Spatt / Heridos-Fallecidos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.hayPersonasLesionadas}
                            onChange={(e) => setForm({ ...form, hayPersonasLesionadas: e.target.checked })} />
                          ¿Hay personas lesionadas?
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Número de ocupantes lesionados</label>
                        <input type="number" value={form.numeroOcupantesLesionados}
                          disabled={!form.hayPersonasLesionadas}
                          onChange={(e) => setForm({ ...form, numeroOcupantesLesionados: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Cobertura Tasa Spatt por ocupante lesionado</label>
                        <input type="number" step="0.01" value={calcCoberturaTasaSpattOcupanteLesionado(form) ?? ''} disabled
                          placeholder="Falta Valor asegurado del vehículo"
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.hayPersonasFallecidas}
                            onChange={(e) => setForm({ ...form, hayPersonasFallecidas: e.target.checked })} />
                          ¿Hay personas fallecidas?
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Número de fallecidos</label>
                        <input type="number" value={form.numeroFallecidos}
                          disabled={!form.hayPersonasFallecidas}
                          onChange={(e) => setForm({ ...form, numeroFallecidos: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Cobertura todo riesgo por fallecido</label>
                        <input type="number" step="0.01" value={calcCoberturaTodoRiesgoFallecido(form) ?? ''} disabled
                          placeholder="Falta Valor asegurado del vehículo"
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Gastos funerarios (por fallecido)</label>
                        <input type="number" step="0.01" value={GASTOS_FUNERARIOS_FIJO} disabled
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Gastos de ambulancia</label>
                        <input type="number" step="0.01" value={GASTOS_AMBULANCIA_FIJO} disabled
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Límite seguro todo riesgo si supera Spatt</label>
                        <input type="number" step="0.01" value={calcLimiteSeguroTodoRiesgoSiSuperaSpatt(form) ?? ''} disabled
                          placeholder="Falta Valor asegurado del vehículo"
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.historiaClinicaSolicitada}
                            onChange={(e) => setForm({ ...form, historiaClinicaSolicitada: e.target.checked })} />
                          Historia clínica solicitada
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha pago facturas Tasa Spatt</label>
                        <input type="date" value={form.fechaPagoFacturasTasaSpatt}
                          onChange={(e) => setForm({ ...form, fechaPagoFacturasTasaSpatt: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ================= Grupos compartidos por Tipos 005 y 006 =================
                  Pérdida Total - Proceso, Prenda bancaria, Documentos, Notaría y cierre.
                  Idénticos en "posible pérdida total por daños" (005) y "por robo" (006). */}
              {esAlgunaPerdidaTotal && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Pérdida Total - Proceso</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Motivo</label>
                        <input type="text" value={form.motivoPerdidaTotal}
                          onChange={(e) => setForm({ ...form, motivoPerdidaTotal: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha de declaratoria</label>
                        <input type="date" value={form.fechaDeclaratoriaPerdidaTotal}
                          onChange={(e) => setForm({ ...form, fechaDeclaratoriaPerdidaTotal: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm mb-1">
                          <input type="checkbox" checked={form.solicitudCambioEstatusKimerasoft}
                            onChange={(e) => setForm({ ...form, solicitudCambioEstatusKimerasoft: e.target.checked })} />
                          ¿Solicitud cambio de estatus en Kimerasoft?
                        </label>
                        <input type="date" value={form.fechaSolicitudCambioEstatusKimerasoft}
                          disabled={!form.solicitudCambioEstatusKimerasoft}
                          onChange={(e) => setForm({ ...form, fechaSolicitudCambioEstatusKimerasoft: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Notificación retiro de sustituto</label>
                        <input type="date" value={form.notificacionRetiroSustitutoPT}
                          onChange={(e) => setForm({ ...form, notificacionRetiroSustitutoPT: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Gestión de renovación del vehículo</label>
                        <input type="text" value={form.gestionRenovacionVehiculo}
                          onChange={(e) => setForm({ ...form, gestionRenovacionVehiculo: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha de retiro del vehículo sustituto</label>
                        <input type="date" value={form.fechaRetiroSustitutoPT}
                          onChange={(e) => setForm({ ...form, fechaRetiroSustitutoPT: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Pérdida Total - Prenda bancaria</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.entregaEstadoFinancieroBancoPrenda}
                            onChange={(e) => setForm({ ...form, entregaEstadoFinancieroBancoPrenda: e.target.checked })} />
                          ¿Entrega estado financiero banco con prenda?
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Nombre del banco</label>
                        <input type="text" value={form.nombreBancoPrenda}
                          onChange={(e) => setForm({ ...form, nombreBancoPrenda: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha solicitud liberación de prenda</label>
                        <input type="date" value={form.fechaSolicitudLiberacionPrenda}
                          onChange={(e) => setForm({ ...form, fechaSolicitudLiberacionPrenda: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Carta levantamiento de prenda del banco</label>
                        <select value={form.cartaLevantamientoPrendaBanco}
                          onChange={(e) => setForm({ ...form, cartaLevantamientoPrendaBanco: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">— Sin asignar —</option>
                          {OPCIONES_CHECKLIST_4.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Trámite de liberación de prenda</label>
                        <select value={form.tramiteLiberacionPrenda}
                          onChange={(e) => setForm({ ...form, tramiteLiberacionPrenda: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">— Sin asignar —</option>
                          {OPCIONES_CHECKLIST_4.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Entrega de cheque a Financiero</label>
                        <select value={form.entregaChequeFinanciero}
                          onChange={(e) => setForm({ ...form, entregaChequeFinanciero: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">— Sin asignar —</option>
                          {OPCIONES_PENDIENTE_OK.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Pérdida Total - Documentos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {([
                        ['docCuvFinal', 'CUV Final'],
                        ['docCertificadoGravamen', 'Certificado de Gravamen'],
                        ['docOriginalMatricula', 'Original de matrícula'],
                        ['docCopiaCiPvRucRl', 'Copia C.I., P.V., RUC R.L.'],
                        ['docComprobantePagoMatricula', 'Comprobante de pago de matrícula'],
                        ['docOriginalCopiaLlave', 'Original y copia de la llave'],
                        ['docCopiaFacturaVenta', 'Copia de factura de venta'],
                        ['docVehiculoSinMultas', 'Vehículo sin multas'],
                      ] as [string, string][]).map(([key, label]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium mb-1">{label}</label>
                          <select value={(form as any)[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm bg-white">
                            <option value="">— Sin asignar —</option>
                            {OPCIONES_CHECKLIST_4.map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium mb-1">Entrega de todos los documentos al Broker</label>
                        <select value={form.entregaDocumentosBroker}
                          onChange={(e) => setForm({ ...form, entregaDocumentosBroker: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">— Sin asignar —</option>
                          {OPCIONES_PENDIENTE_OK.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">% de avance del checklist</label>
                        <input type="number" step="0.01" value={calcPorcentajeAvanceChecklist(form)} disabled
                          className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Pérdida Total - Notaría y cierre</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Firma contrato compra-venta en notaría</label>
                        <select value={form.firmaContratoCompraVentaNotaria}
                          onChange={(e) => setForm({ ...form, firmaContratoCompraVentaNotaria: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">— Sin asignar —</option>
                          {OPCIONES_PENDIENTE_OK.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fecha de pago de pérdida total</label>
                        <input type="date" value={form.fechaPagoPerdidaTotal}
                          onChange={(e) => setForm({ ...form, fechaPagoPerdidaTotal: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Cambio de estatus a "P. Total"</label>
                        <select value={form.cambioEstatusPTotal}
                          onChange={(e) => setForm({ ...form, cambioEstatusPTotal: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm bg-white">
                          <option value="">— Sin asignar —</option>
                          {OPCIONES_CHECKLIST_4.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.cambioEstatusFinalTotalVendido}
                            onChange={(e) => setForm({ ...form, cambioEstatusFinalTotalVendido: e.target.checked })} />
                          ¿Cambio de estatus final a "Total Vendido"?
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ================= Grupo Robo =================
                  Solo para "Siniestro posible pérdida total por robo" (código 006). */}
              {esPerdidaTotalRobo && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Robo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha de denuncia de robo</label>
                      <input type="date" value={form.fechaDenunciaRobo}
                        onChange={(e) => setForm({ ...form, fechaDenunciaRobo: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Número de denuncia</label>
                      <input type="text" value={form.numeroDenuncia}
                        onChange={(e) => setForm({ ...form, numeroDenuncia: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.vehiculoRecuperado}
                          onChange={(e) => setForm({ ...form, vehiculoRecuperado: e.target.checked })} />
                        ¿Vehículo recuperado?
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha de recuperación</label>
                      <input type="date" value={form.fechaRecuperacion}
                        disabled={!form.vehiculoRecuperado}
                        onChange={(e) => setForm({ ...form, fechaRecuperacion: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100" />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.vehiculoDetenidoTrasRecuperacion}
                          disabled={!form.vehiculoRecuperado}
                          onChange={(e) => setForm({ ...form, vehiculoDetenidoTrasRecuperacion: e.target.checked })} />
                        ¿Vehículo detenido tras recuperación?
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Estado del vehículo recuperado</label>
                      <select value={form.estadoVehiculoRecuperado}
                        disabled={!form.vehiculoRecuperado}
                        onChange={(e) => setForm({ ...form, estadoVehiculoRecuperado: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm bg-white disabled:bg-slate-100">
                        <option value="">— Sin asignar —</option>
                        <option value="Con daños">Con daños</option>
                        <option value="Sin daños">Sin daños</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Deducible por robo de componentes electrónicos</label>
                      <input type="number" step="0.01" value={calcDeducibleRoboComponentesElectronicos(form) ?? ''} disabled
                        placeholder="Falta Valor del siniestro antes de IVA"
                        className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                    </div>
                  </div>
                </div>
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

          {/* ---------- Pestaña: Bitácora ----------
              Muestra el historial de auditoría (tabla AuditLog): quién hizo qué cambio,
              en qué campos, y cuándo. GET /siniestros/:id/historial debe devolver un
              arreglo de { id, accion, usuarioNombre, usuarioEmail, creadoEn, detalle }
              donde detalle = { campos: [{ campo, antes, despues }] } (ver fragmento de
              backend entregado aparte). */}
          {tab === 'bitacora' && (
            <div>
              {cargandoHistorial ? (
                <p className="text-sm text-slate-500">Cargando historial…</p>
              ) : historial.length === 0 ? (
                <p className="text-sm text-slate-500">No hay historial disponible para este siniestro.</p>
              ) : (
                <ul className="divide-y">
                  {historial.map((h: any) => {
                    const campos: any[] = h.detalle?.campos || [];
                    return (
                      <li key={h.id} className="py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-700">
                              {ETIQUETAS_ACCION[h.accion] || h.accion}
                            </span>
                            <span className="text-slate-400"> — por </span>
                            <span className="text-slate-700">{h.usuarioNombre || h.usuarioEmail || 'Sistema'}</span>
                          </div>
                          <span className="text-slate-400 text-xs whitespace-nowrap ml-3">
                            {formatFechaHora(h.creadoEn) || '—'}
                          </span>
                        </div>
                        {campos.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                            {campos.map((c, i) => (
                              <li key={i}>
                                <span className="font-medium text-slate-600">{etiquetaCampo(c.campo)}:</span>{' '}
                                {formatValorAuditoria(c.antes)} → {formatValorAuditoria(c.despues)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
