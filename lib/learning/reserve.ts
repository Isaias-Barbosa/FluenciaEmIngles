import { cefrLevels, type CefrLevel } from "@/lib/cefr/types";
export const reserveStatusLabels = { pending: "Aguardando revisão", available: "Disponível", archived: "Arquivada" } as const;
export type ReserveStatus = keyof typeof reserveStatusLabels;
export type ReserveInput = {
  level: CefrLevel | ""; prompt: string; choices: string[]; correctAnswer: string;
  explanation: string; hint: string; source: "manual" | "opentdb" | "trivia"; category: string;
};
export function parseReserveInput(value: unknown): ReserveInput {
  if (!value || typeof value !== "object") throw new Error("Questão inválida.");
  const q = value as Record<string, unknown>;
  const labels: Record<string, string> = { level: "o nível", prompt: "o enunciado", correctAnswer: "o gabarito", explanation: "a explicação", hint: "a dica", category: "a categoria" };
  const text = (key: string, max: number, min = 0) => {
    const raw = q[key];
    if (typeof raw !== "string" || raw.trim().length < min || raw.length > max) throw new Error(`Revise ${labels[key] ?? "o campo"}: limite de ${max} caracteres${min ? ` e mínimo de ${min}` : ""}.`);
    return raw.trim();
  };
  const level = text("level", 2);
  if (level && !(cefrLevels as readonly string[]).includes(level)) throw new Error("Escolha um nível entre A1 e C2.");
  if (!Array.isArray(q.choices) || q.choices.length > 6 || q.choices.some((choice) => typeof choice !== "string" || !choice.trim() || choice.length > 250)) throw new Error("Use até 6 alternativas de até 250 caracteres.");
  const choices = q.choices.map((choice: string) => choice.trim());
  if (new Set(choices.map((choice) => choice.toLowerCase())).size !== choices.length) throw new Error("As alternativas devem ser distintas.");
  if (!["manual", "opentdb", "trivia"].includes(String(q.source))) throw new Error("Fonte inválida.");
  return { level: level as CefrLevel, prompt: text("prompt", 1200, 10), choices,
    correctAnswer: text("correctAnswer", 250), explanation: text("explanation", 1500), hint: text("hint", 500),
    source: q.source as ReserveInput["source"], category: text("category", 200) };
}
export function assertReserveApproval(question: ReserveInput) {
  const normalize = (value: string) => value.replace(new RegExp("[\\p{P}\\p{S}]", "gu"), " ").replace(/\s+/g, " ").trim().toLowerCase();
  const keys = question.choices.map(normalize);
  if (keys.some((key) => !key) || new Set(keys).size !== keys.length) throw new Error("As alternativas precisam continuar distintas ao ignorar pontuação e espaços repetidos. Revise as opções antes de disponibilizar.");
  if (!question.level || question.choices.length !== 4 || !question.choices.includes(question.correctAnswer) || !question.explanation || !question.hint) {
    throw new Error("Para disponibilizar, revise o nível, informe exatamente 4 alternativas, um gabarito idêntico a uma delas, a explicação e uma dica sem revelar a resposta.");
  }
}
export function reserveAttribution(source: ReserveInput["source"]) {
  return source === "opentdb" ? { source_url: "https://opentdb.com/", source_title: "Open Trivia DB", source_license: "CC BY-SA 4.0" }
    : source === "trivia" ? { source_url: "https://the-trivia-api.com/", source_title: "The Trivia API", source_license: "CC BY-NC 4.0" }
    : { source_url: "https://github.com/Isaias-Barbosa/FluenciaEmIngles", source_title: "Fluência · conteúdo próprio", source_license: "Conteúdo próprio" };
}
