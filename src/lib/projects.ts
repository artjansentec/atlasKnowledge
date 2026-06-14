import { backendFiles } from './mock-backend'

export type ProjectStatus = 'active' | 'paused' | 'done'

export type Section = {
  id: string
  title: string
  content: string
  children?: Section[]
}

export type ProjectAttachment = {
  id: string
  backendFileId?: string
  name: string
  type: string
  mimeType?: string
  size: string
  uploadedAt: string
  url?: string
}

export type ProjectLesson = {
  id: string
  title: string
  description: string
  recommendation: string
  createdAt: string
  tags?: string[]
}

export type ProjectHistory = {
  id: string
  at: string
  author: string
  action: string
  target: string
}

export type Project = {
  id: string
  slug: string
  name: string
  description: string
  status: ProjectStatus
  responsible: string
  readers?: string[]
  client?: string
  createdAt: string
  updatedAt: string
  tags: string[]
  tech?: string[]
  attachments: ProjectAttachment[]
  lessons: ProjectLesson[]
  sections: Section[]
  history: ProjectHistory[]
}

export const projects: Project[] = [
  {
    id: 'p-1',
    slug: 'atlas-knowledge',
    name: 'Atlas Knowledge',
    description: 'Wiki corporativa para centralizar documentação, decisões e aprendizados.',
    status: 'active',
    responsible: 'Marina Alves',
    client: 'Operações internas',
    createdAt: '2026-05-12',
    updatedAt: '2026-06-06',
    tags: ['wiki', 'conhecimento', 'onboarding'],
    tech: ['React', 'Vite', 'TypeScript'],
    attachments: [
      {
        ...backendFiles.geobExamPdf,
        id: 'a-1',
        backendFileId: backendFiles.geobExamPdf.id,
      },
      {
        id: 'a-2',
        name: 'decisoes-arquitetura.md',
        type: 'md',
        size: '42 KB',
        uploadedAt: '2026-06-04',
      },
      {
        id: 'a-3',
        name: 'fluxo-editor.png',
        type: 'png',
        size: '860 KB',
        uploadedAt: '2026-06-05',
      },
    ],
    lessons: [
      {
        id: 'l-1',
        title: 'Padronizar onboarding reduz dúvidas repetidas',
        description:
          'As dúvidas mais frequentes caíram quando a documentação passou a ter um caminho inicial claro.',
        recommendation:
          'Mantenha uma seção de primeiros passos antes de expandir documentação técnica detalhada.',
        createdAt: '2026-06-02',
        tags: ['onboarding', 'documentacao', 'suporte'],
      },
      {
        id: 'l-2',
        title: 'Histórico curto melhora adoção',
        description: 'Registros objetivos de mudanças ajudaram as equipes a confiar na atualização da wiki.',
        recommendation: 'Inclua autor, data e alvo em cada mudança relevante do projeto.',
        createdAt: '2026-06-06',
        tags: ['historico', 'confianca', 'governanca'],
      },
    ],
    sections: [
      {
        id: 'overview',
        title: 'Visão geral',
        content:
          '# Visão geral\n\nO Atlas Knowledge centraliza documentação, decisões e aprendizados em uma experiência única para equipes de produto, engenharia e operação.\n\n## Objetivos\n\n- Reduzir conhecimento espalhado em conversas e arquivos locais.\n- Facilitar busca por contexto histórico.\n- Transformar aprendizados de projetos em material reutilizável.\n\nArquivos de apoio: [[arquivo:CT_GEOB_XXIV_2018_10.pdf]], [[arquivo:decisoes-arquitetura.md]] e [[arquivo:fluxo-editor.png]].\n\n> A wiki deve ser simples o bastante para ser atualizada durante a rotina, não apenas ao fim do projeto.',
      },
      {
        id: 'architecture',
        title: 'Arquitetura',
        content:
          '# Arquitetura\n\nA aplicação usa React com rotas client-side, dados locais tipados e componentes reutilizáveis para navegação, status e leitura de conteúdo.\n\n## Decisões atuais\n\n- Manter dados de demonstração em TypeScript para prototipagem rápida.\n- Separar visualização, anexos, lições e histórico em abas.\n- Preparar o editor para integração futura com persistência.',
        children: [
          {
            id: 'architecture-search',
            title: 'Busca',
            content:
              '# Busca\n\nA busca global indexa projetos, seções, lições e histórico para permitir descoberta rápida.\n\n## Próximos passos\n\n- Adicionar ranking por relevância.\n- Expor filtros por responsável e status.\n- Destacar trechos encontrados no conteúdo.',
          },
          {
            id: 'architecture-editor',
            title: 'Editor',
            content:
              '# Editor\n\nO editor trabalha com Markdown e preview lado a lado para manter baixo atrito na manutenção da documentação.\n\n## Comportamento esperado\n\n- Alternar entre leitura e edição.\n- Preservar o rascunho enquanto a seção estiver ativa.\n- Salvar em uma camada de persistência quando o backend existir.',
          },
        ],
      },
      {
        id: 'roadmap',
        title: 'Roadmap',
        content:
          '# Roadmap\n\n## Curto prazo\n\n- Persistência de documentos.\n- Upload real de anexos.\n- Auditoria de alterações.\n\n## Médio prazo\n\n- Sugestões automáticas com IA.\n- Templates por tipo de projeto.\n- Métricas de uso por área.',
      },
      {
        id: 'decisions',
        title: 'Decisões',
        content:
          '# Decisões\n\n## ADR-001: Markdown como formato base\n\nMarkdown foi escolhido por ser portátil, legível e suficiente para a maior parte da documentação operacional.\n\n## ADR-002: Abas por contexto\n\nDocumentação, arquivos, lições e histórico ficam separados para evitar telas longas e melhorar foco.',
      },
    ],
    history: [
      {
        id: 'h-1',
        at: '2026-06-06',
        author: 'Marina Alves',
        action: 'Adicionou resumo executivo da wiki',
        target: 'Visão geral',
      },
      {
        id: 'h-2',
        at: '2026-06-04',
        author: 'Pedro Nunes',
        action: 'Atualizou estratégia de busca',
        target: 'Arquitetura',
      },
    ],
  },
  {
    id: 'p-2',
    slug: 'portal-cliente',
    name: 'Portal do Cliente',
    description: 'Área autenticada para acompanhamento de contratos, tickets e indicadores.',
    status: 'active',
    responsible: 'Rafael Costa',
    readers: ['Marina Alves'],
    client: 'Clientes enterprise',
    createdAt: '2026-04-18',
    updatedAt: '2026-06-05',
    tags: ['clientes', 'portal', 'suporte'],
    tech: ['React', 'Node.js', 'PostgreSQL'],
    attachments: [
      {
        id: 'a-4',
        name: 'matriz-permissoes.xlsx',
        type: 'xlsx',
        size: '96 KB',
        uploadedAt: '2026-06-01',
      },
      {
        id: 'a-5',
        name: 'contrato-api.docx',
        type: 'docx',
        size: '210 KB',
        uploadedAt: '2026-06-03',
      },
    ],
    lessons: [
      {
        id: 'l-3',
        title: 'Feedback em lote acelera revisão',
        description: 'Consolidar comentários reduziu ciclos de retrabalho entre produto e atendimento.',
        recommendation: 'Agrupe feedbacks por fluxo antes de abrir novas demandas de melhoria.',
        createdAt: '2026-06-04',
      },
      {
        id: 'l-4',
        title: 'Métricas devem aparecer no primeiro acesso',
        description: 'Usuários validaram mais rápido quando indicadores críticos apareciam no topo.',
        recommendation: 'Priorize dados acionáveis na primeira dobra do portal.',
        createdAt: '2026-06-05',
      },
    ],
    sections: [
      {
        id: 'backlog',
        title: 'Backlog',
        content:
          '# Backlog\n\nO backlog está organizado por jornadas: contratos, tickets, indicadores e administração.\n\n## Priorização\n\n- Alto impacto para clientes ativos.\n- Redução de chamados manuais.\n- Dependências com integrações já disponíveis.',
      },
      {
        id: 'integrations',
        title: 'Integrações',
        content:
          '# Integrações\n\nO portal consome dados de contratos, tickets e indicadores operacionais por APIs internas.\n\n## Cuidados\n\n- Validar contratos antes de expor novos campos.\n- Registrar fallback para indisponibilidade temporária.\n- Monitorar latência por origem de dados.',
      },
      {
        id: 'permissions',
        title: 'Permissões',
        content:
          '# Permissões\n\nPerfis de acesso são definidos por tipo de cliente e responsabilidade operacional.\n\n## Perfis\n\n- Administrador do cliente.\n- Usuário financeiro.\n- Usuário suporte.\n- Leitura executiva.',
      },
    ],
    history: [
      {
        id: 'h-3',
        at: '2026-06-05',
        author: 'Rafael Costa',
        action: 'Registrou decisão sobre permissões por perfil',
        target: 'Permissões',
      },
    ],
  },
  {
    id: 'p-3',
    slug: 'data-hub',
    name: 'Data Hub',
    description: 'Pipeline interno de dados para relatórios executivos e análises operacionais.',
    status: 'paused',
    responsible: 'Bianca Souza',
    createdAt: '2026-03-20',
    updatedAt: '2026-06-02',
    tags: ['dados', 'analytics', 'pipeline'],
    tech: ['Python', 'dbt', 'BigQuery'],
    attachments: [
      {
        id: 'a-6',
        name: 'catalogo-fontes.pdf',
        type: 'pdf',
        size: '2.4 MB',
        uploadedAt: '2026-05-29',
      },
    ],
    lessons: [
      {
        id: 'l-5',
        title: 'Contrato de dados precisa versionamento',
        description: 'Mudanças silenciosas nas fontes geraram retrabalho na camada de relatório.',
        recommendation: 'Versione contratos de entrada antes de automatizar novas cargas.',
        createdAt: '2026-06-01',
      },
      {
        id: 'l-6',
        title: 'Alertas precoces reduzem retrabalho',
        description: 'Sinais de falha perto da origem facilitaram diagnóstico e comunicação.',
        recommendation: 'Monitore frescor, volume e schema logo após a ingestão.',
        createdAt: '2026-06-02',
      },
    ],
    sections: [
      {
        id: 'sources',
        title: 'Fontes',
        content:
          '# Fontes\n\nAs fontes principais incluem CRM, faturamento e tickets internos.\n\n## Status\n\n- CRM com contrato estável.\n- Faturamento em revisão.\n- Tickets aguardando normalização de categorias.',
      },
      {
        id: 'quality',
        title: 'Qualidade',
        content:
          '# Qualidade\n\nA qualidade é acompanhada por testes de schema, volume e duplicidade.\n\n> O objetivo é detectar falhas antes que relatórios executivos sejam atualizados.',
      },
      {
        id: 'dashboards',
        title: 'Dashboards',
        content:
          '# Dashboards\n\nPainéis executivos dependem de dados consolidados diariamente.\n\n## Públicos\n\n- Liderança comercial.\n- Operações.\n- Financeiro.',
      },
      {
        id: 'operation',
        title: 'Operação',
        content:
          '# Operação\n\nO runbook descreve responsáveis, janelas de carga e procedimentos de incidente.',
      },
    ],
    history: [
      {
        id: 'h-4',
        at: '2026-06-02',
        author: 'Bianca Souza',
        action: 'Documentou incidentes de carga',
        target: 'Operação',
      },
    ],
  },
  {
    id: 'p-4',
    slug: 'mobile-field',
    name: 'Mobile Field',
    description: 'Aplicativo para equipes de campo consultarem ordens e anexarem evidências.',
    status: 'active',
    responsible: 'Lucas Lima',
    client: 'Operações de campo',
    createdAt: '2026-02-14',
    updatedAt: '2026-05-30',
    tags: ['mobile', 'campo', 'offline'],
    tech: ['React Native', 'SQLite', 'Sentry'],
    attachments: [
      {
        id: 'a-7',
        name: 'prototipo-offline.jpg',
        type: 'jpg',
        size: '740 KB',
        uploadedAt: '2026-05-25',
      },
    ],
    lessons: [
      {
        id: 'l-7',
        title: 'Modo offline deve guiar conflitos',
        description: 'O piloto mostrou que usuários precisam de mensagens claras quando dados divergem.',
        recommendation: 'Explique o conflito e ofereça ação recomendada antes de sincronizar.',
        createdAt: '2026-05-29',
      },
      {
        id: 'l-8',
        title: 'Fotos precisam compressão automática',
        description: 'Evidências grandes atrasaram sincronização em redes instáveis.',
        recommendation: 'Comprima imagens no dispositivo e indique progresso de envio.',
        createdAt: '2026-05-30',
      },
    ],
    sections: [
      {
        id: 'ux',
        title: 'UX',
        content:
          '# UX\n\nFluxos devem funcionar com baixa conectividade e mensagens objetivas.\n\n## Princípios\n\n- Priorizar ações de campo.\n- Mostrar estado de sincronização.\n- Evitar bloqueios sem alternativa.',
      },
      {
        id: 'sync',
        title: 'Sincronização',
        content:
          '# Sincronização\n\nA fila local guarda evidências até conexão estável.\n\n## Regras\n\n- Reenvio automático com backoff.\n- Conflitos destacados antes da confirmação.\n- Histórico local para auditoria.',
      },
      {
        id: 'observability',
        title: 'Observabilidade',
        content:
          '# Observabilidade\n\nEventos críticos acompanham falhas de sincronização, anexos e autenticação.',
      },
    ],
    history: [
      {
        id: 'h-5',
        at: '2026-05-30',
        author: 'Lucas Lima',
        action: 'Incluiu aprendizados da versão piloto',
        target: 'Lições aprendidas',
      },
    ],
  },
  {
    id: 'p-5',
    slug: 'billing-core',
    name: 'Billing Core',
    description: 'Modernização do motor de cobrança e conciliação financeira.',
    status: 'done',
    responsible: 'Camila Rocha',
    client: 'Financeiro',
    createdAt: '2025-11-10',
    updatedAt: '2026-05-26',
    tags: ['billing', 'financeiro', 'migração'],
    tech: ['Java', 'Kafka', 'PostgreSQL'],
    attachments: [
      {
        id: 'a-8',
        name: 'runbook-sustentacao.pdf',
        type: 'pdf',
        size: '1.2 MB',
        uploadedAt: '2026-05-26',
      },
    ],
    lessons: [
      {
        id: 'l-9',
        title: 'Migração gradual reduziu risco operacional',
        description: 'A estratégia por cohort permitiu corrigir divergências antes do volume total.',
        recommendation: 'Planeje rollback por grupo e acompanhe conciliação diariamente.',
        createdAt: '2026-05-26',
      },
    ],
    sections: [
      {
        id: 'scope',
        title: 'Escopo',
        content:
          '# Escopo\n\nO projeto modernizou cálculo, emissão e conciliação de cobranças recorrentes.',
      },
      {
        id: 'migration',
        title: 'Migração',
        content:
          '# Migração\n\nA migração foi executada por cohort, com validação financeira paralela.',
      },
      {
        id: 'runbook',
        title: 'Runbook',
        content:
          '# Runbook\n\nProcedimentos de sustentação cobrem fechamento diário, divergências e alertas.',
      },
    ],
    history: [
      {
        id: 'h-6',
        at: '2026-05-26',
        author: 'Camila Rocha',
        action: 'Fechou checklist de sustentação',
        target: 'Runbook',
      },
    ],
  },
]

export const statusLabels: Record<ProjectStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  done: 'Concluído',
}

export function getProject(slug: string | undefined) {
  return projects.find((project) => project.slug === slug)
}

export function flattenSections(sections: Section[], depth = 0): { section: Section; depth: number }[] {
  return sections.flatMap((section) => [
    { section, depth },
    ...(section.children ? flattenSections(section.children, depth + 1) : []),
  ])
}

export function getSectionTitles(sections: Section[]) {
  return flattenSections(sections).map(({ section }) => section.title)
}

export function getProjectUpdates() {
  return projects
    .flatMap((project) => project.history.map((history) => ({ ...history, project })))
    .sort((a, b) => b.at.localeCompare(a.at))
}
