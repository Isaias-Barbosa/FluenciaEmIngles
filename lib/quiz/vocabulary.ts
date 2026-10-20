import type { CefrLevel } from "@/lib/cefr/types";
export type VocabularyEntry = { id: string; level: CefrLevel; word: string; meaning: string; example: string; translation: string };
// Original contextual practice content. Bands are editorial teaching suggestions,
// not official CEFR certification. Each entry tests the sense used in its example.
const content: Record<CefrLevel, [string, string, string, string][]> = {
  A1: [
    ["apple","maçã","I eat an apple every morning.","Eu como uma maçã todas as manhãs."],
    ["window","janela","Please open the window.","Por favor, abra a janela."],
    ["friend","amigo ou amiga","My friend lives near my house.","Meu amigo mora perto da minha casa."],
    ["breakfast","café da manhã","We have breakfast at seven.","Nós tomamos café da manhã às sete."],
    ["school","escola","The children are at school.","As crianças estão na escola."],
    ["thirsty","com sede","I am thirsty. Can I have some water?","Estou com sede. Posso tomar um pouco de água?"],
    ["happy","feliz","She is happy with her new book.","Ela está feliz com o livro novo."],
    ["kitchen","cozinha","Dad is cooking in the kitchen.","Papai está cozinhando na cozinha."],
    ["chair","cadeira","There is a chair next to the table.","Há uma cadeira ao lado da mesa."],
    ["cheap","barato","This bag is cheap. It costs five pounds.","Esta bolsa é barata. Ela custa cinco libras."],
    ["early","cedo","I get up early every day.","Eu acordo cedo todos os dias."],
    ["family","família","My family has dinner together.","Minha família janta junta."],
    ["street","rua","There is a shop on this street.","Há uma loja nesta rua."],
    ["teacher","professor ou professora","Our teacher helps us read.","Nossa professora nos ajuda a ler."],
    ["small","pequeno","They live in a small house.","Eles moram em uma casa pequena."],
  ],
  A2: [
    ["borrow","pegar emprestado","May I borrow your pen for a minute?","Posso pegar sua caneta emprestada por um minuto?"],
    ["lend","emprestar a alguém","Can you lend me your umbrella?","Você pode me emprestar seu guarda-chuva?"],
    ["journey","viagem ou trajeto","The train journey took two hours.","A viagem de trem levou duas horas."],
    ["crowded","lotado","The bus was crowded this morning.","O ônibus estava lotado esta manhã."],
    ["receipt","recibo ou comprovante","Keep the receipt if you want to return the shirt.","Guarde o recibo se quiser devolver a camisa."],
    ["appointment","compromisso com horário marcado","I have a dentist's appointment tomorrow.","Tenho uma consulta com o dentista amanhã."],
    ["neighbour","vizinho ou vizinha","Our neighbour lives in the house next door.","Nosso vizinho mora na casa ao lado."],
    ["tidy","arrumado","Her bedroom is always tidy.","O quarto dela está sempre arrumado."],
    ["improve","melhorar","I practise every day to improve my English.","Eu pratico todos os dias para melhorar meu inglês."],
    ["weather","tempo ou condições climáticas","The weather is sunny today.","O tempo está ensolarado hoje."],
    ["careful","cuidadoso","Be careful when you cross the road.","Tenha cuidado ao atravessar a rua."],
    ["invite","convidar","We want to invite you to dinner.","Queremos convidar você para jantar."],
    ["return","devolver","Please return the library book on Friday.","Por favor, devolva o livro da biblioteca na sexta-feira."],
    ["choose","escolher","You can choose a red or a blue shirt.","Você pode escolher uma camisa vermelha ou azul."],
    ["enough","suficiente","We have enough food for everyone.","Temos comida suficiente para todos."],
  ],
  B1: [
    ["reliable","confiável","You can trust her; she is very reliable.","Você pode confiar nela; ela é muito confiável."],
    ["avoid","evitar","We left early to avoid the traffic.","Saímos cedo para evitar o trânsito."],
    ["afford","ter condições financeiras de pagar","I cannot afford a new car this year.","Não tenho condições de comprar um carro novo neste ano."],
    ["although","embora","Although it was raining, we went for a walk.","Embora estivesse chovendo, fomos caminhar."],
    ["achievement","conquista","Finishing the course was a great achievement.","Concluir o curso foi uma grande conquista."],
    ["request","solicitação","They accepted my request for more information.","Eles aceitaram minha solicitação de mais informações."],
    ["aware","ciente","Are you aware of the new rules?","Você está ciente das novas regras?"],
    ["likely","provável","It is likely to rain this afternoon.","É provável que chova nesta tarde."],
    ["throughout","durante todo","The museum is open throughout the year.","O museu fica aberto durante todo o ano."],
    ["otherwise","caso contrário","Take an umbrella; otherwise, you will get wet.","Leve um guarda-chuva; caso contrário, você vai se molhar."],
    ["benefit","benefício","Regular exercise has an important health benefit.","O exercício regular traz um benefício importante para a saúde."],
    ["issue","problema ou assunto a resolver","We need to discuss this issue before we decide.","Precisamos discutir esse assunto antes de decidir."],
    ["require","exigir ou necessitar","This job will require some experience.","Este trabalho exigirá alguma experiência."],
    ["deal with","lidar com","She knows how to deal with difficult situations.","Ela sabe lidar com situações difíceis."],
    ["keep up with","acompanhar o ritmo de","I walk fast to keep up with my brother.","Eu ando rápido para acompanhar o ritmo do meu irmão."],
  ],
  B2: [
    ["reluctant","relutante","He was reluctant to share his personal details.","Ele estava relutante em compartilhar seus dados pessoais."],
    ["drawback","desvantagem","The main drawback of the plan is its cost.","A principal desvantagem do plano é seu custo."],
    ["enhance","aprimorar ou aumentar a qualidade","The new lighting will enhance the exhibition.","A nova iluminação vai valorizar a exposição."],
    ["misleading","enganoso","The advertisement was misleading about the price.","O anúncio era enganoso em relação ao preço."],
    ["approach","abordagem","We need a different approach to this problem.","Precisamos de uma abordagem diferente para este problema."],
    ["controversial","controverso","The proposal remains controversial among experts.","A proposta continua controversa entre especialistas."],
    ["account for","explicar ou justificar","How do you account for the sudden increase?","Como você explica o aumento repentino?"],
    ["overcome","superar","They worked together to overcome the difficulties.","Eles trabalharam juntos para superar as dificuldades."],
    ["accurate","exato ou preciso","The report provides accurate figures.","O relatório apresenta números precisos."],
    ["nevertheless","mesmo assim","It was a difficult task; nevertheless, she completed it.","Era uma tarefa difícil; mesmo assim, ela a concluiu."],
    ["feasible","viável","We need to know whether the project is feasible.","Precisamos saber se o projeto é viável."],
    ["insight","compreensão aprofundada","The interview gave us insight into her work.","A entrevista nos deu uma compreensão mais profunda do trabalho dela."],
    ["assess","avaliar","The team will assess the risks before starting.","A equipe avaliará os riscos antes de começar."],
    ["compelling","convincente","She presented compelling evidence for her argument.","Ela apresentou evidências convincentes para seu argumento."],
    ["undermine","enfraquecer","Constant criticism can undermine a person's confidence.","Críticas constantes podem enfraquecer a confiança de uma pessoa."],
  ],
  C1: [
    ["nuanced","que considera diferenças sutis","Her nuanced analysis considered several perspectives.","Sua análise detalhada e sensível às nuances considerou várias perspectivas."],
    ["alleviate","aliviar","The measures aim to alleviate pressure on hospitals.","As medidas visam aliviar a pressão sobre os hospitais."],
    ["plausible","plausível ou verossímil","He offered a plausible explanation for the delay.","Ele apresentou uma explicação plausível para o atraso."],
    ["inadvertently","sem intenção ou por descuido","I inadvertently deleted the original file.","Eu apaguei o arquivo original sem querer."],
    ["substantiate","comprovar com evidências","The researcher could not substantiate the claim.","A pesquisadora não conseguiu comprovar a alegação com evidências."],
    ["convey","transmitir uma ideia ou sentimento","Words alone cannot convey how grateful I am.","Só as palavras não conseguem transmitir como sou grato."],
    ["allocate","destinar recursos","The council will allocate funds to public transport.","O conselho destinará recursos ao transporte público."],
    ["unprecedented","sem precedentes","The region experienced unprecedented growth.","A região teve um crescimento sem precedentes."],
    ["discrepancy","divergência ou diferença inesperada","There is a discrepancy between the two accounts.","Há uma divergência entre os dois relatos."],
    ["meticulous","minucioso","Her meticulous research uncovered several errors.","Sua pesquisa minuciosa revelou vários erros."],
    ["deteriorate","piorar ou se deteriorar","Conditions may deteriorate if no action is taken.","As condições podem piorar se nenhuma medida for tomada."],
    ["ambiguous","com mais de uma interpretação","The wording of the contract is ambiguous.","A redação do contrato é ambígua."],
    ["concede","admitir após resistência","He had to concede that his opponent was right.","Ele teve de admitir que seu oponente estava certo."],
    ["scrutinize","examinar com atenção crítica","The committee will scrutinize every detail of the budget.","O comitê examinará cuidadosamente cada detalhe do orçamento."],
    ["take for granted","não dar o devido valor por considerar garantido","We often take for granted the support we receive.","Muitas vezes não damos o devido valor ao apoio que recebemos."],
  ],
  C2: [
    ["ubiquitous","presente em toda parte","Smartphones have become ubiquitous in daily life.","Os smartphones se tornaram presentes em toda parte no cotidiano."],
    ["obfuscate","tornar confuso ou obscuro","The jargon served to obfuscate a simple explanation.","O jargão serviu para tornar obscura uma explicação simples."],
    ["perfunctory","feito de modo superficial e sem interesse","He gave the document a perfunctory glance.","Ele deu uma olhada superficial e desinteressada no documento."],
    ["ephemeral","de curta duração","The installation explores the ephemeral nature of fame.","A instalação explora a natureza passageira da fama."],
    ["unequivocal","claro e sem margem para dúvida","The board issued an unequivocal rejection of the proposal.","O conselho rejeitou a proposta de forma clara e inequívoca."],
    ["fastidious","muito exigente com detalhes","She is fastidious about the presentation of her work.","Ela é muito exigente com os detalhes da apresentação do trabalho."],
    ["intransigent","que se recusa a ceder","Both parties remained intransigent during the negotiations.","Ambas as partes permaneceram inflexíveis durante as negociações."],
    ["juxtapose","colocar lado a lado para comparar","The exhibition will juxtapose ancient and modern art.","A exposição colocará lado a lado arte antiga e moderna."],
    ["esoteric","compreensível apenas para um grupo especializado","The discussion turned to esoteric aspects of the theory.","A discussão se voltou a aspectos da teoria compreendidos por poucos especialistas."],
    ["serendipity","descoberta feliz que acontece por acaso","Finding the missing letter was an act of serendipity.","Encontrar a carta perdida foi uma feliz descoberta por acaso."],
    ["quintessential","que representa perfeitamente as características de algo","The novel is a quintessential example of the genre.","O romance é um exemplo que representa perfeitamente o gênero."],
    ["parsimonious","excessivamente econômico com dinheiro","The parsimonious owner refused to replace the broken chairs.","O dono excessivamente econômico se recusou a substituir as cadeiras quebradas."],
    ["abstruse","difícil de compreender","The article's abstruse argument puzzled even specialists.","O argumento difícil de compreender do artigo confundiu até especialistas."],
    ["magnanimous","generoso, especialmente com um adversário","She was magnanimous in victory and praised her rival.","Ela foi generosa na vitória e elogiou sua rival."],
    ["conundrum","problema complexo ou enigma","The conflicting evidence presented a conundrum for investigators.","As evidências conflitantes representaram um enigma para os investigadores."],
  ],
};
export const vocabulary: VocabularyEntry[] = Object.entries(content).flatMap(([level, rows]) => rows.map(([word, meaning, example, translation], i) => ({ id: `${level}-vocab-${i + 1}`, level: level as CefrLevel, word, meaning, example, translation })));
export type QuizQuestion = VocabularyEntry & { options: string[] };
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function makeVocabularyRound(level: CefrLevel, random = Math.random): QuizQuestion[] {
  const pool = vocabulary.filter((item) => item.level === level);
  return shuffle(pool, random).slice(0, 10).map((item) => ({ ...item,
    options: shuffle([item.meaning, ...shuffle(pool.filter((other) => other.id !== item.id), random).slice(0, 3).map((other) => other.meaning)], random) }));
}
export type QuizAnswer = { id: string; selected: string; correct: boolean };
export type QuizState = { phase: "idle" | "playing" | "finished"; round: QuizQuestion[]; index: number; selected: string; checked: boolean; answers: QuizAnswer[] };
export const initialQuizState: QuizState = { phase: "idle", round: [], index: 0, selected: "", checked: false, answers: [] };
export type QuizAction = { type: "start"; round: QuizQuestion[] } | { type: "select"; value: string } | { type: "check" } | { type: "next" } | { type: "reset" };
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (action.type === "reset") return initialQuizState;
  if (action.type === "start") return action.round.length ? { ...initialQuizState, phase: "playing", round: action.round } : state;
  if (state.phase !== "playing") return state;
  const question = state.round[state.index];
  if (action.type === "select" && !state.checked && question.options.includes(action.value)) return { ...state, selected: action.value };
  if (action.type === "check" && !state.checked && state.selected) return { ...state, checked: true,
    answers: [...state.answers, { id: question.id, selected: state.selected, correct: state.selected === question.meaning }] };
  if (action.type === "next" && state.checked) return state.index + 1 === state.round.length
    ? { ...state, phase: "finished" }
    : { ...state, index: state.index + 1, selected: "", checked: false };
  return state;
}
export type QuizStats = Partial<Record<CefrLevel, { rounds: number; best: number; last: number }>>;
export function readQuizStats(raw: string | null): QuizStats {
  try {
    const value = JSON.parse(raw || "{}"); const result: QuizStats = {};
    for (const level of Object.keys(content) as CefrLevel[]) {
      const row = value?.[level];
      if (row && Number.isSafeInteger(row.rounds) && row.rounds >= 0 && row.rounds < 1000000 && Number.isInteger(row.best) && row.best >= 0 && row.best <= 10 && Number.isInteger(row.last) && row.last >= 0 && row.last <= 10) result[level] = { rounds: row.rounds, best: row.best, last: row.last };
    }
    return result;
  } catch { return {}; }
}
