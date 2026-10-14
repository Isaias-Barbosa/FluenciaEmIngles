import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-screen">
      <a className="brand" href="/"><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a>
      <section className="not-found-card">
        <span className="section-kicker">PÁGINA NÃO ENCONTRADA</span>
        <strong>404</strong>
        <h1>Este caminho não está disponível.</h1>
        <p>A página pode não existir ou você pode não ter permissão para acessá-la.</p>
        <Link className="button button-primary" href="/learn">Voltar para o início <span>→</span></Link>
      </section>
    </main>
  );
}
