// NotebookLM2Anki - Flashcard note type

export const FLASHCARD_MODEL_ID = 1609234567891;
export const FLASHCARD_MODEL_NAME = "NotebookLM Flashcard";
export const FLASHCARD_FIELDS = Object.freeze([
  Object.freeze({ name: "Front" }),
  Object.freeze({ name: "Back" })
]);

export const FLASHCARD_STYLING = `
html {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  box-sizing: border-box;
}
html, body, .card, .flashcard-shell, .front-section, .back-section, .front-repeat,
.front-section p, .back-section p, .front-repeat p,
.front-section li, .back-section li, .front-repeat li {
  box-sizing: border-box;
}
body {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin: 0;
  overflow-x: hidden !important;
  background: #171918;
  color: #eef2ed;
  font-family: "Segoe UI Variable", "Aptos", "Segoe UI", system-ui, sans-serif;
}
.card {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0;
  padding: 24px 12px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  box-sizing: border-box;
  min-width: 0;
  overflow-x: hidden;
  overscroll-behavior-x: none;
  background: radial-gradient(circle at 50% -20%, rgba(168, 199, 250, .12), transparent 44%), #171918;
  font-size: 18px;
  line-height: 1.65;
  text-align: left;
}
.flashcard-shell {
  width: 100%;
  max-width: 1200px;
  min-width: 0;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 40px);
  box-sizing: border-box;
  border: 1px solid #3b423c;
  border-radius: 18px 18px 18px 6px;
  background: #1f2320;
  box-shadow: 0 18px 50px rgba(7, 10, 8, .3);
  overflow: hidden;
}
.card-label {
  margin-bottom: 16px;
  color: #8e998f;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.front-section,
.back-section,
.front-repeat {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.front-section {
  color: #f5f7f4;
  font-size: clamp(1.25rem, 4vw, 1.55rem);
  font-weight: 620;
  line-height: 1.45;
  letter-spacing: -.018em;
  overflow-wrap: anywhere;
  text-wrap: pretty;
  word-break: normal;
}
.front-section p,
.back-section p,
.front-repeat p {
  margin: 0 0 1em;
}
.front-section ul,
.front-section ol,
.back-section ul,
.back-section ol,
.front-repeat ul,
.front-repeat ol {
  margin: 0 0 1em;
  padding-left: 1.45em;
}
.front-section li,
.back-section li,
.front-repeat li {
  margin: .28em 0;
}
.answer-divider {
  height: 1px;
  margin: 24px 0 16px;
  background: #3b423c;
}
.back-section {
  min-width: 0;
  color: #c7dcff;
  font-size: clamp(1.08rem, 3.3vw, 1.3rem);
  line-height: 1.6;
  overflow-wrap: anywhere;
  text-wrap: pretty;
  word-break: normal;
}
.front-section mjx-container:not([display="true"]),
.back-section mjx-container:not([display="true"]),
.front-repeat mjx-container:not([display="true"]),
.front-section .MathJax:not(.MathJax_Display),
.back-section .MathJax:not(.MathJax_Display),
.front-repeat .MathJax:not(.MathJax_Display) {
  display: inline-block !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow-wrap: anywhere !important;
  white-space: normal !important;
  vertical-align: baseline;
}
.front-section mjx-container[display="true"],
.back-section mjx-container[display="true"],
.front-repeat mjx-container[display="true"],
.front-section .MathJax_Display,
.back-section .MathJax_Display,
.front-repeat .MathJax_Display,
.front-section .katex-display,
.back-section .katex-display,
.front-repeat .katex-display {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-bottom: 4px !important;
}
.front-section mjx-container[display="true"] > svg,
.back-section mjx-container[display="true"] > svg,
.front-repeat mjx-container[display="true"] > svg {
  max-width: none !important;
}
.front-section .MathJax_Display > .MathJax,
.back-section .MathJax_Display > .MathJax,
.front-repeat .MathJax_Display > .MathJax {
  max-width: none !important;
}
.latex-snippet,
code {
  padding: .12em .36em;
  border: 1px solid #454d46;
  border-radius: 5px;
  background: #292e2a;
  color: #f0cf83;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: .9em;
}
.front-section > :first-child,
.front-repeat > :first-child,
.back-section > :first-child { margin-top: 0; }
.front-section > :last-child,
.front-repeat > :last-child,
.back-section > :last-child { margin-bottom: 0; }
img { display: block; max-width: 100%; height: auto; border-radius: 10px; }
a { color: #a8c7fa; text-underline-offset: .2em; }
@media (max-width: 700px) {
  .card {
    width: 100%;
    min-width: 0;
    padding: 10px 6px;
    font-size: 16px;
    line-height: 1.55;
  }

  .flashcard-shell {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding: 18px 14px;
    border-radius: 14px 14px 14px 5px;
  }

  .card-label {
    margin-bottom: 12px;
    font-size: 10px;
  }

  .front-section {
    width: 100%;
    font-size: clamp(1.05rem, 5.2vw, 1.3rem);
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .back-section {
    width: 100%;
    font-size: clamp(1rem, 4.6vw, 1.18rem);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .answer-divider {
    margin: 18px 0 12px;
  }

  .front-section mjx-container[display="true"],
  .back-section mjx-container[display="true"],
  .front-repeat mjx-container[display="true"],
  .front-section .MathJax_Display,
  .back-section .MathJax_Display,
  .front-repeat .MathJax_Display {
    max-width: 100%;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  .front-section img,
  .back-section img,
  .front-repeat img {
    max-width: 100%;
  }
}

@media (max-width: 380px) {
  .flashcard-shell {
    padding: 16px 12px;
  }

  .front-section {
    font-size: 1.02rem;
  }

  .back-section {
    font-size: .98rem;
  }
}
`;

export const FLASHCARD_FRONT_TEMPLATE = `<div class="flashcard-shell">
  <div class="card-label">Question</div>
  <div class="front-section" id="front-content">{{Front}}</div>
</div>
${createMathScript(["front-content"])}`;

export const FLASHCARD_BACK_TEMPLATE = `<div class="flashcard-shell">
  <div class="card-label">Question</div>
  <div class="front-repeat" id="back-front">{{Front}}</div>
  <div class="answer-divider" aria-hidden="true"></div>
  <div class="card-label">Answer</div>
  <div class="back-section" id="back-content">{{Back}}</div>
</div>
${createMathScript(["back-front", "back-content"])}`;

export function getFlashcardModel() {
  return {
    name: FLASHCARD_MODEL_NAME,
    id: FLASHCARD_MODEL_ID.toString(),
    flds: FLASHCARD_FIELDS,
    req: [[0, "all", [0]]],
    tmpls: [{
      name: "Flashcard",
      qfmt: FLASHCARD_FRONT_TEMPLATE,
      afmt: FLASHCARD_BACK_TEMPLATE
    }],
    css: FLASHCARD_STYLING
  };
}

function createMathScript(elementIds) {
  return `<script>
(function () {
  function typeset(elements) {
    if (typeof MathJax === "undefined") return;
    if (MathJax.typesetPromise) MathJax.typesetPromise(elements).catch(function () {});
    else if (MathJax.Hub) MathJax.Hub.Queue(["Typeset", MathJax.Hub, document.body]);
  }
  var elements = ${JSON.stringify(elementIds)}.map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);
  setTimeout(function () { typeset(elements); }, 80);
})();
<\\/script>`;
}
