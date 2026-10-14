"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type LevelId = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type PageId = "home" | "lessons" | "cards" | "progress";
type Profile = {
  name: string;
  email: string;
  level: LevelId;
  goal: string;
  dailyMinutes: number;
  onboardingComplete: boolean;
  completedLessons: string[];
};

type Lesson = {
  id: string;
  level: LevelId;
  title: string;
  category: string;
  duration: number;
  description: string;
  question: string;
  options: string[];
  answer: string;
};

type Flashcard = { front: string; back: string; pronunciation: string };

const levels: { id: LevelId; name: string; subtitle: string }[] = [
  { id: "A1", name: "Beginner", subtitle: "Primeiros passos" },
  { id: "A2", name: "Elementary", subtitle: "Comunicação básica" },
  { id: "B1", name: "Intermediate", subtitle: "Independência" },
  { id: "B2", name: "Upper intermediate", subtitle: "Fluência em expansão" },
  { id: "C1", name: "Advanced", subtitle: "Uso avançado" },
  { id: "C2", name: "Proficient", subtitle: "Domínio completo" },
];

const lessons: Lesson[] = [
  { id: "a1-1", level: "A1", title: "Diga olá e se apresente", category: "Conversação", duration: 8, description: "Aprenda cumprimentos e como dizer seu nome em uma conversa.", question: "Como você diz “Meu nome é Ana” em inglês?", options: ["I am name Ana.", "My name is Ana.", "I name Ana."], answer: "My name is Ana." },
  { id: "a1-2", level: "A1", title: "O verbo to be: I am, you are", category: "Gramática", duration: 10, description: "Monte suas primeiras frases usando o verbo mais importante do inglês.", question: "Complete: “They ___ happy.”", options: ["is", "am", "are"], answer: "are" },
  { id: "a1-3", level: "A1", title: "Números e idade", category: "Vocabulário", duration: 7, description: "Conte de zero a vinte e fale quantos anos você tem.", question: "Qual frase significa “Eu tenho 20 anos”?", options: ["I have 20 years old.", "I am 20 years old.", "I has 20."], answer: "I am 20 years old." },
  { id: "a1-4", level: "A1", title: "Sua rotina em inglês", category: "Vocabulário", duration: 9, description: "Fale sobre seu dia com verbos simples e o presente.", question: "Complete: “I ___ coffee every morning.”", options: ["drink", "drinks", "drinking"], answer: "drink" },
  { id: "a2-1", level: "A2", title: "Conte o que aconteceu", category: "Gramática", duration: 12, description: "Use o passado simples para falar sobre experiências recentes.", question: "Complete: “We ___ a movie last night.”", options: ["watch", "watched", "watches"], answer: "watched" },
  { id: "a2-2", level: "A2", title: "Peça comida no restaurante", category: "Conversação", duration: 9, description: "Faça um pedido e converse com confiança em um restaurante.", question: "Qual é uma forma educada de pedir água?", options: ["Water now!", "Can I have some water, please?", "Give water to me."], answer: "Can I have some water, please?" },
  { id: "a2-3", level: "A2", title: "Planos para o futuro", category: "Gramática", duration: 10, description: "Fale sobre planos e intenções com going to.", question: "Complete: “She is ___ visit London.”", options: ["going to", "go to", "will to"], answer: "going to" },
  { id: "b1-1", level: "B1", title: "Experiências de vida", category: "Gramática", duration: 12, description: "Conecte experiências passadas ao presente com present perfect.", question: "Complete: “I have ___ to New York twice.”", options: ["be", "been", "was"], answer: "been" },
  { id: "b1-2", level: "B1", title: "Dê sua opinião", category: "Conversação", duration: 10, description: "Compartilhe ideias, concorde e discorde com naturalidade.", question: "Como começar uma opinião? “___, this is a great idea.”", options: ["In my opinion", "I am opinion", "For my think"], answer: "In my opinion" },
  { id: "b1-3", level: "B1", title: "Conecte suas ideias", category: "Escrita", duration: 11, description: "Use conectores para deixar suas histórias mais claras.", question: "Complete: “It was raining, ___ we stayed home.”", options: ["because", "so", "although"], answer: "so" },
  { id: "b2-1", level: "B2", title: "Explique possibilidades", category: "Gramática", duration: 12, description: "Explore condicionais para falar de hipóteses e consequências.", question: "Complete: “If I had more time, I ___ travel more.”", options: ["will", "would", "did"], answer: "would" },
  { id: "b2-2", level: "B2", title: "O inglês no trabalho", category: "Vocabulário", duration: 10, description: "Participe de reuniões e apresente suas ideias profissionalmente.", question: "O que significa “deadline”?", options: ["Prazo final", "Reunião inicial", "Promoção"], answer: "Prazo final" },
  { id: "b2-3", level: "B2", title: "Debata com confiança", category: "Conversação", duration: 13, description: "Construa argumentos e reconheça pontos de vista diferentes.", question: "O que “on the other hand” indica?", options: ["Uma conclusão", "Um contraste", "Um exemplo"], answer: "Um contraste" },
  { id: "c1-1", level: "C1", title: "Nuances e expressões", category: "Vocabulário", duration: 14, description: "Entenda expressões idiomáticas e o que elas comunicam além do literal.", question: "“To hit the nail on the head” significa:", options: ["Acertar em cheio", "Começar uma tarefa", "Desistir de algo"], answer: "Acertar em cheio" },
  { id: "c1-2", level: "C1", title: "Escrita persuasiva", category: "Escrita", duration: 15, description: "Organize argumentos complexos em textos claros e convincentes.", question: "Qual conector introduz uma ressalva formal?", options: ["Nevertheless", "By the way", "First of all"], answer: "Nevertheless" },
  { id: "c1-3", level: "C1", title: "Comunique com precisão", category: "Conversação", duration: 12, description: "Ajuste tom e escolha de palavras a diferentes situações.", question: "Qual expressão soa mais diplomática?", options: ["You are wrong.", "I see your point, however…", "That makes no sense."], answer: "I see your point, however…" },
  { id: "c2-1", level: "C2", title: "Domínio de registros", category: "Comunicação", duration: 15, description: "Alterne entre registros formais, informais e acadêmicos com precisão.", question: "Qual opção é mais formal?", options: ["Kids", "Children", "Little ones"], answer: "Children" },
  { id: "c2-2", level: "C2", title: "Leia nas entrelinhas", category: "Compreensão", duration: 14, description: "Interprete ironia, referências culturais e significados implícitos.", question: "Uma afirmação “tongue-in-cheek” é:", options: ["Levada literalmente", "Feita com humor ou ironia", "Muito formal"], answer: "Feita com humor ou ironia" },
  { id: "c2-3", level: "C2", title: "Refine sua expressão", category: "Escrita", duration: 16, description: "Aprimore estilo, ritmo e precisão em textos sofisticados.", question: "“Concise” descreve um texto que é:", options: ["Breve e claro", "Complexo e longo", "Informal e engraçado"], answer: "Breve e claro" },
];

