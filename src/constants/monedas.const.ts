export interface Moneda {
  codigo: string; // ISO 4217
  nombre: string;
}

// Lista de monedas de uso frecuente. Por defecto el sistema usa "USD".
const MONEDAS_RAW: Moneda[] = [
  { codigo: "USD", nombre: "Dólar estadounidense (USD)" },
  { codigo: "EUR", nombre: "Euro (EUR)" },
  { codigo: "COP", nombre: "Peso colombiano (COP)" },
  { codigo: "PEN", nombre: "Sol peruano (PEN)" },
  { codigo: "BRL", nombre: "Real brasileño (BRL)" },
  { codigo: "CLP", nombre: "Peso chileno (CLP)" },
  { codigo: "ARS", nombre: "Peso argentino (ARS)" },
  { codigo: "BOB", nombre: "Boliviano (BOB)" },
  { codigo: "PYG", nombre: "Guaraní paraguayo (PYG)" },
  { codigo: "UYU", nombre: "Peso uruguayo (UYU)" },
  { codigo: "VES", nombre: "Bolívar venezolano (VES)" },
  { codigo: "MXN", nombre: "Peso mexicano (MXN)" },
  { codigo: "PAB", nombre: "Balboa panameño (PAB)" },
  { codigo: "CRC", nombre: "Colón costarricense (CRC)" },
  { codigo: "GTQ", nombre: "Quetzal guatemalteco (GTQ)" },
  { codigo: "HNL", nombre: "Lempira hondureño (HNL)" },
  { codigo: "NIO", nombre: "Córdoba nicaragüense (NIO)" },
  { codigo: "DOP", nombre: "Peso dominicano (DOP)" },
  { codigo: "CUP", nombre: "Peso cubano (CUP)" },
  { codigo: "GBP", nombre: "Libra esterlina (GBP)" },
  { codigo: "CHF", nombre: "Franco suizo (CHF)" },
  { codigo: "CAD", nombre: "Dólar canadiense (CAD)" },
  { codigo: "AUD", nombre: "Dólar australiano (AUD)" },
  { codigo: "JPY", nombre: "Yen japonés (JPY)" },
  { codigo: "CNY", nombre: "Yuan chino (CNY)" },
  { codigo: "RUB", nombre: "Rublo ruso (RUB)" },
  { codigo: "INR", nombre: "Rupia india (INR)" },
  { codigo: "ZAR", nombre: "Rand sudafricano (ZAR)" },
  { codigo: "SEK", nombre: "Corona sueca (SEK)" },
  { codigo: "NOK", nombre: "Corona noruega (NOK)" },
  { codigo: "DKK", nombre: "Corona danesa (DKK)" },
  { codigo: "PLN", nombre: "Zloty polaco (PLN)" },
  { codigo: "TRY", nombre: "Lira turca (TRY)" },
  { codigo: "AED", nombre: "Dírham de EAU (AED)" },
  { codigo: "KRW", nombre: "Won surcoreano (KRW)" },
  { codigo: "NZD", nombre: "Dólar neozelandés (NZD)" },
];

export const MONEDAS: Moneda[] = [...MONEDAS_RAW].sort((a, b) => {
  if (a.codigo === "USD") return -1;
  if (b.codigo === "USD") return 1;
  return a.nombre.localeCompare(b.nombre, "es");
});

export function nombreMoneda(codigo: string): string {
  return MONEDAS.find((m) => m.codigo === codigo)?.nombre ?? codigo;
}
