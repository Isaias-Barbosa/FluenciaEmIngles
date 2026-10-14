# Fluência

Uma plataforma de estudos de idiomas que transforma o guia de inglês em uma experiência personalizada: a pessoa cria seu perfil, indica seu nível e objetivo e recebe uma trilha de aprendizagem com lições, exercícios, cards de vocabulário e acompanhamento de progresso.

## Executar localmente

Requisitos: Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## O que já funciona

- Cadastro demonstrativo e questionário de nivelamento.
- Área de estudos com trilha organizada nos níveis CEFR A1 a C2.
- Lições com exercícios interativos; respostas corretas salvam o progresso e liberam o próximo nível.
- Cards de vocabulário selecionados conforme o nível atual.
- Visão de progresso, objetivo pessoal e rotina semanal demonstrativa.
- Perfil e progresso salvos no armazenamento local do navegador.

> Esta versão é um protótipo: não há autenticação real nem backend. O cadastro e os dados de aprendizagem ficam somente no dispositivo atual.

## Tecnologias

- Next.js com App Router
- React e TypeScript
- CSS responsivo sem biblioteca de componentes

O arquivo `aprender-ingles.html` permanece no repositório como a versão original do guia estático.
