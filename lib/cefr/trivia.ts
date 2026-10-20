import { createHash, randomInt } from "node:crypto";
import type { ReviewQuestion } from "./types";

export class ReviewError extends Error {
  constructor(message: string, public status = 400, public retryAfter = 0) { super(message); }
}
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
function text(value: unknown, max = 1500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new ReviewError("A fonte retornou uma questão inválida. Tente buscar outra.", 502);
  return value.trim();
}
function shuffle(values: string[]) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function normalizeTrivia(payload: unknown, provider: "opentdb" | "trivia"): ReviewQuestion[] {
  const root = object(payload);
  if (provider === "opentdb" && root.response_code !== 0) {
    if (root.response_code === 5) throw new ReviewError("Open Trivia DB pede um intervalo entre buscas. Aguarde 5 segundos.", 429, 5);
    throw new ReviewError("Open Trivia DB não encontrou questões disponíveis. Tente novamente.", 502);
  }
  const rows = provider === "opentdb" ? root.results : payload;
  if (!Array.isArray(rows) || !rows.length || rows.length > 5) throw new ReviewError("A fonte não retornou questões válidas.", 502);
  return rows.map((row) => {
    const item = object(row);
    const decode = (value: unknown, max?: number) => {
      const raw = text(value, max);
      if (provider !== "opentdb") return raw;
      try { return text(decodeURIComponent(raw), max); } catch { throw new ReviewError("A fonte retornou texto com codificação inválida.", 502); }
    };
    if (provider === "opentdb" ? item.type !== "multiple" : item.type !== "text_choice") throw new ReviewError("A fonte retornou um formato não suportado.", 502);
    const prompt = decode(provider === "opentdb" ? item.question : object(item.question).text);
    const correctAnswer = decode(provider === "opentdb" ? item.correct_answer : item.correctAnswer, 250);
    const incorrect = provider === "opentdb" ? item.incorrect_answers : item.incorrectAnswers;
    if (!Array.isArray(incorrect) || incorrect.length !== 3) throw new ReviewError("A fonte retornou alternativas incompletas.", 502);
    const choices = [correctAnswer, ...incorrect.map((answer) => decode(answer, 250))];
    if (new Set(choices.map((choice) => choice.toLowerCase())).size !== choices.length) throw new ReviewError("A fonte retornou alternativas repetidas. Busque outra questão.", 502);
    return {
      id: `${provider}-${createHash("sha256").update(prompt + correctAnswer).digest("hex").slice(0, 24)}`,
      prompt, correctAnswer, choices: shuffle(choices), source: provider,
      sourceUrl: provider === "opentdb" ? "https://opentdb.com/" : "https://the-trivia-api.com/",
      sourceLabel: provider === "opentdb" ? "Open Trivia DB" : "The Trivia API",
      license: provider === "opentdb" ? "CC BY-SA 4.0" : "CC BY-NC 4.0",
      category: decode(item.category, 200), triviaDifficulty: text(item.difficulty, 50),
    };
  });
}

// Per process; the provider also enforces its own IP rate limit across instances.
let openDbNextRequest = 0;
export async function importTrivia(provider: "opentdb" | "trivia", amount: 1 | 5): Promise<ReviewQuestion[]> {
  if (provider === "opentdb") {
    const now = Date.now();
    if (now < openDbNextRequest) throw new ReviewError("Aguarde alguns segundos antes de buscar novamente no Open Trivia DB.", 429, Math.max(1, Math.ceil((openDbNextRequest - now) / 1000)));
    openDbNextRequest = now + 5000;
  }
  const url = provider === "opentdb"
    ? `https://opentdb.com/api.php?amount=${amount}&type=multiple&encode=url3986`
    : `https://the-trivia-api.com/v2/questions?limit=${amount}&types=text_choice`;
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000), headers: { Accept: "application/json" }, redirect: "error" });
    if (response.status === 429) throw new ReviewError("A fonte atingiu o limite de buscas. Aguarde antes de tentar novamente.", 429, 10);
    if (!response.ok) throw new ReviewError("A fonte está indisponível. Tente a outra API ou cole uma questão manualmente.", 502);
    // Reject unexpectedly large upstream responses before parsing.
    const raw = await response.text();
    if (raw.length > 100000) throw new ReviewError("A fonte retornou uma resposta muito grande.", 502);
    const questions = normalizeTrivia(JSON.parse(raw), provider);
    if (questions.length > amount) throw new ReviewError("A fonte retornou uma quantidade inesperada de questões.", 502);
    return questions;
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError("Não foi possível consultar a fonte agora. Tente novamente ou cole uma questão.", 502);
  }
}
