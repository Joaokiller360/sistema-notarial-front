// Almacén local de formularios UAFE ("Conozca a su cliente" / debida diligencia).
// Todavía no hay backend de formularios: los envíos se guardan en localStorage
// del navegador. Cada envío registra el nombre de quien llenó el formulario.

const STORAGE_KEY = "notaria_uafe_forms";

export type TipoPersona = "natural" | "juridica";
export type SiNo = "si" | "no";

export interface CuentaBancaria {
  institucion: string;
  tipoCuenta: string;
  numero: string;
  titular: string;
}

export interface UafeFormData {
  // 1. Información general del trámite
  lugar: string;
  fecha: string;
  hora: string;
  tipoTramite: string;
  actoContrato: string;
  rolCompareciente: string;

  // 2. Datos del compareciente
  tipoPersona: TipoPersona;
  nombres: string; // Nombres y apellidos o razón social
  tipoId: string;
  numeroId: string;
  nacionalidad: string;
  genero: string;
  direccion: string;
  telefono: string;
  email: string;
  actividadEconomica: string;
  ocupacion: string;
  entidadTrabajo: string;
  cargo: string;
  estadoCivil: string;
  conyugeNombres: string;
  conyugeId: string;

  // 3. Representante legal / apoderado
  repAplica: boolean;
  repNombres: string;
  repTipoId: string;
  repNumeroId: string;
  repLugarFechaNacimiento: string;
  repPoderNotaria: string;
  repPoderProtocoloFecha: string;

  // 4. Información del bien
  tipoBien: string;
  descripcionBien: string;

  // 5. Aspectos económicos y origen de fondos
  cuantia: string;
  avaluo: string;
  ciudadFechaPago: string; // ciudad de pago
  fechaPago: string; // fecha de pago (YYYY-MM-DD)
  moneda: string; // código de moneda (por defecto "USD")
  origenFondos: string;
  origenDetalle: string;
  formaPago: string;
  adjuntaComprobante: boolean;
  /** Comprobantes de pago escaneados (1 a 5). Se guardan como data URL JPEG
   *  reducido para poder persistir en localStorage y anexarlos al PDF impreso. */
  comprobantes: string[];
  cuentaOrigen: CuentaBancaria;
  cuentaDestino: CuentaBancaria;
  terceroInterviene: boolean;
  terceroMotivo: string;
  terceroId: string;
  terceroNombre: string;

  // 6. Declaración PEP
  esPep: SiNo;
  pepCargo: string;
  pepFuncion: string;
  pepJerarquia: string;
  pepTieneRelacion: boolean;
  pepAsociadoNombres: string;

  // 8. Uso exclusivo notaría
  /** Nivel de alerta / riesgo interno. NO se imprime en el PDF. */
  nivelRiesgo: "" | "bajo" | "medio" | "alto" | "critico";
  /** Tipo de trámite del matrizador: uno solo. */
  matrizadorTipo: "" | "protocolo" | "diligencial";
  matrizadorNombre: string;
}

export interface UafeSubmission {
  id: string;
  createdAt: string;
  updatedAt: string;
  filledByName: string; // quien llenó el formulario
  filledByEmail: string;
  filledByRole: string;
  templateId: string;
  templateName: string;
  data: UafeFormData;
}

function emptyCuenta(): CuentaBancaria {
  return { institucion: "", tipoCuenta: "ahorros", numero: "", titular: "" };
}

export function emptyUafeData(): UafeFormData {
  const today = new Date().toISOString().split("T")[0];
  return {
    lugar: "Esmeraldas",
    fecha: today,
    hora: "",
    tipoTramite: "",
    actoContrato: "",
    rolCompareciente: "",

    tipoPersona: "natural",
    nombres: "",
    tipoId: "cedula",
    numeroId: "",
    nacionalidad: "",
    genero: "",
    direccion: "",
    telefono: "",
    email: "",
    actividadEconomica: "",
    ocupacion: "",
    entidadTrabajo: "",
    cargo: "",
    estadoCivil: "soltero",
    conyugeNombres: "",
    conyugeId: "",

    repAplica: false,
    repNombres: "",
    repTipoId: "cedula",
    repNumeroId: "",
    repLugarFechaNacimiento: "",
    repPoderNotaria: "",
    repPoderProtocoloFecha: "",

    tipoBien: "ninguno",
    descripcionBien: "",

    cuantia: "",
    avaluo: "",
    ciudadFechaPago: "",
    fechaPago: "",
    moneda: "USD",
    origenFondos: "",
    origenDetalle: "",
    formaPago: "",
    adjuntaComprobante: true,
    comprobantes: [],
    cuentaOrigen: emptyCuenta(),
    cuentaDestino: emptyCuenta(),
    terceroInterviene: false,
    terceroMotivo: "",
    terceroId: "",
    terceroNombre: "",

    esPep: "no",
    pepCargo: "",
    pepFuncion: "",
    pepJerarquia: "",
    pepTieneRelacion: false,
    pepAsociadoNombres: "",

    nivelRiesgo: "",
    matrizadorTipo: "",
    matrizadorNombre: "",
  };
}

