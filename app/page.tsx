import { readFileSync } from "node:fs";
import { join } from "node:path";

export default function HomePage() {
  const source = readFileSync(join(process.cwd(), "aprender-ingles.html"), "utf8");
  const styles = source.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
  const content = source.match(/<body[^>]*>([\s\S]*?)<script[\s\S]*?<\/script>\s*<\/body>/i)?.[1];

  if (!styles || !content) {
    throw new Error("Não foi possível carregar a página inicial de aprender-ingles.html.");
  }

  return (
    <>
      <style>{styles}</style>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </>
  );
}
