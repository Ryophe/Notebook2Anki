// NotebookLM2Anki - AnkiConnect client and export orchestration

import { CONFIG, EXPORT_TYPES } from "./constants.js";
import { cleanMath, sanitizeDeckName } from "./utils.js";
import {
  QUIZ_BACK_TEMPLATE,
  QUIZ_FIELDS,
  QUIZ_FRONT_TEMPLATE,
  QUIZ_MODEL_NAME,
  QUIZ_STYLING
} from "../templates/quiz-model.js";
import {
  FLASHCARD_BACK_TEMPLATE,
  FLASHCARD_FIELDS,
  FLASHCARD_FRONT_TEMPLATE,
  FLASHCARD_MODEL_NAME,
  FLASHCARD_STYLING
} from "../templates/flashcard-model.js";

const MODEL_SPECS = Object.freeze({
  quiz: Object.freeze({
    name: QUIZ_MODEL_NAME,
    fields: QUIZ_FIELDS,
    styling: QUIZ_STYLING,
    template: Object.freeze({
      Name: "Quiz Card",
      Front: QUIZ_FRONT_TEMPLATE,
      Back: QUIZ_BACK_TEMPLATE
    })
  }),
  flashcard: Object.freeze({
    name: FLASHCARD_MODEL_NAME,
    fields: FLASHCARD_FIELDS,
    styling: FLASHCARD_STYLING,
    template: Object.freeze({
      Name: "Flashcard",
      Front: FLASHCARD_FRONT_TEMPLATE,
      Back: FLASHCARD_BACK_TEMPLATE
    })
  })
});