const cardsByLevel: Record<LevelId, Flashcard[]> = {
  A1: [
    { front: "Hello", back: "Olá", pronunciation: "/həˈloʊ/" },
    { front: "Thank you", back: "Obrigado(a)", pronunciation: "/ˈθæŋk juː/" },
    { front: "Good morning", back: "Bom dia", pronunciation: "/ɡʊd ˈmɔːrnɪŋ/" },
    { front: "How are you?", back: "Como você está?", pronunciation: "/haʊ ɑːr juː/" },
    { front: "Nice to meet you", back: "Prazer em conhecer você", pronunciation: "/naɪs tə miːt juː/" },
  ],
  A2: [
    { front: "Yesterday", back: "Ontem", pronunciation: "/ˈjestərdeɪ/" },
    { front: "Could you help me?", back: "Você poderia me ajudar?", pronunciation: "/kʊd juː help miː/" },
    { front: "I would like…", back: "Eu gostaria de…", pronunciation: "/aɪ wʊd laɪk/" },
    { front: "Around the corner", back: "Logo ali na esquina", pronunciation: "/əˈraʊnd ðə ˈkɔːrnər/" },
  ],
  B1: [
    { front: "As far as I know", back: "Até onde eu sei", pronunciation: "/æz fɑːr æz aɪ noʊ/" },
    { front: "I have been there", back: "Eu já estive lá", pronunciation: "/aɪ hæv bɪn ðer/" },
    { front: "It depends on…", back: "Depende de…", pronunciation: "/ɪt dɪˈpendz ɑːn/" },
    { front: "On the other hand", back: "Por outro lado", pronunciation: "/ɑːn ði ˈʌðər hænd/" },
  ],
  B2: [
    { front: "To meet a deadline", back: "Cumprir um prazo", pronunciation: "/tə miːt ə ˈdedlaɪn/" },
    { front: "That makes sense", back: "Isso faz sentido", pronunciation: "/ðæt meɪks sens/" },
    { front: "To bring something up", back: "Mencionar um assunto", pronunciation: "/tə brɪŋ ˈsʌmθɪŋ ʌp/" },
    { front: "As a matter of fact", back: "Na verdade / aliás", pronunciation: "/æz ə ˈmætər əv fækt/" },
  ],
  C1: [
    { front: "To hit the nail on the head", back: "Acertar em cheio", pronunciation: "/tə hɪt ðə neɪl ɑːn ðə hed/" },
    { front: "Nevertheless", back: "No entanto", pronunciation: "/ˌnevərðəˈles/" },
    { front: "To shed light on", back: "Esclarecer / lançar luz sobre", pronunciation: "/tə ʃed laɪt ɑːn/" },
    { front: "By all means", back: "Certamente / fique à vontade", pronunciation: "/baɪ ɔːl miːnz/" },
  ],
  C2: [
    { front: "Tongue-in-cheek", back: "Irônico, dito com humor", pronunciation: "/ˌtʌŋ ɪn ˈtʃiːk/" },
    { front: "To read between the lines", back: "Ler nas entrelinhas", pronunciation: "/tə riːd bɪˈtwiːn ðə laɪnz/" },
    { front: "Notwithstanding", back: "Não obstante", pronunciation: "/ˌnɑːtwɪðˈstændɪŋ/" },
    { front: "Concise", back: "Breve e claro", pronunciation: "/kənˈsaɪs/" },
  ],
};

