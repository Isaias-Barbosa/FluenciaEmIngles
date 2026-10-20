export const sourceDomains = ["learnenglish.britishcouncil.org", "learnenglishteens.britishcouncil.org", "cambridgeenglish.org"];
export const levelTopics: Record<string, string[]> = {
  A1: ["to be and introductions", "articles and everyday objects", "present simple and routines", "prepositions of place", "family and possessives"],
  A2: ["past simple and travel", "comparatives", "countable and uncountable nouns", "future plans", "requests and invitations"],
  B1: ["present perfect", "first and second conditionals", "reported speech", "relative clauses", "modals of advice"],
  B2: ["mixed conditionals", "past modal deduction", "passive reporting", "gerunds and infinitives", "collocations and work"],
  C1: ["negative inversion", "cleft sentences", "hedging and register", "advanced collocations", "participle clauses"],
  C2: ["nuance and idiomatic usage", "subtle distinctions in register", "advanced discourse markers", "ellipsis and substitution", "complex inference"],
};

export const webQuestionSchema = {
  type: "object", additionalProperties: false,
  properties: {
    level: { type: "string", enum: Object.keys(levelTopics) },
    prompt: { type: "string" },
    choices: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    correct_option: { type: "integer", minimum: 0, maximum: 3 },
    explanation: { type: "string" }, hint: { type: "string" },
    source_url: { type: "string" }, source_title: { type: "string" },
  },
  required: ["level", "prompt", "choices", "correct_option", "explanation", "hint", "source_url", "source_title"],
};

type WebQuestion = {
  level: string; prompt: string; choices: string[]; correct_option: number;
  explanation: string; hint: string; source_url: string; source_title: string;
};

function allowedUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443")
      && sourceDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ? url.href : null;
  } catch { return null; }
}

/** Fail closed: require a completed REAL search and a source in the tool's results. */
export function parseWebQuestion(response: unknown, expectedLevel: string): WebQuestion {
  const data = response as { status?: string; output?: Array<{ type: string; status?: string; action?: { sources?: Array<{ url?: string }> }; content?: Array<{ type: string; text?: string; annotations?: Array<{ type: string; url?: string }> }> }> };
  if (data?.status !== "completed" || !Array.isArray(data.output)) throw new Error("A pesquisa não foi concluída. Tente novamente.");
  const searches = data.output.filter((item) => item.type === "web_search_call" && item.status === "completed");
  if (!searches.length) throw new Error("A busca na internet não foi executada.");
  const sources = new Set(searches.flatMap((item) => item.action?.sources ?? []).map((item) => allowedUrl(item.url)).filter(Boolean));
  const messages = data.output.filter((item) => item.type === "message").flatMap((item) => item.content ?? []);
  for (const item of messages) for (const annotation of item.annotations ?? []) {
    if (annotation.type === "url_citation") { const url = allowedUrl(annotation.url); if (url) sources.add(url); }
  }
  const text = messages.filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("");
  const result = JSON.parse(text) as WebQuestion;
  if (!result || typeof result !== "object") throw new Error("A questão encontrada é inválida. Tente novamente.");
  const validString = (value: unknown, max: number, min = 1) => typeof value === "string" && value.trim().length >= min && value.length <= max;
  const source = allowedUrl(result.source_url);
  if (result.level !== expectedLevel || !validString(result.prompt, 1200, 10)
    || !Array.isArray(result.choices) || result.choices.length !== 4
    || !result.choices.every((choice) => validString(choice, 250))
    || new Set(result.choices.map((choice) => choice.trim().toLowerCase())).size !== 4
    || !Number.isInteger(result.correct_option) || result.correct_option < 0 || result.correct_option > 3
    || !validString(result.explanation, 1500) || !validString(result.hint, 500)
    || !validString(result.source_title, 250) || !source || !sources.has(source)) {
    throw new Error("Não foi possível validar uma questão adequada ao seu nível. Tente novamente.");
  }
  return { ...result, source_url: source, choices: result.choices.map((choice) => choice.trim()) };
}

export type SavedReplacement = {
  question_id: string; prompt: string; choices: unknown; source_url: string; source_title: string; source_license?: string; origin?: string;
};

/** Preserve the original ID: attempts, missions and the five-question group use it. */
export function applyReplacement<Q extends { id: string; type: string; prompt: string; options: string[]; audioUrl: string | null; hint: string | null; passage: string | null }>(question: Q, replacement: SavedReplacement): Q {
  if (question.id !== replacement.question_id || !Array.isArray(replacement.choices)
    || replacement.choices.length !== 4 || !replacement.choices.every((choice) => typeof choice === "string")) {
    throw new Error("Substituição inválida para este exercício.");
  }
  return { ...question, type: "multiple_choice", prompt: replacement.prompt, options: replacement.choices as string[],
    audioUrl: null, hint: null, passage: null, sourceUrl: replacement.source_url, sourceTitle: replacement.source_title, sourceLicense: replacement.source_license, replacementOrigin: replacement.origin };
}
