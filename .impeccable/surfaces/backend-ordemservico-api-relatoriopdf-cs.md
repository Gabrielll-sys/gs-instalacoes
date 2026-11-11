---
version: 1
slug: "backend-ordemservico-api-relatoriopdf-cs"
primary_target: "backend/OrdemServico.Api/RelatorioPdf.cs"
related_targets: ["mobile/src/componentes/BotaoRelatorio.tsx"]
---

Superfície: relatório em PDF de uma OS, gerado pela API e aberto pelo app. Modo: Read.

Quem e o quê: só o gestor gera. Quem lê é o cliente, para ver que o serviço foi feito, e o próprio gestor, em conferência, garantia ou disputa. Conteúdo real vem da OS; as amostras de conferência usam dados fictícios.

Momento memorável: abrir o PDF e ver na primeira página, lado a lado, como estava e como ficou.

Em aberto: numeração de OS (o código vem do id), dados formais da empresa além de nome, site e Instagram.

## Direction contract

THESIS: O relatório responde primeiro à pergunta do cliente: como estava e como ficou. Recusa o padrão da categoria, a capa vazia seguida de uma tabela de campos antes de qualquer foto.

OWN-WORLD: Mundo Placa de Serviço sem mudança. Faixa marinho #00265F com logo dourado e nome branco, letra Overpass do regular ao black, placa ANTES e DEPOIS com filete branco interno. Dourado só no carimbo sobre a foto e no losango de "falta foto". Fundo branco, filete #DDE3EC, bloco azulado #F1F4F8 onde falta foto.

STORY: O cliente entende o resultado em um olhar e confere quando cada foto entrou e por quem. O gestor encontra a prova inteira e pode citar cada foto pelo número, como A3 ou D2.

FIRST VIEWPORT: Primeira página em A4. Faixa marinho no topo: logo à esquerda, nome do cliente em black 22 com "Relatório de serviço" e o código da OS abaixo, placa à direita. Abaixo, duas colunas iguais com ANTES e DEPOIS, cada uma com a primeira foto inteira, sem corte, carimbo dourado no canto e legenda com número e autor. Depois, filete e dados: abertura, responsáveis, situação, emissão e observações. Páginas seguintes: faixa fina, placa da seção e as demais fotos em duas colunas, sem repetir as da capa. Assinatura: o par da primeira página; sem movimento, é um documento.

FORM: Antes e depois primeiro, posição 3 da lista ordenada de estruturas, escolhida pelo usuário. seed:8e26b032f54eefa6

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