const initialProfile: Profile = {
  name: "",
  email: "",
  level: "A1",
  goal: "Conversar em viagens",
  dailyMinutes: 20,
  onboardingComplete: false,
  completedLessons: [],
};

const levelNames: Record<LevelId, string> = { A1: "Beginner", A2: "Elementary", B1: "Intermediate", B2: "Upper intermediate", C1: "Advanced", C2: "Proficient" };
const storageKey = "fluencia-profile-v1";

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<PageId>("home");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [goal, setGoal] = useState("Conversar em viagens");
  const [dailyMinutes, setDailyMinutes] = useState(20);
  const [selectedLevel, setSelectedLevel] = useState<LevelId>("A1");
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState<"correct" | "incorrect" | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isProfile(parsed)) setProfile(parsed);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready && profile.email) {
      window.localStorage.setItem(storageKey, JSON.stringify(profile));
    }
  }, [profile, ready]);

  const currentLevelIndex = levels.findIndex((level) => level.id === profile.level);
  const currentLessons = lessons.filter((lesson) => lesson.level === profile.level);
  const completedInLevel = currentLessons.filter((lesson) => profile.completedLessons.includes(lesson.id)).length;
  const progressPercent = Math.round((completedInLevel / currentLessons.length) * 100);
  const nextLesson = currentLessons.find((lesson) => !profile.completedLessons.includes(lesson.id));
  const allCards = useMemo(() => cardsByLevel[profile.level], [profile.level]);
  const activeCard = allCards[cardIndex % allCards.length];

  function updateProfile(nextProfile: Profile) {
    setProfile(nextProfile);
    window.localStorage.setItem(storageKey, JSON.stringify(nextProfile));
  }

  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = nameInput.trim();
    const email = emailInput.trim();
    if (name.length < 2 || !emailInput.includes("@")) return;
    updateProfile({ ...initialProfile, name, email });
  }

  function finishOnboarding() {
    updateProfile({ ...profile, level: selectedLevel, goal, dailyMinutes, onboardingComplete: true });
    setPage("home");
  }

  function openLesson(lesson: Lesson) {
    setActiveLesson(lesson);
    setSelectedAnswer("");
    setAnswerResult(null);
  }

  function submitAnswer() {
    if (!activeLesson || !selectedAnswer) return;
    const isCorrect = selectedAnswer === activeLesson.answer;
    setAnswerResult(isCorrect ? "correct" : "incorrect");
    if (isCorrect && !profile.completedLessons.includes(activeLesson.id)) {
      const completedLessons = [...profile.completedLessons, activeLesson.id];
      const levelLessonIds = lessons.filter((lesson) => lesson.level === profile.level).map((lesson) => lesson.id);
      const levelComplete = levelLessonIds.every((id) => completedLessons.includes(id));
      const nextLevel = levels[currentLevelIndex + 1];
      updateProfile({ ...profile, completedLessons, level: levelComplete && nextLevel ? nextLevel.id : profile.level });
    }
  }

  if (!ready) {
    return <main className="loading-screen"><div className="brand-mark">f.</div><span>Preparando seu espaço de estudos...</span></main>;
  }

  if (!profile.email) {
    return (
      <main className="auth-screen">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <header className="auth-header"><a className="brand" href="#"><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a><span className="auth-header-note">Seu próximo capítulo começa aqui</span></header>
        <section className="auth-content">
          <div className="auth-copy">
            <span className="eyebrow"><span className="live-dot" /> SUA JORNADA, NO SEU RITMO</span>
            <h1>O inglês que você quer.<br /><span>Um passo de cada vez.</span></h1>
            <p>Um espaço de aprendizagem feito para você praticar, avançar de nível e perceber seu progresso de verdade.</p>
            <div className="auth-proof"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span></div><div><strong>Aprenda fazendo</strong><small>Lições curtas. Progresso real.</small></div></div>
            <div className="auth-quote"><span>“</span><p>Você não precisa ser fluente para começar.<br />Só precisa começar.</p></div>
          </div>
          <form className="auth-card" onSubmit={register}>
            <div className="card-topline"><span>COMECE SUA JORNADA</span><span className="step-count">01 <i>/ 02</i></span></div>
            <h2>Crie seu espaço</h2>
            <p className="card-intro">Vamos preparar um plano de estudos com a sua cara.</p>
            <label htmlFor="name">Como podemos te chamar?</label>
            <input id="name" autoComplete="name" value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="Seu primeiro nome" required minLength={2} />
            <label htmlFor="email">Seu melhor e-mail</label>
            <input id="email" type="email" autoComplete="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="voce@exemplo.com" required />
            <button className="button button-primary auth-submit" type="submit">Criar minha conta <span>↗</span></button>
            <div className="privacy-note"><span>◈</span> Seus dados ficam somente neste dispositivo, por enquanto.</div>
            <div className="auth-divider"><span /> <small>SEM PRESSÃO, SEM PRAZO</small> <span /></div>
            <div className="auth-perks"><span>✦ No seu ritmo</span><span>✦ Conteúdo por nível</span></div>
          </form>
        </section>
        <footer className="auth-footer"><span>© 2026 Fluência</span><span>Aprender um idioma é abrir novas portas.</span><span>Feito para quem está começando.</span></footer>
      </main>
    );
  }

  if (!profile.onboardingComplete) {
    return (
      <main className="onboarding-screen">
        <header className="onboarding-header"><a className="brand" href="#"><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a><span className="onboarding-progress-label">PERFIL DE APRENDIZAGEM <strong>01 <i>/ 01</i></strong></span></header>
        <section className="onboarding-wrap">
          <div className="onboarding-heading"><span className="eyebrow"><span className="live-dot" /> UM PLANO COM A SUA CARA</span><h1>Conhecendo <span>você.</span></h1><p>Não é uma prova. É só um ponto de partida para a gente acertar o ritmo.</p></div>
          <div className="onboarding-card">
            <div className="question-block">
              <div className="question-number">01 <span>—</span> 03</div>
              <div><h2>Como está seu inglês hoje?</h2><p>Escolha a opção que mais combina com você. Você poderá mudar de nível depois.</p></div>
            </div>
            <div className="level-options">
              {[
                { id: "A1" as LevelId, emoji: "🌱", label: "Estou começando", detail: "Quero aprender do zero." },
                { id: "A2" as LevelId, emoji: "🌿", label: "Sei um pouco", detail: "Entendo frases simples e familiares." },
                { id: "B1" as LevelId, emoji: "🌳", label: "Já me viro", detail: "Consigo conversar sobre assuntos do dia a dia." },
                { id: "B2" as LevelId, emoji: "🚀", label: "Tenho uma boa base", detail: "Me comunico bem, mas quero mais confiança." },
                { id: "C1" as LevelId, emoji: "✨", label: "Quero aperfeiçoar", detail: "Já tenho fluência e busco mais precisão." },
                { id: "C2" as LevelId, emoji: "👑", label: "Quero dominar os detalhes", detail: "Tenho domínio e quero refinar ainda mais." },
              ].map((option) => (
                <button key={option.id} className={`level-option ${selectedLevel === option.id ? "selected" : ""}`} onClick={() => setSelectedLevel(option.id)} type="button">
                  <span className="level-emoji">{option.emoji}</span><span className="level-option-text"><strong>{option.label}</strong><small>{option.detail}</small></span><span className="radio-mark">{selectedLevel === option.id ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <div className="onboarding-extras">
              <div><label htmlFor="goal">O que você quer conquistar?</label><select id="goal" value={goal} onChange={(event) => setGoal(event.target.value)}><option>Conversar em viagens</option><option>Crescer na carreira</option><option>Entender filmes e séries</option><option>Estudar ou morar fora</option><option>Aprender por prazer</option></select></div>
              <div><label htmlFor="minutes">Quanto tempo por dia?</label><select id="minutes" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))}><option value={10}>10 minutos</option><option value={20}>20 minutos</option><option value={30}>30 minutos</option><option value={45}>45 minutos</option></select></div>
            </div>
            <div className="onboarding-bottom"><span>Você pode ajustar seu plano quando quiser.</span><button className="button button-primary" onClick={finishOnboarding}>Montar meu plano <span>↗</span></button></div>
          </div>
          <div className="onboarding-note"><span>✦</span> Sem testes longos. O melhor nível é aquele em que você se sente desafiado, mas confortável.</div>
        </section>
      </main>
    );
  }

  const navItems: { id: PageId; icon: string; label: string }[] = [
    { id: "home", icon: "⌂", label: "Visão geral" },
    { id: "lessons", icon: "▤", label: "Conteúdo" },
    { id: "cards", icon: "▧", label: "Cards" },
    { id: "progress", icon: "◷", label: "Meu progresso" },
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <a className="brand sidebar-brand" href="#" onClick={() => setPage("home")}><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a>
        <div className="sidebar-label">SEU ESPAÇO</div>
        <nav className="side-nav" aria-label="Menu principal">
          {navItems.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileMenuOpen(false); }}><span className="nav-icon">{item.icon}</span>{item.label}{page === item.id && <span className="nav-active-dot" />}</button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-language"><div className="language-icon">🇬🇧</div><div><small>APRENDENDO</small><strong>Inglês <span>⌄</span></strong></div></div>
        <div className="profile-button"><span className="profile-avatar">{profile.name.charAt(0).toUpperCase()}</span><span className="profile-details"><strong>{profile.name}</strong><small>{levelNames[profile.level]} · {profile.level}</small></span></div>
      </aside>
      {mobileMenuOpen && <button aria-label="Fechar menu" className="menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <div className="app-main">
        <header className="topbar"><button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">☰</button><div className="breadcrumb">Meu espaço <span>/</span> <strong>{navItems.find((item) => item.id === page)?.label}</strong></div><div className="topbar-right"><span className="streak"><span>✦</span> 3 dias</span><span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span></div></header>
        <div className="page-content">
          {page === "home" && <HomePage profile={profile} progressPercent={progressPercent} completedInLevel={completedInLevel} levelIndex={currentLevelIndex} nextLesson={nextLesson} onStudy={() => nextLesson && openLesson(nextLesson)} onPage={setPage} onSelectLesson={openLesson} />}
          {page === "lessons" && <LessonsPage profile={profile} onSelectLesson={openLesson} />}
          {page === "cards" && <CardsPage level={profile.level} card={activeCard} index={cardIndex} total={allCards.length} flipped={cardFlipped} onFlip={() => setCardFlipped((value) => !value)} onNext={() => { setCardIndex((value) => (value + 1) % allCards.length); setCardFlipped(false); }} />}
          {page === "progress" && <ProgressPage profile={profile} levelIndex={currentLevelIndex} />}
          <footer className="app-footer"><span>Pequenos passos também levam longe. <span className="footer-heart">♥</span></span><span>Seu progresso fica salvo neste dispositivo.</span></footer>
        </div>
      </div>
      {activeLesson && <LessonModal lesson={activeLesson} selectedAnswer={selectedAnswer} result={answerResult} completed={profile.completedLessons.includes(activeLesson.id)} onSelect={setSelectedAnswer} onSubmit={submitAnswer} onClose={() => setActiveLesson(null)} />}
    </main>
  );
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Profile>;
  return typeof candidate.name === "string" && typeof candidate.email === "string" && typeof candidate.level === "string" && levels.some((level) => level.id === candidate.level) && typeof candidate.onboardingComplete === "boolean" && Array.isArray(candidate.completedLessons) && candidate.completedLessons.every((lesson) => typeof lesson === "string");
}