function readAll(): UafeSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UafeSubmission[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: UafeSubmission[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // cuota llena / modo privado — se ignora
  }
}

export function listUafe(): UafeSubmission[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUafe(id: string): UafeSubmission | undefined {
  return readAll().find((s) => s.id === id);
}

export function deleteUafe(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

interface SaveInput {
  id?: string;
  data: UafeFormData;
  filledByName: string;
  filledByEmail: string;
  filledByRole: string;
  templateId: string;
  templateName: string;
}

export function saveUafe(input: SaveInput): UafeSubmission {
  const items = readAll();
  const now = new Date().toISOString();

  if (input.id) {
    const idx = items.findIndex((s) => s.id === input.id);
    if (idx !== -1) {
      const updated: UafeSubmission = {
        ...items[idx],
        data: input.data,
        updatedAt: now,
      };
      items[idx] = updated;
      writeAll(items);
      return updated;
    }
  }

  const created: UafeSubmission = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `uafe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    filledByName: input.filledByName,
    filledByEmail: input.filledByEmail,
    filledByRole: input.filledByRole,
    templateId: input.templateId,
    templateName: input.templateName,
    data: input.data,
  };
  items.push(created);
  writeAll(items);
  return created;
}

// ───────────────────────────── Ejemplos ─────────────────────────────
// 3 formularios UAFE completos de muestra. Se detectan por este correo.
const EXAMPLE_EMAIL = "ejemplos@notaria.local";

export function hasExampleUafe(): boolean {
  return readAll().some((s) => s.filledByEmail === EXAMPLE_EMAIL);
}

function exampleData(over: Partial<UafeFormData>): UafeFormData {
  return { ...emptyUafeData(), ...over };
}

const EXAMPLES: { templateName: string; filledByName: string; data: UafeFormData }[] = [
  {
    templateName: "UAFE — Conozca a su cliente",
    filledByName: "Ejemplo · Compraventa de inmueble",
    data: exampleData({
      lugar: "Esmeraldas",
      fecha: "2026-02-10",
      hora: "10:30",
      tipoTramite: "protocolo",
      actoContrato: "compraventa_inmueble",
      rolCompareciente: "comprador",
      tipoPersona: "natural",
      nombres: "María Fernanda Quiñónez Valencia",
      tipoId: "cedula",
      numeroId: "0803456789",
      nacionalidad: "Ecuador",
      genero: "femenino",
      direccion: "Av. Libertad 12-45 y Calle Bolívar, Esmeraldas",
      telefono: "0991234567",
      email: "mfquinonez@correo.com",
      actividadEconomica: "Comercio al por menor",
      ocupacion: "Comerciante",
      entidadTrabajo: "Comercial Quiñónez",
      cargo: "Propietaria",
      estadoCivil: "casado",
      conyugeNombres: "Luis Alberto Mina Castro",
      conyugeId: "0802345678",
      tipoBien: "casa",
      descripcionBien:
        "Casa de dos plantas, clave catastral 08-01-501-0123-001, ubicada en la ciudadela Los Almendros, lote 12.",
      cuantia: "85000.00",
      avaluo: "78000.00",
      ciudadFechaPago: "Esmeraldas",
      fechaPago: "2026-02-10",
      moneda: "USD",
      origenFondos: "credito_bancario",
      formaPago: "transferencia",
      adjuntaComprobante: true,
      cuentaOrigen: {
        institucion: "Banco Pichincha",
        tipoCuenta: "ahorros",
        numero: "2209876543",
        titular: "María Fernanda Quiñónez Valencia",
      },
      cuentaDestino: {
        institucion: "Banco Guayaquil",
        tipoCuenta: "corriente",
        numero: "0012345678",
        titular: "Jorge Aníbal Preciado Ortiz",
      },
      esPep: "no",
      nivelRiesgo: "bajo",
      matrizadorTipo: "protocolo",
      matrizadorNombre: "Abg. Clever Nazareno Palma",
    }),
  },
  {
    templateName: "UAFE — Conozca a su cliente",
    filledByName: "Ejemplo · Constitución de hipoteca (empresa)",
    data: exampleData({
      lugar: "Esmeraldas",
      fecha: "2026-03-04",
      hora: "15:00",
      tipoTramite: "protocolo",
      actoContrato: "hipoteca",
      rolCompareciente: "deudor",
      tipoPersona: "juridica",
      nombres: "Constructora Delta del Pacífico S.A.",
      tipoId: "ruc",
      numeroId: "0891234567001",
      direccion: "Km 2.5 vía Atacames, parque industrial, Esmeraldas",
      telefono: "062700123",
      email: "gerencia@deltapacifico.com.ec",
      actividadEconomica: "Construcción de obras civiles",
      repAplica: true,
      repNombres: "Carlos Eduardo Bone Angulo",
      repTipoId: "cedula",
      repNumeroId: "0805678912",
      repLugarFechaNacimiento: "Esmeraldas, Ecuador, 1979-06-14",
      repPoderNotaria: "Notaría Segunda del Cantón Esmeraldas",
      repPoderProtocoloFecha: "N.º 452, 2025-11-20",
      tipoBien: "terreno",
      descripcionBien:
        "Lote industrial de 4.500 m², clave catastral 08-01-777-0045-000, sector Km 2.5 vía Atacames.",
      cuantia: "250000.00",
      avaluo: "310000.00",
      ciudadFechaPago: "Esmeraldas",
      fechaPago: "2026-03-04",
      moneda: "USD",
      origenFondos: "credito_bancario",
      formaPago: "cheque_certificado",
      adjuntaComprobante: true,
      cuentaOrigen: {
        institucion: "CFN — Corporación Financiera Nacional",
        tipoCuenta: "corriente",
        numero: "1002003004",
        titular: "Constructora Delta del Pacífico S.A.",
      },
      cuentaDestino: {
        institucion: "Banco del Pacífico",
        tipoCuenta: "corriente",
        numero: "7788990011",
        titular: "Inmobiliaria Costa Verde Cía. Ltda.",
      },
      esPep: "no",
      nivelRiesgo: "medio",
      matrizadorTipo: "protocolo",
      matrizadorNombre: "Abg. Clever Nazareno Palma",
    }),
  },
  {
    templateName: "UAFE — Conozca a su cliente",
    filledByName: "Ejemplo · Contrato de mutuo (PEP)",
    data: exampleData({
      lugar: "Esmeraldas",
      fecha: "2026-04-18",
      hora: "09:15",
      tipoTramite: "diligencia",
      actoContrato: "mutuo",
      rolCompareciente: "deudor",
      tipoPersona: "natural",
      nombres: "Ramón Alexander Caicedo Estupiñán",
      tipoId: "cedula",
      numeroId: "0801122334",
      nacionalidad: "Ecuador",
      genero: "masculino",
      direccion: "Calle Sucre 5-20 y Piedrahíta, centro, Esmeraldas",
      telefono: "0987654321",
      email: "racaicedo@correo.com",
      actividadEconomica: "Administración pública",
      ocupacion: "Servidor público",
      entidadTrabajo: "GAD Municipal de Esmeraldas",
      cargo: "Director de Obras Públicas",
      estadoCivil: "soltero",
      tipoBien: "ninguno",
      cuantia: "20000.00",
      avaluo: "",
      ciudadFechaPago: "Esmeraldas",
      fechaPago: "2026-04-18",
      moneda: "USD",
      origenFondos: "ahorros",
      formaPago: "efectivo",
      adjuntaComprobante: false,
      esPep: "si",
      pepCargo: "Director de Obras Públicas",
      pepFuncion: "Dirección y contratación de obra pública municipal",
      pepJerarquia: "Nivel jerárquico superior (dirección)",
      pepTieneRelacion: true,
      pepAsociadoNombres: "Silvia Rosa Mina Bone (concejala)",
      nivelRiesgo: "alto",
      matrizadorTipo: "diligencial",
      matrizadorNombre: "Abg. Clever Nazareno Palma",
    }),
  },
];

/**
 * Inserta los 3 formularios de ejemplo si aún no existen.
 * Devuelve cuántos se agregaron.
 */
export function seedExampleUafe(): number {
  if (hasExampleUafe()) return 0;
  const items = readAll();
  const now = Date.now();
  EXAMPLES.forEach((ex, i) => {
    const ts = new Date(now - i * 60000).toISOString();
    items.push({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `uafe_ex_${now}_${i}`,
      createdAt: ts,
      updatedAt: ts,
      filledByName: ex.filledByName,
      filledByEmail: EXAMPLE_EMAIL,
      filledByRole: "EJEMPLO",
      templateId: "uafe-principal",
      templateName: ex.templateName,
      data: ex.data,
    });
  });
  writeAll(items);
  return EXAMPLES.length;
}
