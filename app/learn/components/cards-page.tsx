"use client";
import { useCallback,useEffect,useState } from "react";
import FlashcardReviewDialog, {type StudyCard} from "./flashcard-review-dialog";
import { useFlashcardProgress,type CardRating } from "./use-flashcard-progress";
export default function CardsPage({ level, cards, studentName, userId }: { level: string; cards: StudyCard[]; studentName: string; userId:string }) {
  const [deck, setDeck] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewOpen,setReviewOpen] = useState(false);
  const closeReview = useCallback(()=>setReviewOpen(false),[]);
  const progress = useFlashcardProgress(userId,cards.map(card=>card.id));
  const rememberedCount = cards.filter(card=>progress.ratings[card.id]==="remembered").length;
  const reviewCards = cards.filter(card=>progress.ratings[card.id]==="review");
  const reviewCount = reviewCards.length;
  useEffect(()=>{setDeck(cards);setIndex(0);setFlipped(false);},[cards]);

  const card = deck[index] ?? null;

  function moveTo(nextIndex: number) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  function shuffleCards() {
    const shuffled = [...deck];
    for (let current = shuffled.length - 1; current > 0; current -= 1) {
      const randomIndex = Math.floor(Math.random() * (current + 1));
      [shuffled[current], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[current]];
    }
    setDeck(shuffled);
    moveTo(0);
  }

  function restartCards() {
    setDeck(cards);
    moveTo(0);
  }

  async function markCard(mark: CardRating) {
    if (card && await progress.rate(card.id,mark)) moveTo(Math.min(index+1,deck.length-1));
  }

  return (
    <section className="inner-page cards-page">
      {reviewOpen && <FlashcardReviewDialog cards={reviewCards} onClose={closeReview} onLearned={id=>{void progress.rate(id,"remembered");}} saving={progress.saving} error={progress.error}/>}
      <div className="page-heading">
        <span className="eyebrow"><span className="live-dot" /> REVISÃO INTELIGENTE · {level}</span>
        <h1>Palavras que <span>ficam.</span></h1>
        <p>Cards selecionados para o seu nível. Tente lembrar antes de virar.</p>
      </div>
      {card ? (
        <div className="cards-layout">
          <div className="flashcard-wrap">
          <div className="cards-toolbar">
            <button className="button button-dark" type="button" onClick={shuffleCards}>Embaralhar <span>⤨</span></button>
            <button className="button button-dark" type="button" onClick={restartCards}>Reiniciar <span>↺</span></button>
          </div>
          <div
            className={`flashcard ${flipped ? "flashcard-flipped" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Card virado. Ative para ver a palavra em inglês." : "Ative para virar o card e ver o significado."}
            onClick={() => setFlipped((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setFlipped((current) => !current);
              }
            }}
          >
            <div className="flashcard-top">
              <span>{flipped ? "SIGNIFICADO" : "PALAVRA OU EXPRESSÃO"}</span>
              <span>{String(index + 1).padStart(2, "0")} <i>/ {String(deck.length).padStart(2, "0")}</i></span>
            </div>
            <div className="flashcard-content">
              <span className="flashcard-spark">✳</span>
              <strong>{flipped ? card.back : card.front}</strong>
              <small>{flipped ? card.front : card.pronunciation}</small>
            </div>
            <div className="flashcard-bottom"><span>✦ {flipped ? "Toque para ver a palavra" : "Toque para revelar o significado"}</span><span>↗</span></div>
          </div>
          <div className="cards-flip-control">
            <button className="button button-dark" type="button" aria-pressed={flipped} onClick={() => setFlipped((current) => !current)}>
              {flipped ? "Ver a palavra" : "Virar o card"} <span>↻</span>
            </button>
          </div>
          <div className="cards-controls">
            <button className="button button-dark" type="button" disabled={index === 0} onClick={() => moveTo(index - 1)}><span>←</span> Anterior</button>
            <span className="cards-progress">{index + 1} de {deck.length}</span>
            <button className="button button-primary" type="button" disabled={index === deck.length - 1} onClick={() => moveTo(index + 1)}>Próximo <span>→</span></button>
          </div>
          {flipped && <div className="cards-rating-actions"><span>Como foi?</span><button className="button button-success" type="button" disabled={!progress.ready || progress.saving} onClick={() => void markCard("remembered")}>Acertei <span>✓</span></button><button className="button button-review" type="button" disabled={!progress.ready || progress.saving} onClick={() => void markCard("review")}>Para revisar <span>↻</span></button></div>}
          <button className="button button-dark cards-review-button" type="button" onClick={()=>setReviewOpen(true)}>Questões de revisão ({reviewCount}) ↻</button>
          {progress.error && <p role="alert" className="form-message form-error">{progress.error} {!progress.ready && <button type="button" className="journey-text-button" onClick={progress.retry}>Tentar novamente</button>}</p>}
          {!progress.ready && !progress.error && <p role="status">Carregando seu progresso…</p>}
          </div>
          <aside className="session-card">
            <div className="session-card-heading"><span className="section-kicker">SEU PROGRESSO</span><span className="session-live-dot" /></div>
            <div className="session-avatar">{studentName.charAt(0).toUpperCase()}</div>
            <h2>{studentName}</h2>
            <p>Revisão de vocabulário · nível {level}</p>
            <div className="session-stat"><span>Cards marcados</span><strong>{rememberedCount + reviewCount} <small>/ {deck.length}</small></strong></div>
            <div className="session-track"><span style={{ width: `${((rememberedCount + reviewCount) / deck.length) * 100}%` }} /></div>
            <div className="session-results"><div><span className="result-icon result-success">✓</span><small>Acertei</small><strong>{rememberedCount}</strong></div><div><span className="result-icon result-review">↻</span><small>Para revisar</small><strong>{reviewCount}</strong></div></div>
            <p className="session-note">Suas marcações ficam salvas na sua conta. Embaralhar ou reiniciar mantém seu progresso.</p>
          </aside>
        </div>
      ) : <div className="empty-state">Ainda não há cards publicados para este nível.</div>}
      <div className="cards-tip">
        <span>✧</span>
        <div><strong>Como estudar:</strong><p>escolha um nível, tente lembrar o significado antes de virar o card e marque as palavras que precisa rever. A classificação CEFR é aproximada e serve como guia de estudo.</p></div>
      </div>
    </section>
  );
}

