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

## Resumo do que já foi feito

O Atlas Knowledge já está estruturado como um protótipo navegável de uma wiki corporativa. A aplicação possui shell principal com menu lateral, cabeçalho com busca, tela de login demonstrativa e rotas organizadas para dashboard, projetos, criação de projeto, detalhe, lições aprendidas e busca global.

Principais entregas implementadas:

- Dashboard com indicadores de projetos, documentos, lições aprendidas e atualizações recentes.
- Listagem de projetos com cards, métricas, busca local, filtro por status e linha do tempo de mudanças.
- Página de detalhe de projeto com abas para documentação, arquivos, lições aprendidas e histórico.
- Leitor de documentação em Markdown com navegação por seções, subseções e modo de leitura em tela cheia.
- Editor Markdown com preview para simular atualização de conteúdo do projeto.
- Gestão visual de seções na tela de detalhe, incluindo criação, renomeação, remoção e reordenação em estado local.
- Referências a arquivos dentro do Markdown usando o formato `[[arquivo:nome-do-arquivo]]`.
- Área de arquivos com dados mockados, incluindo um PDF local usado como anexo demonstrativo.
- Central de lições aprendidas com filtros por tipo e busca por título, descrição, recomendação, tags, projeto e responsável.
- Busca global por projetos, seções de documentação, lições aprendidas e histórico de atualizações.
- Tela de criação de projeto com formulário, geração de slug, preview visual e documentação inicial em Markdown.
- Controle demonstrativo de permissões por papel e responsável do projeto.
- Dados mockados tipados em TypeScript para projetos, anexos, lições, seções e histórico.
- Estilização das páginas principais com CSS dedicado e componentes reutilizáveis para shell, badges e visualização Markdown.

## Fluxo principal

1. O usuário acessa a aplicação pela tela de login demonstrativa.
2. No dashboard, visualiza um resumo da base de conhecimento e as atualizações recentes.
3. Em projetos, filtra iniciativas por status ou busca por termos relacionados.
4. Ao abrir um projeto, consulta documentação, anexos, lições aprendidas e histórico.
5. Quando necessário, edita uma seção em Markdown e acompanha o preview antes de salvar.
6. Em lições ou busca global, encontra rapidamente aprendizados e conteúdos reutilizáveis.

## Fase atual do projeto

O projeto está na fase de protótipo funcional de front-end. A experiência principal já pode ser navegada e validada visualmente, com fluxos suficientes para demonstrar a proposta de valor da wiki corporativa: centralizar documentação, decisões, arquivos, histórico e aprendizados por projeto.

Nesta fase, a aplicação ainda não possui backend real. Os projetos vêm de arquivos mockados em TypeScript, e algumas ações de edição ou criação funcionam apenas como simulação local no navegador. Isso significa que o produto já serve para apresentação, validação de UX e alinhamento de escopo, mas ainda não está pronto para uso em produção com múltiplos usuários.

O estágio atual pode ser resumido assim:

- Interface e navegação principal: implementadas.
- Modelo de dados inicial: definido em TypeScript.
- Conteúdo de demonstração: cadastrado em mocks locais.
- Busca e filtros: implementados no cliente.
- Leitura e edição Markdown: implementadas como experiência local.
- Controle de permissão: demonstrativo, ainda sem autenticação real.
- Persistência, upload e auditoria: pendentes de backend.

## Próximos passos

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

## Visão de produto

O Atlas Knowledge busca ser mais do que um repositório de documentos. A intenção é criar uma memória operacional da empresa: um lugar onde contexto, decisões e aprendizados fiquem conectados aos projetos que os originaram.

Com isso, novos membros conseguem se ambientar mais rápido, equipes evitam repetir erros já identificados e lideranças têm mais clareza sobre o estado e o histórico das iniciativas.