function HomePage({ profile, progressPercent, completedInLevel, levelIndex, nextLesson, onStudy, onPage, onSelectLesson }: {
  profile: Profile; progressPercent: number; completedInLevel: number; levelIndex: number; nextLesson?: Lesson; onStudy: () => void; onPage: (page: PageId) => void; onSelectLesson: (lesson: Lesson) => void;
}) {
  const recommendations = lessons.filter((lesson) => lesson.level === profile.level).slice(0, 3);
  const firstName = profile.name.split(" ")[0];
  return (
    <>
      <section className="welcome-row"><div><span className="eyebrow"><span className="live-dot" /> {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase()}</span><h1>Seu próximo passo, <span>{firstName}.</span></h1><p>Um pouco de inglês hoje já faz diferença amanhã.</p></div><div className="welcome-day"><span>☀️</span><div><strong>Seu momento de aprender</strong><small>Uma pausa de {profile.dailyMinutes} min para você</small></div></div></section>
      <section className="dashboard-grid">
        <div className="main-column">
          <article className="level-banner"><div className="banner-orbit orbit-one" /><div className="banner-orbit orbit-two" /><div className="level-banner-content"><div className="banner-top"><span className="banner-label"><span className="banner-spark">✦</span> SUA JORNADA ATUAL</span><span className="level-pill">{profile.level} <span>·</span> {levelNames[profile.level]}</span></div><h2>O começo de algo <em>grande.</em></h2><p>Você está construindo sua base no inglês. Cada pequena conquista conta — continue no seu ritmo.</p><div className="banner-progress"><div className="progress-meta"><span>Progresso neste nível</span><strong>{completedInLevel} <small>/ {lessons.filter((lesson) => lesson.level === profile.level).length} lições</small></strong></div><div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div><div className="progress-caption"><span>{progressPercent}% concluído</span><span>Nível {levelIndex + 1} de 6</span></div></div></div><div className="banner-art"><div className="art-circle"><span>✦</span></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✧</span><span className="art-spark spark-three">·</span><div className="art-word">hello<span>.</span></div><div className="art-label">uma palavra<br />de cada vez</div></div></article>
          <section className="section-block"><div className="section-title-row"><div><span className="section-kicker">SUA TRILHA</span><h2>Continue aprendendo</h2></div><button className="text-link" onClick={() => onPage("lessons")}>Ver todas <span>↗</span></button></div>
            <div className="lesson-feature">{nextLesson ? <><div className="lesson-feature-icon">{nextLesson.category === "Conversação" ? "◉" : nextLesson.category === "Gramática" ? "⌘" : "✦"}</div><div className="lesson-feature-info"><span className="lesson-category">{nextLesson.category} <i /> {nextLesson.duration} min</span><h3>{nextLesson.title}</h3><p>{nextLesson.description}</p><div className="lesson-feature-bottom"><span><span className="lesson-dot" /> PRÓXIMA NA SUA TRILHA</span><button className="button button-dark" onClick={onStudy}>Começar lição <span>→</span></button></div></div></> : <div className="level-finished"><span>🎉</span><h3>Você concluiu este nível!</h3><p>Seu próximo nível já está liberado. Explore a nova trilha.</p><button className="button button-primary" onClick={() => onPage("lessons")}>Ver próxima trilha <span>→</span></button></div>}</div>
          </section>
          <section className="section-block"><div className="section-title-row"><div><span className="section-kicker">PARA VOCÊ</span><h2>Na sua trilha de hoje</h2></div><span className="tiny-count">{profile.level} · {recommendations.length} lições</span></div><div className="lesson-list">{recommendations.map((lesson, index) => { const done = profile.completedLessons.includes(lesson.id); return <button key={lesson.id} className={`lesson-row ${done ? "lesson-done" : ""}`} onClick={() => onSelectLesson(lesson)}><span className={`lesson-index ${done ? "index-done" : ""}`}>{done ? "✓" : `0${index + 1}`}</span><span className="lesson-row-title"><strong>{lesson.title}</strong><small>{lesson.category} <i /> {lesson.duration} min</small></span><span className="lesson-row-status">{done ? "Concluída" : "→"}</span></button>; })}</div></section>
        </div>
        <aside className="right-column">
          <article className="daily-card"><div className="daily-card-top"><span className="daily-icon">✧</span><span className="daily-label">FOCO DE HOJE</span><span className="daily-menu">···</span></div><h3>Um hábito de cada vez.</h3><p>Seu objetivo é <strong>{profile.goal.toLowerCase()}</strong>. Um pouquinho de prática diária aproxima você dele.</p><div className="daily-goal"><div className="goal-circle"><span>{profile.dailyMinutes}</span></div><div><strong>minutos por dia</strong><small>seu combinado com você</small></div></div><button className="daily-link" onClick={onStudy}>Fazer minha prática <span>↗</span></button></article>
          <article className="week-card"><div className="week-heading"><div><span className="section-kicker">SEU RITMO</span><h3>Esta semana</h3></div><span className="week-total">3 <small>/ 5 dias</small></span></div><div className="week-days">{["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => <div key={`${day}-${index}`} className="week-day"><span>{day}</span><i className={index < 3 ? "day-active" : index === 3 ? "day-today" : ""}>{index < 3 ? "✓" : index === 3 ? "·" : ""}</i></div>)}</div><div className="week-caption"><span className="week-caption-dot" /> <span>Você está construindo consistência. Boa!</span></div></article>
          <article className="quote-card"><span className="quote-mark">“</span><p>Every expert was once a beginner.</p><span className="quote-source">— COMEÇAR É TUDO</span><span className="quote-decoration">✳</span></article>
          <button className="cards-promo" onClick={() => onPage("cards")}><span className="promo-icon">▧</span><span><strong>Um card por vez</strong><small>Revise palavras do seu nível.</small></span><span className="promo-arrow">↗</span></button>
        </aside>
      </section>
    </>
  );
}

function LessonsPage({ profile, onSelectLesson }: { profile: Profile; onSelectLesson: (lesson: Lesson) => void }) {
  const currentIndex = levels.findIndex((level) => level.id === profile.level);
  return <section className="inner-page"><div className="page-heading"><span className="eyebrow"><span className="live-dot" /> SUA TRILHA DE APRENDIZADO</span><h1>Conteúdo no <span>seu ritmo.</span></h1><p>Explore seu nível atual e veja o caminho que está construindo.</p></div><div className="level-roadmap">{levels.map((level, index) => { const unlocked = index <= currentIndex; const active = index === currentIndex; const levelLessons = lessons.filter((lesson) => lesson.level === level.id); const done = levelLessons.filter((lesson) => profile.completedLessons.includes(lesson.id)).length; return <section className={`roadmap-level ${active ? "roadmap-active" : ""} ${!unlocked ? "roadmap-locked" : ""}`} key={level.id}><div className="roadmap-heading"><span className="roadmap-level-number">{unlocked ? level.id : "⌑"}</span><div><span className="section-kicker">{active ? "SEU NÍVEL ATUAL" : `NÍVEL ${index + 1}`}</span><h2>{level.name}</h2><p>{level.subtitle}</p></div><span className="roadmap-count">{unlocked ? `${done}/${levelLessons.length} lições` : "🔒 Bloqueado"}</span></div>{unlocked && <div className="roadmap-lessons">{levelLessons.map((lesson, lessonIndex) => { const completed = profile.completedLessons.includes(lesson.id); return <button key={lesson.id} className="roadmap-lesson" onClick={() => onSelectLesson(lesson)}><span className={`roadmap-lesson-number ${completed ? "completed-number" : ""}`}>{completed ? "✓" : `0${lessonIndex + 1}`}</span><span className="roadmap-lesson-copy"><strong>{lesson.title}</strong><small>{lesson.category} <i /> {lesson.duration} min</small></span><span className="roadmap-lesson-arrow">{completed ? "Concluída" : "→"}</span></button>; })}</div>}</section>; })}</div></section>;
}

function CardsPage({ level, card, index, total, flipped, onFlip, onNext }: { level: LevelId; card: Flashcard; index: number; total: number; flipped: boolean; onFlip: () => void; onNext: () => void }) {
  return <section className="inner-page cards-page"><div className="page-heading"><span className="eyebrow"><span className="live-dot" /> REVISÃO INTELIGENTE · {level}</span><h1>Palavras que <span>ficam.</span></h1><p>Cards selecionados para o seu nível. Tente lembrar antes de virar.</p></div><div className="flashcard-wrap"><div className={`flashcard ${flipped ? "flashcard-flipped" : ""}`} role="button" tabIndex={0} onClick={onFlip} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onFlip(); }}><div className="flashcard-top"><span>{flipped ? "SIGNIFICADO" : "PALAVRA OU EXPRESSÃO"}</span><span>{String(index + 1).padStart(2, "0")} <i>/ {String(total).padStart(2, "0")}</i></span></div><div className="flashcard-content"><span className="flashcard-spark">✳</span><strong>{flipped ? card.back : card.front}</strong><small>{flipped ? card.front : card.pronunciation}</small></div><div className="flashcard-bottom"><span>✦ {flipped ? "Toque para ver a palavra" : "Toque para revelar o significado"}</span><span>↗</span></div></div><div className="cards-controls"><div className="cards-dots">{Array.from({ length: total }, (_, dot) => <span key={dot} className={dot === index ? "active-card-dot" : ""} />)}</div><button className="button button-primary" onClick={onNext}>Próximo card <span>→</span></button></div></div><div className="cards-tip"><span>✧</span><div><strong>Dica de estudo</strong><p>Fale a palavra em voz alta e tente montar uma frase antes de virar o card.</p></div></div></section>;
}

