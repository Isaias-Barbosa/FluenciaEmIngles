import profile from "./data/vocabulary.json";
import { cefrLevels, type CefrAnalysis, type CefrLevel } from "./types";

const words: Record<string, number> = profile.words;
const phrases: Record<string, number> = profile.phrases;
const functions = new Set("a an the i you he she it we they me him her us them my your his its our their mine yours ours theirs this that these those what which who whom whose when where why how is am are was were be been being do does did have has had can could will would shall should may might must not no yes and or but if as at in on of for from with by to into about than so such very more most less many much some any all each every both either neither other another there here then now also only just ever never already yet still even too up down out over under through between among during before after until since while although because whether".split(" "));
const irregular: Record<string, string> = {
  is:"be",am:"be",are:"be",was:"be",were:"be",been:"be",being:"be",has:"have",had:"have",does:"do",did:"do",done:"do",
  went:"go",gone:"go",came:"come",saw:"see",seen:"see",ate:"eat",eaten:"eat",took:"take",taken:"take",gave:"give",given:"give",
  made:"make",wrote:"write",written:"write",read:"read",bought:"buy",brought:"bring",thought:"think",taught:"teach",caught:"catch",
  knew:"know",known:"know",found:"find",lost:"lose",left:"leave",felt:"feel",said:"say",told:"tell",got:"get",gotten:"get",
  ran:"run",won:"win",built:"build",held:"hold",heard:"hear",met:"meet",paid:"pay",sent:"send",spent:"spend",stood:"stand",
  understood:"understand",children:"child",men:"man",women:"woman",people:"person",feet:"foot",teeth:"tooth",mice:"mouse",
  better:"good",best:"good",worse:"bad",worst:"bad",
};

function lookup(token: string): { lemma: string; band: number } | null {
  const candidates = [token, irregular[token]];
  if (token.endsWith("'s")) candidates.push(token.slice(0,-2));
  if (token.endsWith("ies")) candidates.push(token.slice(0,-3)+"y");
  if (token.endsWith("s")) candidates.push(token.slice(0,-1));
  if (token.endsWith("es")) candidates.push(token.slice(0,-2));
  if (token.endsWith("ied")) candidates.push(token.slice(0,-3)+"y");
  if (token.endsWith("ed")) candidates.push(token.slice(0,-2),token.slice(0,-1));
  if (token.endsWith("ing")) {
    const stem = token.slice(0,-3);
    candidates.push(stem,stem+"e", /([a-z])\1$/.test(stem) ? stem.slice(0,-1) : "");
  }
  const known = candidates.filter(Boolean).filter((lemma) => typeof words[lemma] === "number").map((lemma) => ({lemma,band:words[lemma]}));
  return known.sort((a,b) => a.band-b.band)[0] ?? null;
}

function normalize(text: string) {
  return text.replace(/[’‘]/g,"'").replace(/\bwon't\b/gi,"will not").replace(/\bcan't\b/gi,"can not")
    .replace(/\b(\w+)n't\b/gi,"$1 not").replace(/\b(\w+)'re\b/gi,"$1 are")
    .replace(/\b(\w+)'ve\b/gi,"$1 have").replace(/\b(\w+)'ll\b/gi,"$1 will")
    .replace(/\bI'm\b/gi,"I am").replace(/\b(it|he|she|that|what|there)'s\b/gi,"$1 is");
}

/** Editorial estimate, NOT an official CEFR classifier or proficiency assessment.
 * It does not accept/use provider difficulty or a supplied answer as a level signal.
 */
