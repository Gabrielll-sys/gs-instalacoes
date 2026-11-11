---
version: 1
slug: "mobile-src-app-index-tsx"
primary_target: "mobile/src/app/index.tsx"
related_targets: ["mobile/src/app/login.tsx","mobile/src/app/ordens/nova.tsx","mobile/src/app/ordens/[id]/index.tsx","mobile/src/app/ordens/[id]/editar.tsx"]
---

Superfície: app Android de ordens de serviço (lista, OS, formulário, fotos, login). Modo: Operate.

Quem e o quê: o dono da GS Instalações acompanha como estão as OS; o técnico, no local do serviço, abre a OS, fotografa antes e depois e segue para o próximo cliente, sem custo extra por causa do acompanhamento. Conteúdo real vem da API; os esboços usam nomes fictícios.

Momento memorável: a placa da OS se completa diante do técnico quando a primeira foto entra.

Em aberto: exclusão e numeração de OS, tema escuro.

## Direction contract

THESIS: Cada OS se lê como placa de estrada: de relance, com pressa, em qualquer luz. Recusa o padrão da categoria, cartões empilhados com selo colorido de status.

OWN-WORLD: Faixa marinho #00265F, legendas brancas. Dourado #EAB827 tem três usos: a ação principal de cada tela, o losango que só significa "falta foto" e o carimbo de data sobre a foto. Fila usa ícone de envio, nunca o losango. Letra de estrada Overpass, do regular ao black. A assinatura é a placa: painel marinho arredondado com filete branco interno e colunas de legenda e número tabular. Fundo branco com faixas azuladas #F1F4F8 separando seções. Controles são Material 3 temados.

STORY: O dono entende em um olhar o que está aberto e o que foi concluído, e confere a prova com data. O técnico vê o que falta em cada OS, fotografa com um toque e confia no que está enviado ou só no aparelho.

FIRST VIEWPORT: Barra marinho no topo com título black de 30dp e menu da conta à direita, busca branca em pílula dentro dela. Abaixo, chips Todas, Abertas e Concluídas com contagem; aviso de sincronização quando houver. Lista em linhas com filete: cliente em extrabold, data e responsáveis à esquerda, placa ANTES e DEPOIS à direita, losango onde falta foto. FAB dourado Nova OS embaixo à direita. Interação assinatura: quando uma seção recebe a primeira foto, o losango dá lugar ao número já dourado, que segura 150ms e volta ao branco em 300ms com saída exponencial, ou aparece direto em branco com animações reduzidas. Fora isso, só o movimento nativo do Material.

FORM: Placa de serviço rodoviária, posição 5 da lista ordenada. Do Relatório Fotográfico, a pedido do usuário, vem só o carimbo de data dourado sobre a foto. seed:489aa7bbcc32b65e

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