async function ankiRequest(action, params = {}) {
  const response = await fetch(CONFIG.ANKI_CONNECT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: CONFIG.ANKI_CONNECT_VERSION, params })
  });

  if (!response.ok) {
    throw new Error(`AnkiConnect returned HTTP ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("AnkiConnect returned an invalid response");
  }

  if (!payload || !("result" in payload) || !("error" in payload)) {
    throw new Error("AnkiConnect response is missing result or error data");
  }
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

export async function checkAnkiConnect() {
  try {
    const version = await ankiRequest("version");
    return { connected: true, version };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

export async function getAnkiDeckNames() {
  const deckNames = await ankiRequest("deckNames");
  return Array.isArray(deckNames) ? deckNames : [];
}

async function ensureModel(spec) {
  const modelNames = await ankiRequest("modelNames");
  if (!modelNames.includes(spec.name)) {
    await ankiRequest("createModel", {
      modelName: spec.name,
      inOrderFields: spec.fields.map(field => field.name),
      css: spec.styling,
      cardTemplates: [spec.template]
    });
    return;
  }

  const actualFields = await ankiRequest("modelFieldNames", { modelName: spec.name });
  const expectedFields = spec.fields.map(field => field.name);
  const fieldsMatch =
    actualFields.length === expectedFields.length &&
    actualFields.every((field, index) => field === expectedFields[index]);

  if (!fieldsMatch) {
    throw new Error(
      `${spec.name} has incompatible fields. Rename or remove that Anki note type, then export again.`
    );
  }

  await ankiRequest("updateModelTemplates", {
    model: {
      name: spec.name,
      templates: {
        [spec.template.Name]: {
          Front: spec.template.Front,
          Back: spec.template.Back
        }
      }
    }
  });
  await ankiRequest("updateModelStyling", {
    model: {
      name: spec.name,
      css: spec.styling
    }
  });
}

async function addUniqueNotes(notes, targetDeck) {
  if (notes.length === 0) {
    return { success: false, count: 0, skipped: 0, failed: 0, total: 0 };
  }

  const eligibility = await ankiRequest("canAddNotes", { notes });
  if (!Array.isArray(eligibility) || eligibility.length !== notes.length) {
    throw new Error("AnkiConnect returned incomplete duplicate-check results");
  }

  const addableNotes = notes.filter((_, index) => eligibility[index] === true);
  const skipped = notes.length - addableNotes.length;
  if (addableNotes.length === 0) {
    return { success: true, count: 0, skipped, failed: 0, total: notes.length };
  }

  const noteIds = await ankiRequest("addNotes", { notes: addableNotes });
  if (!Array.isArray(noteIds) || noteIds.length !== addableNotes.length) {
    throw new Error("AnkiConnect returned incomplete add-note results");
  }

  const createdNoteIds = noteIds.filter(noteId => noteId !== null);
  await ensureCreatedCardsInDeck(createdNoteIds, targetDeck);
  const count = createdNoteIds.length;
  const failed = noteIds.length - count;
  return {
    success: failed === 0,
    count,
    skipped,
    failed,
    total: notes.length
  };
}

export async function sendQuizzesToAnki(quizzes, deckName, existingDeckName = "") {
  const validQuizzes = (Array.isArray(quizzes) ? quizzes : []).filter(
    quiz => quiz && String(quiz.question || "").trim() && Array.isArray(quiz.options)
  );
  if (validQuizzes.length === 0) throw new Error("No valid quizzes to send");

  await ensureModel(MODEL_SPECS.quiz);
  const targetDeck = resolveTargetDeck(deckName, "Quiz", existingDeckName);
  await ankiRequest("createDeck", { deck: targetDeck });

  const notes = validQuizzes.map(quiz => ({
    deckName: targetDeck,
    modelName: QUIZ_MODEL_NAME,
    fields: quizToFields(quiz),
    tags: [...CONFIG.DEFAULT_TAGS]
  }));
  return addUniqueNotes(notes, targetDeck);
}

export async function sendFlashcardsToAnki(flashcards, deckName, existingDeckName = "") {
  const validFlashcards = (Array.isArray(flashcards) ? flashcards : []).filter(
    card => card && String(card.front || "").trim() && String(card.back || "").trim()
  );
  if (validFlashcards.length === 0) throw new Error("No valid flashcards to send");

  await ensureModel(MODEL_SPECS.flashcard);
  const targetDeck = resolveTargetDeck(deckName, "Flashcard", existingDeckName);
  await ankiRequest("createDeck", { deck: targetDeck });

  const notes = validFlashcards.map(card => ({
    deckName: targetDeck,
    modelName: FLASHCARD_MODEL_NAME,
    fields: {
      Front: cleanMath(card.front),
      Back: cleanMath(card.back)
    },
    tags: [...CONFIG.DEFAULT_TAGS]
  }));
  return addUniqueNotes(notes, targetDeck);
}

export async function sendContentToAnki(data, deckName, type = EXPORT_TYPES.ALL, existingDeckName = "") {
  if (!data || typeof data !== "object") throw new Error("No content was provided");
  if (!Object.values(EXPORT_TYPES).includes(type)) throw new Error(`Unsupported export type: ${type}`);

  if (type === EXPORT_TYPES.QUIZZES) {
    return sendQuizzesToAnki(data.quizzes, deckName || data.title, existingDeckName);
  }
  if (type === EXPORT_TYPES.FLASHCARDS) {
    return sendFlashcardsToAnki(data.flashcards, deckName || data.title, existingDeckName);
  }

  const parts = [];
  if (data.quizzes?.length) {
    parts.push(await sendQuizzesToAnki(data.quizzes, deckName || data.title, existingDeckName));
  }
  if (data.flashcards?.length) {
    parts.push(await sendFlashcardsToAnki(data.flashcards, deckName || data.title, existingDeckName));
  }
  if (parts.length === 0) throw new Error("No quizzes or flashcards were found");

  return parts.reduce(
    (total, part) => ({
      success: total.success && part.success,
      count: total.count + part.count,
      skipped: total.skipped + part.skipped,
      failed: total.failed + part.failed,
      total: total.total + part.total
    }),
    { success: true, count: 0, skipped: 0, failed: 0, total: 0 }
  );
}

async function ensureCreatedCardsInDeck(noteIds, targetDeck) {
  if (!noteIds.length) return;

  const noteInfo = await ankiRequest("notesInfo", { notes: noteIds });
  if (!Array.isArray(noteInfo)) {
    throw new Error("AnkiConnect returned invalid note information");
  }

  const cardIds = noteInfo.flatMap(note => Array.isArray(note?.cards) ? note.cards : []);
  if (cardIds.length === 0) {
    throw new Error("Anki created the notes but no cards were generated");
  }

  const cardInfo = await ankiRequest("cardsInfo", { cards: cardIds });
  if (!Array.isArray(cardInfo) || cardInfo.length !== cardIds.length) {
    throw new Error("AnkiConnect returned incomplete card information");
  }

  const misplacedCards = cardInfo
    .filter(card => card?.deckName !== targetDeck)
    .map(card => card.cardId)
    .filter(cardId => cardId != null);

  if (misplacedCards.length) {
    await ankiRequest("changeDeck", {
      cards: misplacedCards,
      deck: targetDeck
    });
  }

  const verified = await ankiRequest("cardsInfo", { cards: cardIds });
  const wrongDeck = verified.find(card => card?.deckName !== targetDeck);
  if (wrongDeck) {
    throw new Error(`Anki added the cards but could not place them in "${targetDeck}"`);
  }
}

function buildDeckName(deckName, _kind) {
  return sanitizeDeckName(deckName, CONFIG.DEFAULT_DECK_NAME);
}

function resolveTargetDeck(deckName, kind, existingDeckName) {
  const existing = String(existingDeckName || "").trim();
  if (existing) return existing;
  return buildDeckName(deckName, kind);
}

function quizToFields(quiz) {
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  const fields = {
    Question: cleanMath(quiz.question),
    Hint: cleanMath(quiz.hint),
    ArchDiagram: cleanMath(quiz.archDiagram)
  };

  for (let index = 0; index < 4; index += 1) {
    const option = options[index];
    const number = index + 1;
    fields[`Option${number}`] = cleanMath(option?.text);
    fields[`Flag${number}`] = option?.isCorrect ? "True" : "False";
    fields[`Rationale${number}`] = cleanMath(option?.rationale);
  }
  return fields;
}