export function analyzeCefr(prompt: string, choices: string[] = [], passage = ""): CefrAnalysis {
  const mainText = normalize(`${passage}\n${prompt}`).trim();
  const fullText = normalize([passage,prompt,...choices].join("\n")).trim();
  const tokens = [...fullText.matchAll(/[A-Za-z]+(?:['-][A-Za-z]+)*/g)].map((match) => match[0]);
  const possibleNames: string[] = [];
  const unknownWords: string[] = [];
  const vocabulary: CefrAnalysis["vocabulary"] = [];
  const distribution = Object.fromEntries(cefrLevels.map((level) => [level,0])) as Record<CefrLevel, number>;
  let knownCount = 0;
  let eligibleCount = 0;
  const contentBands: number[] = [];
  for (const original of tokens) {
    const token = original.toLowerCase();
    const known = lookup(token);
    if (!known && /^[A-Z]/.test(original)) { possibleNames.push(original); continue; }
    eligibleCount++;
    if (!known) { unknownWords.push(token); continue; }
    knownCount++;
    const level = cefrLevels[known.band-1];
    distribution[level]++;
    vocabulary.push({word:token,lemma:known.lemma,level});
    if (!functions.has(token) && !functions.has(known.lemma)) contentBands.push(known.band);
  }
  const coverage = eligibleCount ? Math.round(knownCount/eligibleCount*100) : 0;
  const sentences = mainText.split(/[.!?]+(?:\s|$)|\n+/).map((part) => part.trim()).filter(Boolean);
  const mainWords = mainText.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) ?? [];
  const averageSentenceLength = Math.round(mainWords.length/Math.max(1,sentences.length)*10)/10;
  const evidence: CefrAnalysis["evidence"] = [];
  const warnings: string[] = ["Estimativa editorial automática, sem calibração estatística. Não certifica nível CEFR nem proficiência do estudante."];
  const text = mainText.toLowerCase().replace(/\s+/g," ");
  let grammarBand = 1;
  const signal = (band: number, label: string, detail: string) => {
    grammarBand = Math.max(grammarBand,band);
    evidence.push({level:cefrLevels[band-1],label,detail});
  };
  if (/\b(?:did|was|were|went|saw|bought|ate|took|came|yesterday)\b/.test(text)) signal(2,"Referência ao passado","Formas de passado ou marcador temporal detectados.");
  if (/\b(?:am|is|are|was|were)\s+(?:not\s+)?\w+ing\b/.test(text)) signal(2,"Forma contínua","Auxiliar be seguido de forma em -ing.");
  if (/\b(?:have|has)\s+(?:(?:i|you|he|she|it|we|they)\s+)?(?:(?:not|ever|already|never|just)\s+){0,2}(?:been|seen|done|gone|made|taken|written|eaten|\w+ed)\b/.test(text)) signal(3,"Possível present perfect","Have/has seguido de particípio; o contexto precisa confirmar a leitura.");
  if (/\b(?:is|are|was|were|been)\s+(?:not\s+)?(?:written|made|known|built|given|called|used|created|invented|discovered|\w+ed)\b/.test(text)) signal(3,"Possível voz passiva","Be seguido de particípio; algumas ocorrências podem ser adjetivos.");
  if (/\bif\b.{0,180}\b(?:would|could|might)\b|\b(?:would|could|might)\b.{0,180}\bif\b/.test(text)) signal(3,"Hipótese condicional","Combinação de if com would/could/might.");
  if (/\bif\b.{0,180}\bhad\b.{0,180}\b(?:would|could|might)\s+have\b|\b(?:would|could|might)\s+have\b.{0,180}\bif\b.{0,100}\bhad\b/.test(text)) signal(4,"Condicional passado","Hipótese passada com had e would/could/might have.");
  if (/\b(?:must|might|may|could|cannot|can not)\s+have\s+(?:been|done|seen|gone|made|taken|\w+ed)\b/.test(text)) signal(4,"Modal com perfect infinitive","Modal seguido de have e particípio.");
  if (/\b(?:not only|rarely|seldom|never before|under no circumstances|hardly|scarcely)\s+(?:do|does|did|have|has|had|can|could|will|would|should|is|are|was|were)\b/.test(text)) signal(5,"Inversão após expressão negativa","Expressão negativa/limitadora seguida de auxiliar invertido.");
  if (/\bhad\s+(?:i|you|he|she|we|they)\s+(?:known|been|seen|taken|\w+ed)\b.{0,180}\b(?:would|could|might)\b/.test(text)) signal(5,"Inversão condicional","Padrão de condicional com had antes do sujeito e oração com would/could/might.");
  const subordinateCount = (text.match(/\b(?:although|whereas|unless|provided|despite|whose|whom|because|while)\b/g) ?? []).length;
  if (averageSentenceLength>25 && subordinateCount>=2) signal(4,"Estrutura extensa com subordinação","Frases longas com mais de um marcador subordinativo.");
  else if (averageSentenceLength>18 && subordinateCount>=1) signal(3,"Subordinação","Frase extensa com marcador subordinativo.");

  const sorted = contentBands.sort((a,b) => a-b);
  let lexicalBand = sorted.length ? sorted[Math.floor((sorted.length-1)*0.8)] : 1;
  const c2Count = contentBands.filter((band) => band===6).length;
  if (lexicalBand===6 && (c2Count<2 || c2Count/Math.max(1,contentBands.length)<0.25)) lexicalBand=5;
  // Known multiword entries contribute only when actually present, not guessed from length.
  const padded = ` ${fullText.toLowerCase().replace(/[^a-z' -]/g," ").replace(/\s+/g," ")} `;
  for (const [phrase,band] of Object.entries(phrases)) {
    if (band>=4 && padded.includes(` ${phrase} `)) {
      lexicalBand=Math.max(lexicalBand,Math.min(5,band));
      evidence.push({level:cefrLevels[band-1],label:`Expressão: ${phrase}`,detail:"Entrada de mais de uma palavra encontrada no perfil lexical."});
    }
  }
  evidence.unshift({level:cefrLevels[lexicalBand-1],label:"Perfil do vocabulário",detail:"Faixa superior predominante do vocabulário de conteúdo reconhecido; palavras funcionais não dominam esta medida."});
  const nonEnglishMarkers = (fullText.toLowerCase().match(/\b(?:qual|questão|questões|pergunta|resposta|alternativas|uma|você|voce|cidade|português|inglês)\b|(?:não|são|está|é)(?=\s|[?.!,]|$)/g) ?? []).length;
  const insufficient = nonEnglishMarkers >= 2 || knownCount<3 || coverage<25 || tokens.length<3;
  let band = Math.max(lexicalBand,grammarBand);
  band=Math.max(1,Math.min(6,band));
  const short = mainWords.length<12;
  const weakCoverage = coverage<75;
  const manyNames = possibleNames.length/Math.max(1,tokens.length)>0.25;
  const confidence = short || weakCoverage || manyNames ? "baixa" : "moderada";
  if (short) warnings.push("Enunciado curto: uma pergunta isolada oferece pouca evidência para separar níveis próximos.");
  if (unknownWords.length) warnings.push("Palavras fora da lista não são automaticamente C1/C2. Revise termos técnicos e grafias.");
  if (possibleNames.length) warnings.push("Possíveis nomes próprios foram separados do cálculo lexical; confira se algum é uma palavra comum.");
  warnings.push("Os perfis não desambiguam sentidos. Uma palavra pode ter usos de níveis diferentes.");
  warnings.push("A dificuldade de conhecimentos gerais da fonte não entra no cálculo. Esta análise não valida o gabarito.");
  const width = confidence === "baixa" ? 2 : 1;
  return {
    level:insufficient ? null : cefrLevels[band-1],
    range:insufficient ? "Revisão manual" : `${cefrLevels[Math.max(0,band-1-width)]}–${cefrLevels[Math.min(5,band-1+width)]}`,
    confidence,
    summary:insufficient ? "Texto insuficiente ou com pouco vocabulário inglês reconhecido. Acrescente contexto ou revise manualmente."
      : `Sugestão ${cefrLevels[band-1]} para a dificuldade linguística de leitura desta questão. Confirme o sentido, a tarefa e as alternativas antes de cadastrar.`,
    wordCount:tokens.length,coverage,averageSentenceLength,
    vocabulary:[...new Map(vocabulary.map((word) => [word.word,word])).values()].sort((a,b) => cefrLevels.indexOf(b.level)-cefrLevels.indexOf(a.level)).slice(0,30),
    distribution,unknownWords:[...new Set(unknownWords)].slice(0,25),possibleNames:[...new Set(possibleNames)].slice(0,25),evidence,warnings,method:"cefr-editorial-v1",
  };
}
