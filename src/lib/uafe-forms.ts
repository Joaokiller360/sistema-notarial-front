// Formulario UAFE ("Conozca a su cliente" / debida diligencia).
// Solo el *shape* de los datos del formulario vive aquí; la persistencia real
// (listar, crear, editar, eliminar, comprobantes) está en `uafeFormsService`
// (@/services), que habla con la API `/uafe-forms`.

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
