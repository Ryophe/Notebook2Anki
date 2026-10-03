// NotebookLM2Anki - Shared page extractor for classic content-script contexts

(function registerExtractor(global) {
  "use strict";

  if (global.NotebookLM2AnkiExtractor) return;

  const UNKNOWN_TITLE = "Unknown Notebook";
  // NotebookLM can nest generated study content fairly deeply. Keep the walk bounded,
  // but leave enough room for larger/changed payloads so valid cards are not missed.
  const MAX_WALK_NODES = 50000;
  const MAX_WALK_DEPTH = 32;

  function extractFromPage(doc = document) {
    // NotebookLM/Gemini Notebook renders the generated study artifact in an
    // app-root. Prefer that canonical node; fall back to any data-app-data
    // nodes for older layouts.
    const appRoot = doc.querySelector("app-root[data-app-data]");
    const roots = appRoot
      ? [appRoot]
      : Array.from(doc.querySelectorAll("[data-app-data]"));
    if (roots.length === 0) return null;

    const aggregate = { title: "", quizzes: [], flashcards: [] };
    for (const root of roots) {
      const raw = root.getAttribute("data-app-data");
      const data = parseAppData(raw);
      if (!data) continue;

      const result = extractFromData(data);
      if (!aggregate.title && result.title) aggregate.title = result.title;
      aggregate.quizzes.push(...result.quizzes);
      aggregate.flashcards.push(...result.flashcards);
    }

    aggregate.quizzes = deduplicate(aggregate.quizzes, quiz =>
      JSON.stringify([quiz.question, quiz.options.map(option => option.text)])
    );
    aggregate.flashcards = deduplicate(aggregate.flashcards, card =>
      JSON.stringify([card.front, card.back])
    );

    return {
      title: sanitizeDeckName(aggregate.title || getNotebookTitle(doc)),
      quizzes: aggregate.quizzes,
      flashcards: aggregate.flashcards,
      extractedAt: new Date().toISOString()
    };
  }

  function extractFromData(data) {
    const quizzes = [];
    const flashcards = [];

    // NotebookLM's canonical flashcard collection is data.flashcards.
    // Handle it explicitly before the generic walk so changes elsewhere in
    // the payload cannot prevent cards from being discovered.
    if (Array.isArray(data?.flashcards)) {
      for (const candidate of data.flashcards) {
        if (!candidate || typeof candidate !== "object") continue;
        const flashcard = normalizeFlashcard(candidate, ["flashcards"]);
        if (flashcard) flashcards.push(flashcard);
      }
    }

    walkData(data, (value, path) => {
      if (!value || Array.isArray(value) || typeof value !== "object") return;

      const quiz = normalizeQuiz(value);
      if (quiz) quizzes.push(quiz);

      const flashcard = normalizeFlashcard(value, path);
      if (flashcard) flashcards.push(flashcard);
    });

    return {
      title: readDataTitle(data),
      quizzes: deduplicate(quizzes, quiz =>
        JSON.stringify([quiz.question, quiz.options.map(option => option.text)])
      ),
      flashcards: deduplicate(flashcards, card => JSON.stringify([card.front, card.back]))
    };
  }

  function normalizeQuiz(candidate) {
    const question = firstText(candidate.question, candidate.prompt, candidate.questionText);
    const rawOptions = candidate.answerOptions || candidate.options || candidate.answers;
    if (!question || !Array.isArray(rawOptions) || rawOptions.length < 2) return null;

    const options = rawOptions
      .map(option => {
        if (typeof option === "string") {
          return { text: option.trim(), isCorrect: false, rationale: "" };
        }
        if (!option || typeof option !== "object") return null;

        return {
          text: firstText(option.text, option.answer, option.content, option.label),
          isCorrect: Boolean(option.isCorrect ?? option.correct ?? option.isAnswer),
          rationale: firstText(option.rationale, option.explanation, option.reason)
        };
      })
      .filter(option => option?.text)
      .slice(0, 4);

    if (options.length < 2) return null;

    return {
      type: "quiz",
      question,
      hint: firstText(candidate.hint, candidate.clue),
      archDiagram: firstText(candidate.archDiagram, candidate.diagram, candidate.image),
      options
    };
  }

  function normalizeFlashcard(candidate, path) {
    const pathText = path.join(".").toLowerCase();
    const namedCollection = /flash.?card|study.?card/.test(pathText);

    // NotebookLM has used several equivalent shapes for generated cards over time.
    // Do not require the parent path to contain "flashcard": a payload can move the
    // collection under an opaque/generated key while retaining the front/back fields.
    const front = firstText(
      candidate.f,
      candidate.front,
      candidate.frontText,
      candidate.term,
      candidate.question,
      candidate.prompt
    );
    const back = firstText(
      candidate.b,
      candidate.back,
      candidate.backText,
      candidate.definition,
      candidate.answer,
      candidate.response
    );

    const hasExplicitPair = Boolean(
      (candidate.f != null && candidate.b != null) ||
      (candidate.front != null && candidate.back != null) ||
      (candidate.frontText != null && candidate.backText != null) ||
      (candidate.term != null && candidate.definition != null) ||
      (candidate.question != null && candidate.answer != null) ||
      (candidate.prompt != null && candidate.response != null)
    );

    if ((!namedCollection && !hasExplicitPair) || !front || !back) return null;
    return { type: "flashcard", front, back };
  }

  function walkData(root, visit) {
    const stack = [{ value: root, path: [], depth: 0 }];
    let visited = 0;

    while (stack.length > 0 && visited < MAX_WALK_NODES) {
      const current = stack.pop();
      visited += 1;
      visit(current.value, current.path);

      if (
        current.depth >= MAX_WALK_DEPTH ||
        !current.value ||
        typeof current.value !== "object"
      ) {
        continue;
      }

      if (Array.isArray(current.value)) {
        for (let index = current.value.length - 1; index >= 0; index -= 1) {
          stack.push({
            value: current.value[index],
            path: current.path,
            depth: current.depth + 1
          });
        }
        continue;
      }

      const entries = Object.entries(current.value);
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const [key, value] = entries[index];
        stack.push({ value, path: current.path.concat(key), depth: current.depth + 1 });
      }
    }
  }

  function getNotebookTitle(doc) {
    const selectors = [
      'input[placeholder*="notebook" i]',
      'textarea[placeholder*="notebook" i]',
      '[data-testid*="title" i]',
      ".title-label",
      "main h1",
      "h1"
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      const value = "value" in (element || {}) ? element.value : element?.textContent;
      if (typeof value === "string" && value.trim()) return value.trim();
    }

    const pageTitle = String(doc.title || "")
      .replace(/\s*(?:-|–|\|)\s*NotebookLM\s*$/i, "")
      .trim();
    return pageTitle || UNKNOWN_TITLE;
  }

  function readDataTitle(data) {
    if (!data || typeof data !== "object") return "";
    return firstText(
      data.title,
      data.notebookTitle,
      data.notebook?.title,
      data.project?.title
    );
  }

  function parseAppData(value) {
    let current = value;

    // data-app-data is normally JSON, but some NotebookLM generations have
    // returned an extra JSON-string layer. Peel a few layers safely.
    for (let pass = 0; pass < 4; pass += 1) {
      if (typeof current !== "string" || !current.trim()) return current || null;
      const input = current.trim();

      try {
        const parsed = JSON.parse(input);
        if (typeof parsed !== "string") return parsed;
        current = parsed;
        continue;
      } catch {
        // Try HTML entity decoding before giving up.
      }

      const decoded = decodeHtml(input);
      if (decoded === input) return null;
      current = decoded;
    }

    return typeof current === "object" ? current : null;
  }

  function decodeHtml(value) {
    return value.replace(
      /&(?:quot|amp|lt|gt|#39|#x27|#x2F|#(\d+)|#x([\da-f]+));/gi,
      (entity, decimal, hexadecimal) => {
        const codePoint = decimal
          ? Number(decimal)
          : hexadecimal
            ? Number.parseInt(hexadecimal, 16)
            : null;
        if (codePoint !== null) {
          return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
            ? String.fromCodePoint(codePoint)
            : entity;
        }
        return ({
          "&quot;": '"',
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&#39;": "'",
          "&#x27;": "'",
          "&#x2f;": "/"
        })[entity.toLowerCase()] ?? entity;
      }
    );
  }

  function sanitizeDeckName(value) {
    const name = String(value ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/::/g, " - ")
      .replace(/\s+/g, " ")
      .trim();
    return name || UNKNOWN_TITLE;
  }

  function firstText(...values) {
    for (const value of values) {
      const text = textFromValue(value);
      if (text) return text;
    }
    return "";
  }

  // NotebookLM flashcards currently store each side as:
  // { flashcardContentBlock: [{ type: "text", content: "..." }] }.
  // Older extraction only accepted plain strings, so it saw f/b but discarded
  // both sides and consequently reported zero flashcards.
  function textFromValue(value, depth = 0) {
    if (depth > 8 || value == null) return "";

    if (typeof value === "string") {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const text = textFromValue(item, depth + 1);
        if (text) return text;
      }
      return "";
    }

    if (typeof value !== "object") return "";

    const preferredKeys = [
      "content",
      "text",
      "value",
      "plainText",
      "markdown",
      "html",
      "flashcardContentBlock"
    ];

    for (const key of preferredKeys) {
      if (!(key in value)) continue;
      const text = textFromValue(value[key], depth + 1);
      if (text) return text;
    }

    return "";
  }

  function deduplicate(items, createKey) {
    const seen = new Set();
    return items.filter(item => {
      const key = createKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  global.NotebookLM2AnkiExtractor = Object.freeze({
    extractFromPage,
    extractFromData,
    sanitizeDeckName
  });
})(globalThis);
