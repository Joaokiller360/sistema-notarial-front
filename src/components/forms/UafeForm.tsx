"use client";

import { useEffect, useState } from "react";
import { Printer, Save, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { emptyUafeData, type UafeFormData } from "@/lib/uafe-forms";
import { uafeFormsService, type UafeComprobante } from "@/services";
import { NacionalidadSelect } from "@/components/common/NacionalidadSelect";
import { ComboBox } from "@/components/common/ComboBox";
import { MONEDAS, nombreMoneda } from "@/constants/monedas.const";
import {
  cleanText,
  cleanPhone,
  cleanMoney,
  digitsOnly,
  isBlockedKey,
  isValidEmail,
  isValidCedulaOrRuc,
  isValidPhone,
} from "@/lib/text-guard";

const MAX_COMPROBANTES = 5;
const TXT_MAX = 200;
const MONTO_MAX = 999_999_999.99;
const todayISO = () => new Date().toISOString().split("T")[0];

const RIESGO: Record<
  "" | "bajo" | "medio" | "alto" | "critico",
  { label: string; cls: string }
> = {
  "": { label: "Sin evaluar", cls: "bg-muted text-muted-foreground border-border" },
  bajo: { label: "Bajo", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-400" },
  medio: { label: "Medio", cls: "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-400" },
  alto: { label: "Alto", cls: "bg-orange-500/15 text-orange-600 border-orange-500/40 dark:text-orange-400" },
  critico: { label: "Crítico", cls: "bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-400" },
};

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-70 disabled:cursor-not-allowed";
const labelCls = "block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide";
const sectionTitleCls =
  "text-base font-bold text-foreground border-b border-border pb-2 mb-4 uppercase";

/* Paleta institucional sobria. */
const INK = "#1a1a1a";
const NAVY = "#1f2d54"; // acento institucional
const GOLD = "#b8860b"; // filete/acentos finos

/**
 * Estilo del documento (pantalla + impresión). Convierte el formulario en un
 * documento oficial: membrete, secciones numeradas con badge, paleta azul
 * institucional + filete dorado. Mantiene la tipografía por defecto del sistema.
 * NO toca el aspecto editable de los inputs en pantalla — eso se transforma en
 * "ficha" solo al imprimir (ver PRINT_CSS).
 */
const SECTION_CSS = `
/* Nada de desbordes: los hijos de grid/flex pueden encogerse y el texto largo
   (correos, direcciones) parte de línea. */
#uafe-print-area, #uafe-print-area * { min-width: 0; overflow-wrap: anywhere; box-sizing: border-box; }
#uafe-print-area .uafe-field { min-width: 0; }
#uafe-print-area input,
#uafe-print-area select,
#uafe-print-area textarea { max-width: 100%; }

/* Formularios notariales: todo en MAYÚSCULAS (los <select> no pasan por
   cleanText, así que se fuerza por CSS en pantalla y por JS en el PDF). */
#uafe-print-area select,
#uafe-print-area select option { text-transform: uppercase; }

/* ── Membrete ── */
#uafe-print-area .uafe-header {
  background: #ffffff !important;
  border-bottom: 2px solid ${NAVY};
  padding: 18px 24px 14px;
  text-align: center;
}
#uafe-print-area .uafe-pais {
  margin: 0; font-size: 8pt; letter-spacing: .1em; text-transform: uppercase; color: #6b7280;
}
#uafe-print-area .uafe-notaria {
  margin: 2px 0 0; font-size: 11pt; font-weight: 700; color: ${NAVY}; letter-spacing: .02em;
}
#uafe-print-area .uafe-header h1 {
  margin: 8px 0 0; font-size: 15pt; font-weight: 700; color: ${INK};
  text-transform: uppercase; letter-spacing: .04em;
}
#uafe-print-area .uafe-header h2 {
  margin: 2px 0 0; font-size: 10pt; font-weight: 600; color: #6b7280; letter-spacing: .06em;
}
#uafe-print-area .uafe-header::after {
  content: ""; display: block; width: 72px; height: 2px; background: ${GOLD}; margin: 9px auto 0;
}

/* ── Secciones ── */
#uafe-print-area .uafe-body { counter-reset: uafesec; }
#uafe-print-area .uafe-section {
  counter-increment: uafesec;
  border: 1px solid #e2e4ea !important;
  border-radius: 6px !important;
  padding: 16px 18px !important;
  overflow: visible !important;
}
#uafe-print-area .uafe-section > h3:first-child,
#uafe-print-area .uafe-section > div:first-child > h3 {
  display: flex; align-items: center; gap: 9px;
  margin: 0 0 12px; padding-bottom: 6px;
  border-bottom: 1px solid #d6d9e0;
  color: ${NAVY}; font-size: 11pt; font-weight: 700;
  text-transform: none; letter-spacing: .01em;
}
#uafe-print-area .uafe-section > h3:first-child::before,
#uafe-print-area .uafe-section > div:first-child > h3::before {
  content: counter(uafesec);
  flex: 0 0 auto; width: 21px; height: 21px; border-radius: 4px;
  background: ${NAVY}; color: #fff;
  font-size: 10pt; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
/* Cuando el h3 vive dentro de un contenedor flex (secciones 3 y 9),
   ese contenedor no debe dibujar su propio filete inferior. */
#uafe-print-area .uafe-section > div:first-child {
  border-bottom: 0 !important; padding-bottom: 0 !important; margin-bottom: 8px !important;
}
/* Sección 8 (uso notaría) sin número */
#uafe-print-area .uafe-section:nth-of-type(8) > h3:first-child::before { display: none; }
#uafe-print-area .uafe-section:nth-of-type(8) > h3:first-child { justify-content: center; }

/* ── Sección 7: Declaración jurada destacada ── */
#uafe-print-area .uafe-section:nth-of-type(7) { border-color: #e6cf8b !important; }
#uafe-print-area .uafe-section:nth-of-type(7) > h3:first-child {
  color: #6b5311; border-color: #e6cf8b;
}
#uafe-print-area .uafe-section:nth-of-type(7) > h3:first-child::before { background: #8a6d1d; }
#uafe-print-area .uafe-declara {
  background: #fdf6e3 !important;
  border: 1px solid #e6cf8b !important;
  border-left: 3px solid ${GOLD} !important;
  border-radius: 4px !important;
  color: #4a4a4a !important;
}
#uafe-print-area .uafe-declara strong { color: ${INK} !important; }

/* ── Firma y sello ── */
#uafe-print-area .uafe-firma-box {
  border: 1px solid #c7ccd6; border-radius: 6px; padding: 14px;
  text-align: center; min-height: 122px; background: #ffffff;
  display: flex; flex-direction: column; justify-content: flex-end;
}
#uafe-print-area .uafe-firma-line { border-top: 1px dashed #6b7280; margin-bottom: 6px; }
#uafe-print-area .uafe-firma-label {
  margin: 0; font-weight: 700; font-size: 9pt; color: ${INK};
}
#uafe-print-area .uafe-firma-sub { margin: 2px 0 0; font-size: 7.5pt; color: #6b7280; }

/* Pie de página: sólo visible al imprimir */
.uafe-print-footer { display: none; }

/* ── Colores por sección SOLO en pantalla (para distinguirlas al editar).
      En el PDF las secciones van sobrias/navy. ── */
@media screen {
  #uafe-print-area .uafe-section {
    border-left: 5px solid var(--sc, #94a3b8);
    background: var(--scb, transparent);
  }
  #uafe-print-area .uafe-section > h3:first-child,
  #uafe-print-area .uafe-section > div:first-child > h3 { color: var(--sc, inherit); }
  #uafe-print-area .uafe-section > h3:first-child::before,
  #uafe-print-area .uafe-section > div:first-child > h3::before { background: var(--sc, ${NAVY}); }

  #uafe-print-area .uafe-section:nth-of-type(1) { --sc:#2563eb; --scb:#2563eb0f; }
  #uafe-print-area .uafe-section:nth-of-type(2) { --sc:#059669; --scb:#0596690f; }
  #uafe-print-area .uafe-section:nth-of-type(3) { --sc:#d97706; --scb:#d977060f; }
  #uafe-print-area .uafe-section:nth-of-type(4) { --sc:#7c3aed; --scb:#7c3aed0f; }
  #uafe-print-area .uafe-section:nth-of-type(5) { --sc:#0891b2; --scb:#0891b20f; }
  #uafe-print-area .uafe-section:nth-of-type(6) { --sc:#e11d48; --scb:#e11d480f; }
  #uafe-print-area .uafe-section:nth-of-type(7) { --sc:#0d9488; --scb:#0d94880f; }
  #uafe-print-area .uafe-section:nth-of-type(8) { --sc:#475569; --scb:#4755690f; }
  #uafe-print-area .uafe-section:nth-of-type(9) { --sc:#4f46e5; --scb:#4f46e50f; }
}
`;

/**
 * CSS de impresión: oculta el chrome de la app (sidebar, navbar, barra de
 * acciones) y deja SOLO el formulario. Compacta agresivamente para que TODO el
 * formulario (secciones 1 a 8 + declaración) quepa en 1–2 hojas A4. Los
 * comprobantes se anexan en hojas aparte al final.
 */
const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 9mm 9mm 13mm; }
  body * { visibility: hidden !important; }
  #uafe-print-area, #uafe-print-area *, .uafe-print-footer, .uafe-print-footer * { visibility: visible !important; }
  #uafe-print-area {
    position: absolute; left: 0; top: 0; width: 100%;
    font-size: 8pt !important; line-height: 1.2 !important;
  }
  #uafe-print-area, #uafe-print-area *, .uafe-print-footer {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .uafe-no-print { display: none !important; }
  #uafe-print-area {
    border: 0 !important; background: #ffffff !important; color: #1a1a1a !important;
  }
  #uafe-print-area .uafe-section { background: #fafafb !important; }
  #uafe-print-area .uafe-section:nth-of-type(7) { background: #fffdf5 !important; }
  #uafe-print-area .text-muted-foreground,
  #uafe-print-area .text-foreground { color: #1a1a1a !important; }

  /* ── Membrete compacto ── */
  #uafe-print-area .uafe-header { padding: 10px 16px 8px !important; }
  #uafe-print-area .uafe-notaria { font-size: 10pt !important; }
  #uafe-print-area .uafe-header h1 { font-size: 13pt !important; }
  #uafe-print-area .uafe-header h2 { font-size: 8.5pt !important; }
  #uafe-print-area .uafe-header::after { margin-top: 6px !important; }

  /* ── Compactación para caber en 1–2 hojas ── */
  #uafe-print-area .p-6 { padding: 6px !important; }
  #uafe-print-area .uafe-body > * + * { margin-top: 6px !important; }
  #uafe-print-area .space-y-6 > * + * { margin-top: 5px !important; }
  #uafe-print-area .uafe-section { padding: 8px 10px !important; margin: 0 0 6px !important; }
  #uafe-print-area .uafe-section > h3:first-child,
  #uafe-print-area .uafe-section > div:first-child > h3 {
    font-size: 9pt !important; margin-bottom: 6px !important; padding-bottom: 3px !important;
  }
  #uafe-print-area .uafe-section > h3:first-child::before,
  #uafe-print-area .uafe-section > div:first-child > h3::before {
    width: 15px !important; height: 15px !important; font-size: 7.5pt !important;
  }
  #uafe-print-area h4, #uafe-print-area h5 { font-size: 8pt !important; margin-bottom: 2px !important; }
  #uafe-print-area .text-base { font-size: 9pt !important; }
  #uafe-print-area .text-sm { font-size: 8pt !important; }
  #uafe-print-area .text-xs { font-size: 7pt !important; }
  #uafe-print-area .text-\\[11px\\] { font-size: 6.5pt !important; }
  #uafe-print-area .leading-relaxed { line-height: 1.25 !important; }
  #uafe-print-area .mb-6 { margin-bottom: 3px !important; }
  #uafe-print-area .mb-4 { margin-bottom: 3px !important; }
  #uafe-print-area .mb-3 { margin-bottom: 2px !important; }
  #uafe-print-area .mb-2 { margin-bottom: 2px !important; }
  #uafe-print-area .mt-4 { margin-top: 3px !important; }
  #uafe-print-area .mt-3 { margin-top: 3px !important; }
  #uafe-print-area .mt-2 { margin-top: 2px !important; }
  #uafe-print-area .pt-4 { padding-top: 3px !important; }
  #uafe-print-area .gap-8 { gap: 8px !important; }
  #uafe-print-area .gap-6 { gap: 6px !important; }
  #uafe-print-area .gap-4 { gap: 6px !important; }
  #uafe-print-area .gap-3 { gap: 4px !important; }
  #uafe-print-area .gap-2 { gap: 3px !important; }
  #uafe-print-area .p-4 { padding: 5px !important; }
  #uafe-print-area .p-3 { padding: 4px !important; }

  /* ── Campos como ficha "ETIQUETA / valor" ── */
  #uafe-print-area .uafe-field label,
  #uafe-print-area label.uppercase {
    font-size: 6.2pt !important; letter-spacing: .07em !important;
    color: #6b7280 !important; font-weight: 700 !important; margin-bottom: 1px !important;
  }
  /* En el PDF los controles editables se ocultan y su valor se pinta como texto
     que ajusta en varias líneas (ver el efecto beforeprint que llena
     data-print-value). Los checkbox/radio SÍ se mantienen. */
  #uafe-print-area input:not([type='checkbox']):not([type='radio']),
  #uafe-print-area select,
  #uafe-print-area textarea { display: none !important; }
  #uafe-print-area .uafe-pv::after {
    content: attr(data-print-value);
    display: block;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    min-height: 9pt;
    padding-bottom: 1px;
    border-bottom: 1px dotted #9aa1ab;
    font-size: 8pt; font-weight: 600; color: #111827; line-height: 1.25;
  }
  #uafe-print-area .uafe-field { break-inside: avoid; }

  /* Sin iconos en el PDF exportado */
  #uafe-print-area svg { display: none !important; }

  /* Firma / uso notaría: menos espacio vertical */
  #uafe-print-area .mt-16 { margin-top: 6px !important; }
  #uafe-print-area .h-36 { height: 26px !important; }
  #uafe-print-area .h-36 { height: 30px !important; }
  #uafe-print-area .h-28 { height: 112px !important; }
  #uafe-print-area .mt-6 { margin-top: 4px !important; }
  #uafe-print-area .uafe-firma-box { min-height: 112px !important; padding: 8px !important; }

  /* ── 2 columnas para que no quede tan plano ── */
  #uafe-print-area .uafe-body { column-count: 2; column-gap: 10px; }
  #uafe-print-area .uafe-body > * + * { margin-top: 0 !important; }
  #uafe-print-area .uafe-section {
    break-inside: avoid; -webkit-column-break-inside: avoid;
  }
  /* Por defecto los grids internos se apilan en la columna angosta */
  #uafe-print-area .uafe-body .grid { display: block !important; }
  #uafe-print-area .uafe-body .grid > * { margin-bottom: 4px !important; }
  #uafe-print-area .uafe-body .grid > *:last-child { margin-bottom: 0 !important; }

  /* Secciones 1, 2 y 5: tabla de doble columna (mejor uso del espacio) */
  #uafe-print-area .uafe-section:nth-of-type(1) .grid,
  #uafe-print-area .uafe-section:nth-of-type(2) .grid,
  #uafe-print-area .uafe-section:nth-of-type(5) .grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 4px 10px !important;
  }
  #uafe-print-area .uafe-section:nth-of-type(1) .grid > *,
  #uafe-print-area .uafe-section:nth-of-type(2) .grid > *,
  #uafe-print-area .uafe-section:nth-of-type(5) .grid > * { margin-bottom: 0 !important; }
  #uafe-print-area .uafe-section:nth-of-type(1) .md\\:col-span-2,
  #uafe-print-area .uafe-section:nth-of-type(2) .md\\:col-span-2 { grid-column: 1 / -1 !important; }
  /* Sección 5: los campos anchos (3/6) ocupan toda la fila; los de 2 quedan en pares */
  #uafe-print-area .uafe-section:nth-of-type(5) [class*="md:col-span-3"],
  #uafe-print-area .uafe-section:nth-of-type(5) [class*="md:col-span-6"] { grid-column: 1 / -1 !important; }

  /* La sección compareciente puede repartirse entre columnas */
  #uafe-print-area .uafe-section:nth-of-type(2) { break-inside: auto; }

  /* Declaración, uso notaría y comprobantes: ancho completo */
  #uafe-print-area .uafe-section:nth-of-type(7),
  #uafe-print-area .uafe-section:nth-of-type(8),
  #uafe-print-area .uafe-comprobantes { column-span: all; -webkit-column-span: all; }
  #uafe-print-area .uafe-section:nth-of-type(8) .grid {
    display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important;
  }

  /* ── Pie de página (se repite en cada hoja) ── */
  .uafe-print-footer {
    display: block !important; position: fixed; bottom: 0; left: 0; right: 0;
    text-align: center; font-size: 6pt; color: #8a8f99;
    padding: 3px 0; border-top: 1px solid #d6d9e0; background: #fff;
  }

  /* ── Anexo de comprobantes: hoja nueva ── */
  .uafe-comprobantes { break-before: page; page-break-before: always; }
  #uafe-print-area .uafe-comprobantes .grid {
    display: grid !important; grid-template-columns: repeat(3, 1fr) !important;
  }
  .uafe-comprobante { break-inside: avoid; page-break-inside: avoid; }
  .uafe-comprobante img {
    max-height: 118mm !important; width: auto !important;
    margin: 0 auto !important; object-fit: contain !important;
  }
}
`;

interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, children, className }: FieldProps) {
  return (
    <div className={cn("uafe-field", className)}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

interface UafeFormProps {
  initial?: UafeFormData;
  readOnly?: boolean;
  submitting?: boolean;
  headerNote?: string;
  onSave?: (data: UafeFormData) => void;
  /** Id del registro ya guardado en `/uafe-forms`. Sin esto los comprobantes
   *  no se pueden subir (el endpoint de comprobantes requiere un id existente). */
  uafeFormId?: string;
  /** Comprobantes ya subidos (URLs firmadas) para este registro. */
  comprobantes?: UafeComprobante[];
  /** Se dispara cuando se sube o borra un comprobante, para que el padre
   *  mantenga sincronizado su propio estado del registro. */
  onComprobantesChange?: (list: UafeComprobante[]) => void;
}

export function UafeForm({
  initial,
  readOnly = false,
  submitting = false,
  headerNote,
  onSave,
  uafeFormId,
  comprobantes: initialComprobantes,
  onComprobantesChange,
}: UafeFormProps) {
  const [d, setD] = useState<UafeFormData>(() => {
    // Normaliza envíos antiguos (campos nuevos / renombrados).
    const base = { ...emptyUafeData(), ...(initial ?? {}) } as UafeFormData & {
      matrizadorProtocolo?: boolean;
      matrizadorDiligencial?: boolean;
    };
    return {
      ...base,
      moneda: base.moneda || "USD",
      fechaPago: base.fechaPago ?? "",
      nivelRiesgo: base.nivelRiesgo ?? "",
      matrizadorTipo:
        base.matrizadorTipo ||
        (base.matrizadorProtocolo
          ? "protocolo"
          : base.matrizadorDiligencial
            ? "diligencial"
            : ""),
    };
  });
  const [comprobantes, setComprobantes] = useState<UafeComprobante[]>(initialComprobantes ?? []);
  const [comprobanteError, setComprobanteError] = useState("");
  const [comprobanteUploading, setComprobanteUploading] = useState(false);

  const generado = new Date().toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const set = <K extends keyof UafeFormData>(key: K, value: UafeFormData[K]) =>
    setD((prev) => ({ ...prev, [key]: value }));

  // Antes de imprimir: vuelca el valor de cada control a `data-print-value` del
  // contenedor `.uafe-field` (o del padre directo). El CSS de impresión oculta
  // el control y pinta ese texto en varias líneas, así los valores largos no se
  // recortan ni desbordan.
  useEffect(() => {
    const sync = () => {
      const root = document.getElementById("uafe-print-area");
      if (!root) return;
      const controls = root.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input:not([type='checkbox']):not([type='radio']), select, textarea");
      controls.forEach((el) => {
        let text = "";
        if (el instanceof HTMLSelectElement) {
          text = (el.selectedOptions[0]?.text ?? "").trim();
          if (/^seleccione/i.test(text) || /^--/.test(text)) text = "";
          else text = text.toLocaleUpperCase("es");
        } else if (el.type === "date" && el.value) {
          const [y, m, dd] = el.value.split("-");
          text = dd && m && y ? `${dd}/${m}/${y}` : el.value;
        } else {
          text = (el.value ?? "").trim();
        }
        const host = (el.closest(".uafe-field") as HTMLElement | null) ?? el.parentElement;
        if (!host) return;
        host.classList.add("uafe-pv");
        host.setAttribute("data-print-value", text);
      });
    };
    window.addEventListener("beforeprint", sync);
    const mql = window.matchMedia?.("print");
    const onMql = (e: MediaQueryListEvent) => { if (e.matches) sync(); };
    mql?.addEventListener?.("change", onMql);
    return () => {
      window.removeEventListener("beforeprint", sync);
      mql?.removeEventListener?.("change", onMql);
    };
  }, []);

  const addComprobantes = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setComprobanteError("");
    if (!uafeFormId) {
      setComprobanteError("Guarda el formulario primero para poder adjuntar comprobantes.");
      return;
    }
    const room = MAX_COMPROBANTES - comprobantes.length;
    if (room <= 0) {
      setComprobanteError(`Máximo ${MAX_COMPROBANTES} comprobantes.`);
      return;
    }
    const all = Array.from(files);
    const valid: File[] = [];
    for (const f of all) {
      if (!/^image\/(jpe?g|png)$/.test(f.type)) {
        setComprobanteError("Solo se aceptan imágenes (JPG o PNG).");
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        setComprobanteError("Cada imagen debe pesar máximo 10MB.");
        continue;
      }
      valid.push(f);
    }
    const picked = valid.slice(0, room);
    if (picked.length === 0) return;

    setComprobanteUploading(true);
    try {
      const uploaded = await uafeFormsService.uploadComprobantes(uafeFormId, picked);
      const next = [...comprobantes, ...uploaded];
      setComprobantes(next);
      onComprobantesChange?.(next);
      if (all.length > room) {
        setComprobanteError(`Solo se agregaron ${room}: el máximo es ${MAX_COMPROBANTES}.`);
      }
    } catch {
      setComprobanteError("No se pudo subir el comprobante. Intenta de nuevo.");
    } finally {
      setComprobanteUploading(false);
    }
  };

  const removeComprobante = async (item: UafeComprobante) => {
    if (!uafeFormId) return;
    setComprobanteError("");
    try {
      await uafeFormsService.deleteComprobante(uafeFormId, item.id);
      const next = comprobantes.filter((c) => c.id !== item.id);
      setComprobantes(next);
      onComprobantesChange?.(next);
    } catch {
      setComprobanteError("No se pudo eliminar el comprobante.");
    }
  };

  const setCuenta = (
    which: "cuentaOrigen" | "cuentaDestino",
    key: keyof UafeFormData["cuentaOrigen"],
    value: string
  ) => setD((prev) => ({ ...prev, [which]: { ...prev[which], [key]: value } }));

  // ── Guardas de entrada ────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearErr = (k: string) =>
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));

  type StrKey = {
    [K in keyof UafeFormData]: UafeFormData[K] extends string ? K : never;
  }[keyof UafeFormData];

  const setText = (key: StrKey, raw: string, max = TXT_MAX) => {
    set(key, cleanText(raw, { max, upper: true }) as UafeFormData[StrKey]);
    clearErr(key);
  };
  const setEmail = (raw: string) => {
    set("email", cleanText(raw, { email: true, max: 120 }));
    clearErr("email");
  };
  const setDigits = (key: StrKey, raw: string, max: number) => {
    set(key, digitsOnly(raw, max) as UafeFormData[StrKey]);
    clearErr(key);
  };
  const setPhone = (raw: string) => {
    set("telefono", cleanPhone(raw));
    clearErr("telefono");
  };
  const setIdField = (key: "numeroId" | "repNumeroId", tipo: string, raw: string) => {
    const val =
      tipo === "pasaporte"
        ? cleanText(raw, { max: 20, upper: true }).replace(/[^A-Z0-9]/g, "")
        : digitsOnly(raw, 13);
    set(key, val);
    clearErr(key);
  };
  const setMoney = (key: "cuantia" | "avaluo", raw: string) => {
    set(key, cleanMoney(raw));
    clearErr(key);
  };
  const setCuentaText = (
    which: "cuentaOrigen" | "cuentaDestino",
    key: keyof UafeFormData["cuentaOrigen"],
    raw: string
  ) => {
    setCuenta(
      which,
      key,
      key === "numero" ? digitsOnly(raw, 30) : cleanText(raw, { max: TXT_MAX, upper: true })
    );
    clearErr(`${which}.${key}`);
  };

  const guardKeys = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA") return;
    const isEmail = (t as HTMLInputElement).type === "email";
    if (e.key.length === 1 && isBlockedKey(e.key, isEmail)) e.preventDefault();
  };

  const fieldErr = (k: string) =>
    errors[k] ? (
      <p className="uafe-no-print mt-1 text-xs text-destructive">{errors[k]}</p>
    ) : null;

  const isNatural = d.tipoPersona === "natural";
  const showConyuge = d.estadoCivil === "casado" || d.estadoCivil === "union_libre";
  const showRepresentante = d.repAplica || !isNatural;
  const showBienDetalle = d.tipoBien !== "ninguno" && d.tipoBien !== "";
  const showOrigenDetalle = d.origenFondos === "otro";
  const showTrazabilidad =
    d.formaPago === "transferencia" ||
    d.formaPago === "cheque_certificado" ||
    d.formaPago === "cheque_personal";
  const showTercero = showTrazabilidad && d.terceroInterviene;
  const showPepDetalle = d.esPep === "si";
  const showPepAsociado = showPepDetalle && d.pepTieneRelacion;

  const dis = readOnly;

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    const req = (k: StrKey, label: string) => {
      if (!String(d[k] ?? "").trim()) e[k] = `${label} es obligatorio`;
    };

    // 1. Trámite
    req("lugar", "El lugar");
    req("fecha", "La fecha");
    req("hora", "La hora");
    req("tipoTramite", "El tipo de trámite");
    req("actoContrato", "El acto o contrato");
    req("rolCompareciente", "El rol del compareciente");
    if (d.fecha && d.fecha > todayISO()) e.fecha = "La fecha no puede ser futura";

    // 2. Compareciente
    req("nombres", isNatural ? "El nombre" : "La razón social");
    req("numeroId", "El número de identificación");
    if (d.numeroId) {
      if (d.tipoId === "pasaporte") {
        if (!/^[a-zA-Z0-9]{5,20}$/.test(d.numeroId))
          e.numeroId = "Pasaporte inválido (5 a 20 caracteres alfanuméricos)";
      } else if (!isValidCedulaOrRuc(d.numeroId)) {
        e.numeroId = "Cédula: 10 dígitos · RUC: 13 dígitos";
      }
    }
    req("nacionalidad", "La nacionalidad");
    req("direccion", "La dirección");
    req("telefono", "El teléfono");
    if (d.telefono && !isValidPhone(d.telefono))
      e.telefono = "Teléfono inválido (7 a 13 dígitos)";
    req("email", "El correo electrónico");
    if (d.email && !isValidEmail(d.email))
      e.email = "Correo electrónico inválido";
    if (isNatural && (d.estadoCivil === "casado" || d.estadoCivil === "union_libre")) {
      req("conyugeNombres", "El nombre del cónyuge/conviviente");
      req("conyugeId", "La identificación del cónyuge");
    }

    // 3. Representante
    if (d.repAplica || !isNatural) {
      req("repNombres", "El nombre del representante");
      req("repNumeroId", "La identificación del representante");
    }

    // 4. Bien
    if (d.tipoBien && d.tipoBien !== "ninguno") req("descripcionBien", "La descripción del bien");

    // 5. Económico
    const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
    if (d.cuantia.trim() === "") e.cuantia = "La cuantía es obligatoria";
    else if (!(num(d.cuantia) >= 0) || num(d.cuantia) > MONTO_MAX)
      e.cuantia = "Monto inválido";
    if (d.avaluo.trim() !== "" && (!(num(d.avaluo) >= 0) || num(d.avaluo) > MONTO_MAX))
      e.avaluo = "Monto inválido";
    req("origenFondos", "El origen de los fondos");
    if (d.origenFondos === "otro") req("origenDetalle", "El detalle del origen");
    req("formaPago", "La forma de pago");
    if (d.fechaPago && d.fechaPago > todayISO()) e.fechaPago = "La fecha no puede ser futura";
    if (showTrazabilidad) {
      if (!d.cuentaOrigen.institucion.trim())
        e["cuentaOrigen.institucion"] = "Institución de la cuenta origen requerida";
      if (!d.cuentaOrigen.numero.trim())
        e["cuentaOrigen.numero"] = "Número de cuenta/cheque requerido";
    }
    if (showTercero) {
      req("terceroNombre", "El nombre del tercero");
      req("terceroId", "La identificación del tercero");
    }

    // 6. PEP
    if (d.esPep === "si") {
      req("pepCargo", "El cargo de la PEP");
      req("pepFuncion", "La función de la PEP");
      if (d.pepTieneRelacion) req("pepAsociadoNombres", "El nombre del asociado PEP");
    }

    // 8. Uso notaría
    req("matrizadorTipo", "El tipo de trámite");
    req("matrizadorNombre", "El nombre del matrizador");
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = document.querySelector<HTMLElement>(".uafe-field .border-destructive, [data-uafe-err]");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onSave?.(d);
  };

  return (
    <form onSubmit={handleSubmit} onKeyDownCapture={guardKeys} className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: SECTION_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Barra de acciones */}
      <div className="uafe-no-print flex flex-wrap items-center justify-end gap-2">
        {/* Nivel de alerta / riesgo — uso interno, NO se imprime */}
        <div
          className={cn(
            "mr-auto flex items-center gap-2 rounded-lg border px-3 py-1.5",
            RIESGO[d.nivelRiesgo].cls
          )}
        >
          <span className="text-[11px] font-bold uppercase tracking-wide">
            Nivel de alerta / riesgo
          </span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground uppercase"
            value={d.nivelRiesgo}
            disabled={dis}
            onChange={(e) =>
              set("nivelRiesgo", e.target.value as UafeFormData["nivelRiesgo"])
            }
          >
            <option value="">Sin evaluar</option>
            <option value="bajo">Bajo</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
            <option value="critico">Crítico</option>
          </select>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              RIESGO[d.nivelRiesgo].cls
            )}
          >
            {RIESGO[d.nivelRiesgo].label}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => window.print()}
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir / Guardar PDF
        </Button>
        {!readOnly && (
          <Button type="submit" className="cursor-pointer" disabled={submitting}>
            <Save className="w-4 h-4 mr-2" />
            {submitting ? "Guardando..." : "Guardar formulario"}
          </Button>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="uafe-no-print rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Hay {Object.keys(errors).length} campo(s) con errores. Revisa los mensajes en rojo
          antes de guardar.
        </div>
      )}

      <div
        id="uafe-print-area"
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Encabezado — membrete oficial */}
        <div className="uafe-header border-b border-border bg-muted/40 p-6 text-center">
          <p className="uafe-pais">República del Ecuador</p>
          <p className="uafe-notaria">Notaría Pública Primera — Cantón Esmeraldas</p>
          <h1 className="mt-2 text-xl md:text-2xl font-extrabold uppercase tracking-wide">
            Política de la Debida Diligencia
          </h1>
          <h2 className="text-lg font-bold text-muted-foreground">Conozca a su Cliente — UAFE</h2>
          {headerNote && (
            <p className="mt-3 text-xs font-semibold text-primary">{headerNote}</p>
          )}
        </div>

        <div className="uafe-body p-6 space-y-8">
          {/* 1. TRÁMITE */}
          <section className="uafe-section">
            <h3 className={sectionTitleCls}>Información general del trámite</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Lugar">
                <input
                  className={inputCls}
                  value={d.lugar}
                  disabled={dis}
                  onChange={(e) => setText("lugar", e.target.value, 80)}
                />
                {fieldErr("lugar")}
              </Field>
              <Field label="Fecha">
                <input
                  type="date"
                  className={inputCls}
                  value={d.fecha}
                  disabled={dis}
                  onChange={(e) => { set("fecha", e.target.value); clearErr("fecha"); }}
                />
                {fieldErr("fecha")}
              </Field>
              <Field label="Hora">
                <input
                  type="time"
                  className={inputCls}
                  value={d.hora}
                  disabled={dis}
                  onChange={(e) => { set("hora", e.target.value); clearErr("hora"); }}
                />
                {fieldErr("hora")}
              </Field>
              <Field label="Tipo de trámite">
                <select
                  className={inputCls}
                  value={d.tipoTramite}
                  disabled={dis}
                  onChange={(e) => { set("tipoTramite", e.target.value); clearErr("tipoTramite"); }}
                >
                  <option value="">Seleccione...</option>
                  <option value="protocolo">Protocolo (Escritura Pública)</option>
                  <option value="diligencia">Diligencia Notarial</option>
                </select>
              </Field>
              <Field label="Acto o contrato a celebrar" className="md:col-span-2">
                <select
                  className={inputCls}
                  value={d.actoContrato}
                  disabled={dis}
                  onChange={(e) => { set("actoContrato", e.target.value); clearErr("actoContrato"); }}
                >
                  <option value="">Seleccione el tipo de acto...</option>
                  <optgroup label="Traslaticios de dominio">
                    <option value="compraventa_inmueble">Compraventa de inmueble</option>
                    <option value="compraventa_vehiculo">Compraventa de vehículo/maquinaria</option>
                    <option value="promesa_compraventa">Promesa de compraventa</option>
                    <option value="permuta">Permuta</option>
                    <option value="donacion">Donación</option>
                    <option value="cesion_derechos">Cesión de derechos y acciones</option>
                  </optgroup>
                  <optgroup label="Garantías y créditos">
                    <option value="hipoteca">Constitución de hipoteca</option>
                    <option value="cancelacion_hipoteca">Cancelación de hipoteca</option>
                    <option value="mutuo">Contrato de mutuo (préstamo de dinero)</option>
                    <option value="reconocimiento_deuda">Reconocimiento de deuda</option>
                    <option value="acuerdo_pago">Acuerdo/convenio de pago</option>
                  </optgroup>
                  <optgroup label="Societarios y patrimoniales">
                    <option value="constitucion_compania">Constitución de compañía</option>
                    <option value="aumento_capital">Aumento de capital</option>
                    <option value="fideicomiso">Constitución de fideicomiso</option>
                    <option value="liquidacion_conyugal">Liquidación de sociedad conyugal</option>
                    <option value="adjudicacion_bienes">Adjudicación de bienes</option>
                  </optgroup>
                  <option value="otro">Otro (especificar en observaciones)</option>
                </select>
              </Field>
              <Field label="Rol del compareciente en el acto" className="md:col-span-2">
                <select
                  className={inputCls}
                  value={d.rolCompareciente}
                  disabled={dis}
                  onChange={(e) => { set("rolCompareciente", e.target.value); clearErr("rolCompareciente"); }}
                >
                  <option value="">Seleccione rol...</option>
                  <option value="comprador">Comprador / Adquirente</option>
                  <option value="vendedor">Vendedor / Enajenante</option>
                  <option value="acreedor">Acreedor / Prestamista</option>
                  <option value="deudor">Deudor / Prestatario</option>
                  <option value="cedente">Cedente</option>
                  <option value="cesionario">Cesionario</option>
                  <option value="socio">Socio / Accionista</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
            </div>
          </section>

          {/* 2. COMPARECIENTE */}
          <section className="uafe-section rounded-lg border border-border p-4">
            <h3 className={sectionTitleCls}>Datos del compareciente (cliente)</h3>

            <div className="mb-4 flex flex-wrap gap-6">
              {(["natural", "juridica"] as const).map((tp) => (
                <label key={tp} className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="tipoPersona"
                    checked={d.tipoPersona === tp}
                    disabled={dis}
                    onChange={() =>
                      // Sociedades/empresas: la identificación pasa a RUC automáticamente.
                      setD((prev) => ({
                        ...prev,
                        tipoPersona: tp,
                        tipoId:
                          tp === "juridica"
                            ? "ruc"
                            : prev.tipoId === "ruc"
                              ? "cedula"
                              : prev.tipoId,
                      }))
                    }
                  />
                  {fieldErr("rolCompareciente")}
                  {fieldErr("actoContrato")}
                  {fieldErr("tipoTramite")}
                  {tp === "natural" ? "Persona natural" : "Persona jurídica (empresa/sociedad)"}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Field
                label={isNatural ? "Nombres y apellidos completos" : "Razón social (nombre de la empresa)"}
                className="md:col-span-2"
              >
                <input
                  className={inputCls}
                  value={d.nombres}
                  disabled={dis}
                  onChange={(e) => setText("nombres", e.target.value, 250)}
                />
                {fieldErr("nombres")}
              </Field>
              <Field label="Tipo de identificación">
                <select
                  className={inputCls}
                  value={d.tipoId}
                  disabled={dis || !isNatural}
                  onChange={(e) => set("tipoId", e.target.value)}
                >
                  <option value="cedula">Cédula</option>
                  <option value="pasaporte">Pasaporte</option>
                  <option value="ruc">RUC</option>
                </select>
                {!isNatural && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Persona jurídica: identificación fijada como RUC.
                  </p>
                )}
              </Field>
              <Field label="Número de identificación">
                <input
                  className={inputCls}
                  value={d.numeroId}
                  disabled={dis}
                  onChange={(e) => setIdField("numeroId", d.tipoId, e.target.value)}
                />
                {fieldErr("numeroId")}
              </Field>
              {isNatural && (
                <>
                  <Field label="Nacionalidad">
                    <div className="uafe-no-print">
                      <NacionalidadSelect
                        value={d.nacionalidad}
                        disabled={dis}
                        onChange={(v) => { set("nacionalidad", v); clearErr("nacionalidad"); }}
                        error={errors.nacionalidad}
                      />
                    </div>
                    {/* Espejo para el volcado a PDF (beforeprint lee este input) */}
                    <input
                      type="text"
                      className="hidden"
                      tabIndex={-1}
                      aria-hidden="true"
                      readOnly
                      value={d.nacionalidad}
                    />
                  </Field>
                  <Field label="Género">
                    <select
                      className={inputCls}
                      value={d.genero}
                      disabled={dis}
                      onChange={(e) => { set("genero", e.target.value); clearErr("genero"); }}
                    >
                      <option value="">Seleccione...</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                  </Field>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Field label="Dirección de domicilio / oficina matriz" className="md:col-span-2">
                <input
                  className={inputCls}
                  value={d.direccion}
                  disabled={dis}
                  onChange={(e) => setText("direccion", e.target.value, 200)}
                />
                {fieldErr("direccion")}
              </Field>
              <Field label="Teléfono domicilio / celular">
                <input
                  className={inputCls}
                  value={d.telefono}
                  disabled={dis}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {fieldErr("telefono")}
              </Field>
              <Field label="Correo electrónico" className="md:col-span-2">
                <input
                  type="email"
                  className={inputCls}
                  value={d.email}
                  disabled={dis}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {fieldErr("email")}
              </Field>
              <Field label="Actividad económica principal">
                <input
                  className={inputCls}
                  placeholder="Ej. Comercio, agricultura..."
                  value={d.actividadEconomica}
                  disabled={dis}
                  onChange={(e) => setText("actividadEconomica", e.target.value, 120)}
                />
              </Field>
              {isNatural && (
                <>
                  <Field label="Ocupación, profesión u oficio">
                    <input
                      className={inputCls}
                      value={d.ocupacion}
                      disabled={dis}
                      onChange={(e) => setText("ocupacion", e.target.value, 120)}
                    />
                  </Field>
                  <Field label="Entidad (lugar de trabajo)">
                    <input
                      className={inputCls}
                      value={d.entidadTrabajo}
                      disabled={dis}
                      onChange={(e) => setText("entidadTrabajo", e.target.value, 150)}
                    />
                  </Field>
                  <Field label="Posición / cargo">
                    <input
                      className={inputCls}
                      value={d.cargo}
                      disabled={dis}
                      onChange={(e) => setText("cargo", e.target.value, 120)}
                    />
                  </Field>
                </>
              )}
            </div>

            {isNatural && (
              <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Estado civil">
                  <select
                    className={inputCls}
                    value={d.estadoCivil}
                    disabled={dis}
                    onChange={(e) => { set("estadoCivil", e.target.value); clearErr("estadoCivil"); }}
                  >
                    <option value="soltero">Soltero/a</option>
                    <option value="casado">Casado/a</option>
                    <option value="union_libre">Unión de hecho</option>
                    <option value="divorciado">Divorciado/a</option>
                    <option value="viudo">Viudo/a</option>
                  </select>
                </Field>
                {showConyuge && (
                  <>
                    <Field
                      label="Nombres y apellidos del cónyuge / conviviente"
                      className="md:col-span-2"
                    >
                      <input
                        className={inputCls}
                        value={d.conyugeNombres}
                        disabled={dis}
                        onChange={(e) => setText("conyugeNombres", e.target.value, 250)}
                      />
                      {fieldErr("conyugeNombres")}
                    </Field>
                    <Field label="Identificación del cónyuge">
                      <input
                        className={inputCls}
                        value={d.conyugeId}
                        disabled={dis}
                        onChange={(e) => setDigits("conyugeId", e.target.value, 13)}
                      />
                      {fieldErr("conyugeId")}
                    </Field>
                  </>
                )}
              </div>
            )}
          </section>

          {/* 3. REPRESENTANTE */}
          <section className="uafe-section">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
              <h3 className="text-base font-bold uppercase">
                Representante legal y/o apoderado
              </h3>
              <label className="uafe-no-print inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={d.repAplica}
                  disabled={dis || !isNatural}
                  onChange={(e) => set("repAplica", e.target.checked)}
                />
                Aplica
              </label>
            </div>

            {showRepresentante ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Nombres y apellidos del apoderado/representante" className="md:col-span-2">
                  <input
                    className={inputCls}
                    value={d.repNombres}
                    disabled={dis}
                    onChange={(e) => setText("repNombres", e.target.value, 250)}
                  />
                  {fieldErr("repNombres")}
                </Field>
                <Field label="Tipo identificación">
                  <select
                    className={inputCls}
                    value={d.repTipoId}
                    disabled={dis}
                    onChange={(e) => set("repTipoId", e.target.value)}
                  >
                    <option value="cedula">Cédula</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                </Field>
                <Field label="Número de identificación">
                  <input
                    className={inputCls}
                    value={d.repNumeroId}
                    disabled={dis}
                    onChange={(e) => setIdField("repNumeroId", d.repTipoId, e.target.value)}
                  />
                  {fieldErr("repNumeroId")}
                </Field>
                <Field label="Lugar y fecha de nacimiento" className="md:col-span-2">
                  <input
                    className={inputCls}
                    placeholder="Ciudad, país, fecha"
                    value={d.repLugarFechaNacimiento}
                    disabled={dis}
                    onChange={(e) => setText("repLugarFechaNacimiento", e.target.value, 150)}
                  />
                </Field>
                <Field label="Notaría o consulado donde se otorgó el poder" className="md:col-span-2">
                  <input
                    className={inputCls}
                    value={d.repPoderNotaria}
                    disabled={dis}
                    onChange={(e) => setText("repPoderNotaria", e.target.value, 150)}
                  />
                </Field>
                <Field label="Número de protocolo / fecha">
                  <input
                    className={inputCls}
                    value={d.repPoderProtocoloFecha}
                    disabled={dis}
                    onChange={(e) => setText("repPoderProtocoloFecha", e.target.value, 80)}
                  />
                </Field>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No aplica. Marque “Aplica” para registrar los datos del representante.
              </p>
            )}
          </section>

          {/* 4. BIEN */}
          <section className="uafe-section">
            <h3 className={sectionTitleCls}>Información específica del bien (si aplica)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Tipo de bien">
                <select
                  className={inputCls}
                  value={d.tipoBien}
                  disabled={dis}
                  onChange={(e) => { set("tipoBien", e.target.value); clearErr("tipoBien"); }}
                >
                  <option value="ninguno">No aplica (ej. mutuo, deuda)</option>
                  <optgroup label="Bienes inmuebles">
                    <option value="casa">Casa</option>
                    <option value="departamento">Departamento</option>
                    <option value="terreno">Terreno / Lote</option>
                    <option value="finca">Finca / Hacienda</option>
                    <option value="local">Local comercial</option>
                    <option value="oficina">Oficina</option>
                  </optgroup>
                  <optgroup label="Bienes muebles">
                    <option value="vehiculo">Vehículo liviano</option>
                    <option value="vehiculo_pesado">Vehículo pesado / camión</option>
                    <option value="embarcacion">Embarcación / nave</option>
                    <option value="maquinaria">Maquinaria especial</option>
                  </optgroup>
                </select>
              </Field>
              {showBienDetalle && (
                <Field
                  label="Descripción / especificaciones (ubicación, matrícula, chasis, clave catastral...)"
                  className="md:col-span-3"
                >
                  <input
                    className={inputCls}
                    value={d.descripcionBien}
                    disabled={dis}
                    onChange={(e) => setText("descripcionBien", e.target.value, 500)}
                  />
                  {fieldErr("descripcionBien")}
                </Field>
              )}
            </div>
          </section>

          {/* 5. ECONÓMICO */}
          <section className="uafe-section rounded-lg border border-border p-4">
            <h3 className={sectionTitleCls}>Aspectos económicos y origen de fondos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
              <Field label="Cuantía del contrato (USD)" className="md:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={d.cuantia}
                  disabled={dis}
                  onChange={(e) => setMoney("cuantia", e.target.value)}
                />
                {fieldErr("cuantia")}
              </Field>
              <Field label="Avalúo del bien (USD)" className="md:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={d.avaluo}
                  disabled={dis}
                  onChange={(e) => setMoney("avaluo", e.target.value)}
                />
                {fieldErr("avaluo")}
              </Field>
              <Field label="Tipo de moneda" className="md:col-span-2">
                <div className="uafe-no-print">
                  <ComboBox
                    value={d.moneda || "USD"}
                    onChange={(v) => set("moneda", v || "USD")}
                    options={MONEDAS.map((m) => ({ value: m.codigo, label: m.nombre }))}
                    searchPlaceholder="Buscar moneda..."
                    disabled={dis}
                  />
                </div>
                {/* Espejo para el PDF */}
                <input
                  type="text"
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                  readOnly
                  value={nombreMoneda(d.moneda || "USD")}
                />
              </Field>

              <Field label="Ciudad de pago" className="md:col-span-3">
                <input
                  className={inputCls}
                  value={d.ciudadFechaPago}
                  disabled={dis}
                  onChange={(e) => setText("ciudadFechaPago", e.target.value, 120)}
                />
              </Field>
              <Field label="Fecha de pago" className="md:col-span-3">
                <input
                  type="date"
                  className={inputCls}
                  value={d.fechaPago}
                  disabled={dis}
                  onChange={(e) => { set("fechaPago", e.target.value); clearErr("fechaPago"); }}
                />
                {fieldErr("fechaPago")}
              </Field>

              <Field label="Procedencia u origen de los fondos" className="md:col-span-3">
                <select
                  className={inputCls}
                  value={d.origenFondos}
                  disabled={dis}
                  onChange={(e) => { set("origenFondos", e.target.value); clearErr("origenFondos"); }}
                >
                  <option value="">Seleccione el origen principal...</option>
                  <option value="sueldo">Sueldo / Salarios / Remuneraciones</option>
                  <option value="actividad_comercial">Ingresos por actividad comercial/negocio</option>
                  <option value="honorarios">Honorarios profesionales</option>
                  <option value="ahorros">Ahorros personales</option>
                  <option value="venta_inmueble">Venta de inmueble anterior</option>
                  <option value="venta_vehiculo">Venta de vehículo</option>
                  <option value="credito_bancario">Crédito hipotecario / préstamo bancario</option>
                  <option value="prestamo_privado">Préstamo privado / terceros</option>
                  <option value="herencia">Herencia / legado / donación</option>
                  <option value="jubilacion">Jubilación / pensiones</option>
                  <option value="rentas">Rentas / arrendamientos</option>
                  <option value="dividendos">Dividendos / utilidades de empresas</option>
                  <option value="premios">Lotería / juegos de azar</option>
                  <option value="remesas">Remesas del exterior</option>
                  <option value="otro">Otro (especificar)</option>
                </select>
              </Field>
              <Field label="Forma de pago de la transacción" className="md:col-span-3">
                <select
                  className={inputCls}
                  value={d.formaPago}
                  disabled={dis}
                  onChange={(e) => {
                    const v = e.target.value;
                    set("formaPago", v);
                    // Transferencia o cheque: marca automáticamente el adjunto
                    if (
                      v === "transferencia" ||
                      v === "cheque_certificado" ||
                      v === "cheque_personal"
                    ) {
                      set("adjuntaComprobante", true);
                    }
                  }}
                >
                  <option value="">Seleccione forma de pago...</option>
                  <option value="transferencia">Transferencia bancaria / depósito</option>
                  <option value="cheque_certificado">Cheque certificado / gerencia</option>
                  <option value="cheque_personal">Cheque personal</option>
                  <option value="efectivo">Efectivo (billetes/monedas)</option>
                  <option value="permuta">Permuta (intercambio de bienes)</option>
                  <option value="financiado">Financiado (a plazos)</option>
                  <option value="compensacion">Compensación / cruce de cuentas</option>
                </select>
              </Field>

              {showOrigenDetalle && (
                <Field label="Especifique el origen de los fondos" className="md:col-span-6">
                  <input
                    className={inputCls}
                    value={d.origenDetalle}
                    disabled={dis}
                    onChange={(e) => setText("origenDetalle", e.target.value, 200)}
                  />
                  {fieldErr("origenDetalle")}
                  {fieldErr("origenFondos")}
                </Field>
              )}
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={d.adjuntaComprobante}
                disabled={dis}
                onChange={(e) => set("adjuntaComprobante", e.target.checked)}
              />
              Adjunta comprobante de pago / transferencia
            </label>

            {showTrazabilidad && (
              <div className="mt-4 rounded-lg border border-border p-4">
                <h4 className="text-sm font-bold mb-3">Trazabilidad financiera (cuentas)</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(["cuentaOrigen", "cuentaDestino"] as const).map((which) => (
                    <div key={which} className="rounded border border-border p-3 space-y-2">
                      <h5 className="text-xs font-bold uppercase">
                        {which === "cuentaOrigen"
                          ? "Cuenta origen (quien paga)"
                          : "Cuenta destino (quien recibe)"}
                      </h5>
                      <Field label="Institución financiera">
                        <input
                          className={inputCls}
                          value={d[which].institucion}
                          disabled={dis}
                          onChange={(e) => setCuentaText(which, "institucion", e.target.value)}
                        />
                        {which === "cuentaOrigen" && fieldErr("cuentaOrigen.institucion")}
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Tipo de cuenta">
                          <select
                            className={inputCls}
                            value={d[which].tipoCuenta}
                            disabled={dis}
                            onChange={(e) => setCuenta(which, "tipoCuenta", e.target.value)}
                          >
                            <option value="ahorros">Ahorros</option>
                            <option value="corriente">Corriente</option>
                          </select>
                        </Field>
                        <Field label="Nro. de cuenta / cheque">
                          <input
                            className={inputCls}
                            value={d[which].numero}
                            disabled={dis}
                            onChange={(e) => setCuentaText(which, "numero", e.target.value)}
                          />
                          {which === "cuentaOrigen" && fieldErr("cuentaOrigen.numero")}
                        </Field>
                      </div>
                      <Field label="Titular de la cuenta">
                        <input
                          className={inputCls}
                          value={d[which].titular}
                          disabled={dis}
                          onChange={(e) => setCuentaText(which, "titular", e.target.value)}
                        />
                      </Field>
                    </div>
                  ))}
                </div>

                <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={d.terceroInterviene}
                    disabled={dis}
                    onChange={(e) => set("terceroInterviene", e.target.checked)}
                  />
                  ¿Interviene un tercero en la transferencia? (el titular no es el compareciente)
                </label>

                {showTercero && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 rounded border border-border p-3">
                    <Field label="Motivo de intervención del tercero">
                      <input
                        className={inputCls}
                        value={d.terceroMotivo}
                        disabled={dis}
                        onChange={(e) => setText("terceroMotivo", e.target.value, 200)}
                      />
                    </Field>
                    <Field label="Identificación del tercero">
                      <input
                        className={inputCls}
                        value={d.terceroId}
                        disabled={dis}
                        onChange={(e) => setDigits("terceroId", e.target.value, 13)}
                      />
                      {fieldErr("terceroId")}
                    </Field>
                    <Field label="Nombre completo del tercero">
                      <input
                        className={inputCls}
                        value={d.terceroNombre}
                        disabled={dis}
                        onChange={(e) => setText("terceroNombre", e.target.value, 250)}
                      />
                      {fieldErr("terceroNombre")}
                    </Field>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 6. PEP */}
          <section className="uafe-section rounded-lg border border-border p-4">
            <h3 className={sectionTitleCls}>
              Declaración sobre Personas Expuestas Políticamente (PEP)
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              ¿Ha ocupado en el último año un cargo de elección popular o de alta responsabilidad
              política, pública y/o social, usted o algún familiar hasta el segundo grado de
              consanguinidad o primero de afinidad?
            </p>
            <div className="flex gap-6 mb-2">
              {(["si", "no"] as const).map((v) => (
                <label key={v} className="inline-flex items-center gap-2 text-sm font-bold">
                  <input
                    type="radio"
                    name="esPep"
                    checked={d.esPep === v}
                    disabled={dis}
                    onChange={() => set("esPep", v)}
                  />
                  {v === "si" ? "SÍ" : "NO"}
                </label>
              ))}
            </div>

            {showPepDetalle && (
              <div className="mt-3 rounded border border-border p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Cargo de la PEP">
                    <input
                      className={inputCls}
                      value={d.pepCargo}
                      disabled={dis}
                      onChange={(e) => setText("pepCargo", e.target.value, 150)}
                    />
                    {fieldErr("pepCargo")}
                  </Field>
                  <Field label="Función de la PEP">
                    <input
                      className={inputCls}
                      value={d.pepFuncion}
                      disabled={dis}
                      onChange={(e) => setText("pepFuncion", e.target.value, 200)}
                    />
                    {fieldErr("pepFuncion")}
                  </Field>
                  <Field label="Jerarquía de la PEP">
                    <input
                      className={inputCls}
                      value={d.pepJerarquia}
                      disabled={dis}
                      onChange={(e) => setText("pepJerarquia", e.target.value, 150)}
                    />
                  </Field>
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={d.pepTieneRelacion}
                    disabled={dis}
                    onChange={(e) => set("pepTieneRelacion", e.target.checked)}
                  />
                  ¿Mantiene relaciones comerciales, contractuales, laborales o de asociación con otra
                  PEP?
                </label>
                {showPepAsociado && (
                  <Field label="Nombres del asociado / relacionado" className="mt-2">
                    <input
                      className={inputCls}
                      value={d.pepAsociadoNombres}
                      disabled={dis}
                      onChange={(e) => setText("pepAsociadoNombres", e.target.value, 250)}
                    />
                    {fieldErr("pepAsociadoNombres")}
                  </Field>
                )}
              </div>
            )}
          </section>

          {/* 7. LICITUD DE FONDOS */}
          <section className="uafe-section">
            <h3 className={sectionTitleCls}>Declaración de licitud de fondos</h3>
            <div className="uafe-declara rounded border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">LICITUD DE FONDOS.</strong> Declaro bajo juramento y
              me responsabilizo expresa e irrevocablemente que los datos consignados en el presente
              documento son fidedignos, así como también que los recursos y fondos utilizados en mis
              operaciones y transacciones comerciales, como aquellos valores entregados han tenido,
              tienen y tendrán fuente y origen lícito y permitido por las leyes de Ecuador, y no
              provienen ni se destinarán a ninguna actividad relacionada con la producción, consumo,
              comercialización y tráfico de sustancias estupefacientes y psicotrópicas, o cualquier
              otra actividad tipificada en la ley de prevención, detección y erradicación del delito
              de lavado de activos y del financiamiento de delitos.
              <br />
              <br />
              Eximo a la Notaría Pública Primera del Cantón Esmeraldas, de toda responsabilidad,
              inclusive respecto a terceros, si esta declaración fuese falsa o errónea y, le autorizo
              expresamente para efectos legales el uso del presente documento. Certifico que la
              información antes indicada es correcta y verdadera, por lo tanto se la podrá considerar
              para todos los efectos legales.
            </div>

            <div className="uafe-firma-grid mt-10 flex justify-center">
              <div className="uafe-firma-box w-full max-w-md">
                <div className="uafe-firma-line" />
                <p className="uafe-firma-label">Firma del compareciente / cliente</p>
                <p className="uafe-firma-sub">
                  No. de identificación: {d.numeroId || "________________"}
                </p>
              </div>
            </div>
          </section>

          {/* 8. USO NOTARÍA */}
          <section className="uafe-section rounded-lg border-2 border-border p-4">
            <h3 className="text-center font-black tracking-widest uppercase mb-6">
              Espacio solo para la Notaría Primera de Esmeraldas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <p className="text-[11px] font-bold text-muted-foreground mb-3 uppercase">
                  Revisado por oficial de cumplimiento
                </p>
                <div className="h-24 border border-dashed border-foreground/30 rounded-md w-4/5 mx-auto mb-2" />
                <div className="border-t-2 border-foreground w-4/5 mx-auto pt-2" />
                <p className="text-xs font-bold">Abg. Clever Nazareno Palma</p>
              </div>
              <div className="text-center">
                <div className="mb-4" data-uafe-err={errors.matrizadorTipo ? "" : undefined}>
                  <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase">
                    Tipo de trámite <span className="uafe-no-print text-destructive">*</span>
                  </p>
                  <div className="flex justify-center gap-5 text-sm font-bold">
                    {(["protocolo", "diligencial"] as const).map((t) => (
                      <label key={t} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={d.matrizadorTipo === t}
                          disabled={dis}
                          onChange={(e) => {
                            set("matrizadorTipo", e.target.checked ? t : "");
                            clearErr("matrizadorTipo");
                          }}
                        />
                        {t === "protocolo" ? "Protocolo" : "Diligencial"}
                      </label>
                    ))}
                  </div>
                  {fieldErr("matrizadorTipo")}
                </div>
                <div className="h-24 border border-dashed border-foreground/30 rounded-md w-4/5 mx-auto mb-2 mt-2" />
                <div className="border-t-2 border-foreground w-4/5 mx-auto pt-2" />
                <p className="text-xs font-bold">Firma / datos del matrizador</p>
                <div className="mt-2">
                  <p
                    className="text-center text-sm font-bold uppercase"
                    title="Se completa con el matrizador que generó el formulario"
                  >
                    {d.matrizadorNombre || "—"}
                  </p>
                  {fieldErr("matrizadorNombre")}
                </div>
              </div>
            </div>
            <p className="mt-6 text-[11px] text-muted-foreground italic text-center">
              Nota: adjuntar copias legibles del documento de identificación y papeleta de votación
              vigente.
            </p>
          </section>

          {/* 9. COMPROBANTES (imágenes anexas al PDF) */}
          <section
            className={cn(
              "uafe-section rounded-lg border border-border p-4",
              // Sólo salta de página / se imprime si hay imágenes; si está vacía
              // no debe generar una hoja en blanco en el PDF.
              comprobantes.length > 0 ? "uafe-comprobantes" : "uafe-no-print"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 mb-4">
              <h3 className="text-base font-bold uppercase">
                Comprobantes de pago (anexos)
              </h3>
              <span className="text-xs font-semibold text-muted-foreground">
                {comprobantes.length}/{MAX_COMPROBANTES} imágenes
              </span>
            </div>

            {!dis && !uafeFormId && (
              <p className="uafe-no-print mb-4 text-xs text-muted-foreground rounded-md border border-dashed border-border p-3">
                Guarda el formulario para poder adjuntar comprobantes.
              </p>
            )}

            {!dis && uafeFormId && (
              <div className="uafe-no-print mb-4">
                <label
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm font-medium",
                    comprobantes.length >= MAX_COMPROBANTES || comprobanteUploading
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <ImagePlus className="w-4 h-4" />
                  {comprobanteUploading ? "Subiendo..." : "Agregar comprobantes"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    className="hidden"
                    disabled={comprobantes.length >= MAX_COMPROBANTES || comprobanteUploading}
                    onChange={(e) => {
                      void addComprobantes(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Entre 1 y {MAX_COMPROBANTES} fotos (JPG o PNG, máx. 10MB c/u). Se anexan al final
                  del PDF, en hojas aparte.
                </p>
                {comprobanteError && (
                  <p className="mt-1 text-[11px] text-destructive">{comprobanteError}</p>
                )}
              </div>
            )}

            {comprobantes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {comprobantes.map((c, i) => (
                  <figure
                    key={c.id}
                    className="uafe-comprobante relative rounded-md border border-border overflow-hidden bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.url}
                      alt={`Comprobante ${i + 1}`}
                      className="w-full h-44 object-contain bg-white"
                    />
                    <figcaption className="border-t border-border bg-muted/40 py-1 text-center text-[10px] font-medium">
                      Comprobante {i + 1}
                    </figcaption>
                    {!dis && (
                      <button
                        type="button"
                        aria-label={`Quitar comprobante ${i + 1}`}
                        onClick={() => removeComprobante(c)}
                        className="uafe-no-print absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </figure>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin comprobantes adjuntos.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Pie de página — sólo se ve al imprimir; se repite en cada hoja */}
      <div className="uafe-print-footer" aria-hidden="true">
        Sistema Notarial · Notaría Pública Primera de Esmeraldas · Documento generado el {generado}
      </div>
    </form>
  );
}