function ProgressPage({ profile, levelIndex }: { profile: Profile; levelIndex: number }) {
  const totalCompleted = profile.completedLessons.length;
  return <section className="inner-page"><div className="page-heading"><span className="eyebrow"><span className="live-dot" /> SUA EVOLUÇÃO</span><h1>Olha só até onde <span>você chegou.</span></h1><p>Progresso de verdade é feito de pequenas conquistas repetidas.</p></div><div className="progress-summary"><article className="progress-stat"><span className="stat-icon stat-mint">✦</span><strong>{totalCompleted}</strong><small>lições concluídas</small></article><article className="progress-stat"><span className="stat-icon stat-violet">↗</span><strong>{levelIndex + 1}<small> / 6</small></strong><small>nível atual: {profile.level}</small></article><article className="progress-stat"><span className="stat-icon stat-pink">◷</span><strong>{totalCompleted * 10}<small> min</small></strong><small>de prática acumulada</small></article></div><div className="progress-map"><div className="section-title-row"><div><span className="section-kicker">SEU CAMINHO</span><h2>Do primeiro hello ao próximo nível</h2></div><span className="tiny-count">{Math.round((levelIndex / 5) * 100)}% da jornada</span></div><div className="map-levels">{levels.map((level, index) => { const reached = index <= levelIndex; const complete = index < levelIndex; const levelCount = lessons.filter((lesson) => lesson.level === level.id).length; const levelDone = lessons.filter((lesson) => lesson.level === level.id && profile.completedLessons.includes(lesson.id)).length; return <div key={level.id} className={`map-level ${reached ? "map-reached" : ""} ${complete ? "map-complete" : ""}`}><span className="map-marker">{complete ? "✓" : reached ? "✦" : "·"}</span><div className="map-level-content"><div><strong>{level.id} <span>·</span> {level.name}</strong><small>{level.subtitle}</small></div><span className="map-level-status">{complete ? "Concluído" : reached ? `${levelDone} / ${levelCount} lições` : "A desbloquear"}</span></div></div>; })}</div></div><div className="progress-encouragement"><span>🌱</span><div><strong>Consistência acima de velocidade.</strong><p>Seu objetivo — {profile.goal.toLowerCase()} — começa com cada pequena sessão.</p></div></div></section>;
}

