import sanitizeHtml from "sanitize-html";

/**
 * Utilidades de HTML compartidas. Isomórficas: `sanitize-html` usa su propio
 * parser, así que funcionan igual en el navegador y en los route handlers
 * (Node) sin `jsdom` ni `window`.
 *
 * Dos casos:
 *  - `stripHtml`  → destino de TEXTO PLANO (listado de notificaciones, asunto,
 *    email en texto, push). Quita todas las etiquetas y decodifica entidades.
 *  - `sanitizeRichHtml` → destino que SÍ renderiza HTML (email HTML, vista de
 *    detalle con `dangerouslySetInnerHTML`). Deja un subconjunto seguro.
 */

const RICH_ALLOWED_TAGS = [
  "p", "br", "hr", "span", "div",
  "b", "strong", "i", "em", "u", "s", "mark", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a",
  "table", "thead", "tbody", "tr", "th", "td",
];

/**
 * Quita TODO el HTML y devuelve texto plano limpio.
 * Colapsa espacios y saltos de línea repetidos.
 *
 * @param input     HTML o texto.
 * @param keepUrls  si `true`, los `<a href>` se conservan como "texto (url)".
 */
export function stripHtml(input: string | null | undefined, keepUrls = false): string {
  if (!input) return "";

  // El backend a veces guarda el HTML ya escapado (`&lt;h1&gt;…`). Si llega así
  // hay que decodificarlo antes de poder quitar las etiquetas.
  const html = unescapeIfEscaped(input);

  // Pista de espacios: sin esto `<p>a</p><p>b</p>` colapsa a "ab". No es
  // parsing —solo marca los límites de bloque antes de que sanitize-html borre
  // las etiquetas.
  const spaced = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|pre|section|article)>/gi, " $&");

  const cleaned = sanitizeHtml(spaced, {
    allowedTags: [],
    allowedAttributes: {},
    // Sin etiquetas permitidas, el texto de <a> se mantiene; para conservar la
    // URL la anexamos antes de borrar la etiqueta.
    transformTags: keepUrls
      ? {
          a: (_tagName, attribs) => ({
            tagName: "a",
            attribs,
            text: attribs.href ? ` ${attribs.href} ` : "",
          }),
        }
      : {},
    // `sanitize-html` ya elimina el CONTENIDO de estas, no solo la etiqueta.
    nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  });

  return decodeEntities(cleaned).replace(/\s+/g, " ").trim();
}

/**
 * Devuelve un HTML seguro para renderizar (email HTML o `dangerouslySetInnerHTML`).
 * Elimina `<script>`, `<style>`, manejadores `on*`, `javascript:` y etiquetas
 * fuera de la lista blanca.
 */
export function sanitizeRichHtml(input: string | null | undefined): string {
  if (!input) return "";

  // Si el valor llega escapado (`&lt;p&gt;…` sin ningún `<` real), decodificarlo
  // una vez para que sí se renderice como HTML en vez de mostrarse literal.
  return sanitizeHtml(unescapeIfEscaped(input), {
    allowedTags: RICH_ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      "*": ["style"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedStyles: {
      "*": {
        "text-align": [/^left$|^right$|^center$|^justify$/],
        "font-weight": [/^bold$|^\d{3}$/],
        "font-style": [/^italic$|^normal$/],
        "text-decoration": [/^underline$|^line-through$|^none$/],
      },
    },
    transformTags: {
      // Todo enlace se abre fuera y sin fugar el referrer.
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}

/**
 * Si la cadena parece HTML escapado —tiene `&lt;`/`&gt;` y ningún `<` real—
 * la decodifica una vez. Si ya trae `<` de verdad, se deja igual (no re-decodifica
 * para no romper contenido que use `&lt;` a propósito).
 */
function unescapeIfEscaped(str: string): string {
  const hasEscapedTag = /&lt;\/?[a-z][\s\S]*?&gt;/i.test(str);
  const hasRealTag = /<\/?[a-z][\s\S]*?>/i.test(str);
  return hasEscapedTag && !hasRealTag ? decodeEntities(str) : str;
}

/** Decodifica las entidades HTML básicas que deja `stripHtml`. */
function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");
}
