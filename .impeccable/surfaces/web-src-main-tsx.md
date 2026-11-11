---
version: 1
slug: "web-src-main-tsx"
primary_target: "web/src/main.tsx"
related_targets: ["web/src/paginas/ListaOrdens.tsx","web/src/paginas/GavetaOrdem.tsx"]
---

Superfície: versão web do app de OS (React, React Query), publicada na Vercel e ligada à mesma API. Modo: Operate. Só online.

Quem e o quê: o dono da GS acompanha as OS no computador, confere a prova, gera o PDF e gerencia a equipe; técnicos também podem abrir OS e enviar fotos pelo navegador. Mesmas permissões do app. Conteúdo real vem da API; conferências usam dados fictícios.

Momento memorável: abrir uma OS na gaveta sem perder o lugar na lista, e ver o número da placa nascer dourado quando a primeira foto entra.

Em aberto: numeração de OS, tema escuro, domínio próprio.

## Direction contract

THESIS: A placa de estrada levada para a mesa: menu fixo à esquerda e a OS aberta numa gaveta por cima da lista, sem perder o lugar. Recusa o painel genérico de cartões com gráficos.

OWN-WORLD: O mesmo do app. Trilho marinho #00265F, letra Overpass do regular ao black, placa com filete branco interno e número tabular. Dourado #EAB827 só na ação principal de cada tela, no losango de "falta foto" e no carimbo de data sobre a foto. Fundo #F1F4F8, filete #DDE3EC, controles web padrão: botões, campos, chips, diálogo.

STORY: O gestor entende de relance o que está aberto e o que já tem prova, abre a OS sem sair da lista, confere as fotos ampliadas e gera o PDF. O técnico também abre OS e envia fotos do computador.

FIRST VIEWPORT: Trilho marinho de 232px com logo, Ordens de serviço, Equipe (só gestor) e a conta embaixo. Área de trabalho com título "Ordens de serviço", busca e o botão dourado Nova OS; filtros com contagem; linhas com cliente em extrabold, abertura e responsáveis, e a placa à direita. A OS abre numa gaveta de 560px à direita, com faixa marinho, dados, relatório (gestor) e as seções ANTES e DEPOIS com fotos e Enviar fotos. Assinatura: o número da placa nasce dourado quando a primeira foto entra, segura 150ms e volta ao branco em 300ms com saída exponencial; com movimento reduzido, aparece direto em branco. Abaixo de 900px, o trilho vira barra no topo e a gaveta ocupa a tela.

FORM: Trilho lateral e gaveta, posição 4 da lista ordenada de estruturas, escolhida pelo usuário. seed:0263a6cc41f2c919

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