function LessonModal({ lesson, selectedAnswer, result, completed, onSelect, onSubmit, onClose }: { lesson: Lesson; selectedAnswer: string; result: "correct" | "incorrect" | null; completed: boolean; onSelect: (answer: string) => void; onSubmit: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-title"><button className="modal-close" onClick={onClose} aria-label="Fechar lição">×</button><span className="eyebrow"><span className="live-dot" /> {lesson.category.toUpperCase()} · {lesson.duration} MIN</span><div className="modal-step"><span>LIÇÃO INTERATIVA</span><span>✦ PRÁTICA</span></div><h2 id="lesson-title">{lesson.title}</h2><p className="modal-description">{lesson.description}</p><div className="exercise-box"><span className="exercise-label">HORA DE PRATICAR</span><h3>{lesson.question}</h3><div className="answer-options">{lesson.options.map((option, index) => <button key={option} className={`answer-option ${selectedAnswer === option ? "answer-selected" : ""} ${result && option === lesson.answer ? "answer-correct" : ""} ${result === "incorrect" && selectedAnswer === option ? "answer-incorrect" : ""}`} onClick={() => { onSelect(option); }} disabled={result === "correct" || completed}><span>{String.fromCharCode(65 + index)}</span>{option}<i>{result && option === lesson.answer ? "✓" : ""}</i></button>)}</div>{result === "incorrect" && <p className="answer-feedback feedback-error">Quase! Tente novamente — a resposta certa fica destacada.</p>}{(result === "correct" || completed) && <p className="answer-feedback feedback-success">Muito bem! Resposta certa. Seu progresso foi atualizado. ✨</p>}</div>{!(result === "correct" || completed) && <button className="button button-primary modal-submit" onClick={onSubmit} disabled={!selectedAnswer}>Conferir resposta <span>→</span></button>}{(result === "correct" || completed) && <button className="button button-primary modal-submit" onClick={onClose}>Continuar aprendendo <span>→</span></button>}<div className="modal-footer-note"><span>◈</span> Errar faz parte. Você pode tentar quantas vezes quiser.</div></section></div>;
}
