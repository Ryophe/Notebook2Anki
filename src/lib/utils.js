// NotebookLM2Anki - Shared utility functions

const ID_MIN = 2 ** 30;
const ID_RANGE = 2 ** 30;

/** Generate a positive 31-bit ID accepted by Anki. */
export function generateId() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return ID_MIN + (value[0] % ID_RANGE);
  }
  return ID_MIN + Math.floor(Math.random() * ID_RANGE);
}

/** Convert NotebookLM rich text into safe, Notebook-like Anki HTML. */
export function cleanMath(value) {
  const text = String(value ?? "").replace(/\r\n?/g, "\n");
  const tokens = [];

  const tokenized = text
    .replace(/\$\$(.*?)\$\$/gs, (_, body) => {
      const index = tokens.push(`\\[\${body}\\]`) - 1;
      return `@@NBMATH\${index}@@`;
    })
    .replace(/\$((?:[^$]|\\\$)+?)\$/g, (_, body) => {
      const index = tokens.push(`\\(\${body}\\)`) - 1;
      return `@@NBMATH\${index}@@`;
    })
    .replace(/\`([^\`]+)\`/g, (_, code) => {
      const index = tokens.push(`<code class="latex-snippet">\${escapeHtml(code)}</code>`) - 1;
      return `@@NBCODE\${index}@@`;
    });

  const safe = escapeHtml(tokenized);
  const lines = safe.split("\n");
  const blocks = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join("<br>");
    if (content.trim()) blocks.push(`<p>\${content}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    blocks.push(`<\${listType}>\${listItems.map(item => `<li>\${item}</li>`).join("")}</\${listType}>`);
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = trimmed.match(/^ -?\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const nextType = bullet ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push(bullet ? bullet[1] : numbered[1]);
      continue;
    }

    if (listType) flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  let html = blocks.join("");
  tokens.forEach((token, index) => {
    html = html
      .replace(`@@NBMATH\${index}@@`, token)
      .replace(`@@NBCODE\${index}@@`, token);
  });
  return html;
}

/** Escape a value as one RFC 4180-compatible CSV cell. */
export function escapeCSV(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Remove accidental Anki hierarchy markers and unsafe control characters. */
export function sanitizeDeckName(value, fallback = "Unknown Notebook") {
  const name = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/::/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
  return name || fallback;
}

/** Convert user-provided text to a safe download filename stem. */
export function sanitizeFilename(value, fallback = "notebooklm-export") {
  const filename = String(value ?? "")
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  return filename || fallback;
}

/** Start a browser download and release its object URL after navigation begins. */
export function downloadFile(content, filename, mimeType = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
