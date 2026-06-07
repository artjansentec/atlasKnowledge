# Atlas Knowledge

Atlas Knowledge é um protótipo de wiki corporativa para centralizar conhecimento de projetos em um único lugar. A proposta é reunir documentação, decisões, arquivos, histórico de mudanças e lições aprendidas para que equipes consigam encontrar contexto rapidamente, reduzir retrabalho e transformar experiências passadas em material reutilizável.

O produto parte da ideia de que conhecimento importante costuma ficar espalhado entre conversas, documentos soltos, arquivos locais e memória das pessoas. O Atlas Knowledge organiza esse conteúdo por projeto e oferece uma experiência visual para consultar, editar e buscar informações relevantes.

## Ideia do projeto

O objetivo do Atlas Knowledge é funcionar como uma base de conhecimento interna para equipes de produto, engenharia, operação e áreas de negócio. Cada projeto possui sua própria página com documentação em Markdown, responsáveis, status, tecnologias, anexos, lições aprendidas e histórico.

Na prática, a aplicação ajuda a responder perguntas como:

- O que esse projeto faz e qual é o seu escopo?
- Quem é a pessoa responsável?
- Quais decisões já foram tomadas?
- Quais documentos e arquivos estão relacionados?
- Que aprendizados podem orientar próximos projetos?
- O que mudou recentemente?

Além de organizar projetos ativos, a ideia também é preservar conhecimento de projetos pausados ou concluídos, mantendo decisões e aprendizados acessíveis para novas iniciativas.

## Funcionalidades atuais

- Dashboard com indicadores de projetos, documentos, lições e atualizações recentes.
- Listagem de projetos com busca local, filtros por status e cards resumidos.
- Página de detalhe do projeto com abas para documentação, arquivos, lições e histórico.
- Leitor de documentação com navegação por seções e modo de leitura em tela cheia.
- Editor Markdown com preview lado a lado para simular atualização de conteúdo.
- Central de lições aprendidas com busca por título, descrição, recomendação, projeto ou responsável.
- Busca global por projetos, seções, lições e atualizações.
- Tela de criação de projeto com prévia visual e documentação inicial em Markdown.
- Tela de login demonstrativa para representar o acesso corporativo.

## Fluxo principal

1. O usuário acessa a aplicação pela tela de login demonstrativa.
2. No dashboard, visualiza um resumo da base de conhecimento e as atualizações recentes.
3. Em projetos, filtra iniciativas por status ou busca por termos relacionados.
4. Ao abrir um projeto, consulta documentação, anexos, lições aprendidas e histórico.
5. Quando necessário, edita uma seção em Markdown e acompanha o preview antes de salvar.
6. Em lições ou busca global, encontra rapidamente aprendizados e conteúdos reutilizáveis.

## Estado atual do protótipo

O projeto usa dados locais tipados em TypeScript para representar projetos, documentos, anexos, lições e histórico. A criação de projeto salva uma demonstração no navegador, mas a lista compartilhada ainda depende de integração futura com uma camada de persistência.

Recursos planejados ou sugeridos pelo próprio protótipo:

- Persistência real de documentos e projetos.
- Upload real de anexos.
- Auditoria completa de alterações.
- Ranking de busca por relevância.
- Filtros avançados por responsável, status e área.
- Sugestões automáticas com IA.
- Templates de documentação por tipo de projeto.
- Métricas de uso por área.
- Geração automática de documentação a partir de transcrições de reuniões.

## Stack

- React
- TypeScript
- Vite
- React Router
- Lucide React
- ESLint

## Estrutura geral

```text
src/
  components/      Componentes reutilizáveis da interface
  lib/             Dados e funções utilitárias dos projetos
  pages/           Telas principais da aplicação
  pages/css/       Estilos específicos de cada página
  App.tsx          Definição das rotas
  index.css        Tokens visuais, tema e estilos globais
```

## Como rodar

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

Gere a build de produção:

```bash
npm run build
```

Execute a verificação de lint:

```bash
npm run lint
```

Visualize a build localmente:

```bash
npm run preview
```

## Rotas principais

- `/login`: tela de entrada demonstrativa.
- `/`: dashboard com visão geral.
- `/projects`: listagem e filtros de projetos.
- `/projects/new`: criação local de um novo projeto.
- `/projects/:slug`: detalhe de um projeto.
- `/lessons`: central de lições aprendidas.
- `/search`: busca global.

## Visão de produto

O Atlas Knowledge busca ser mais do que um repositório de documentos. A intenção é criar uma memória operacional da empresa: um lugar onde contexto, decisões e aprendizados fiquem conectados aos projetos que os originaram.

Com isso, novos membros conseguem se ambientar mais rápido, equipes evitam repetir erros já identificados e lideranças têm mais clareza sobre o estado e o histórico das iniciativas.
