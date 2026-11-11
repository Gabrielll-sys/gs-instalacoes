---
name: GS Instalações
description: Ordens de serviço lidas como placa de estrada, de relance, com pressa, em qualquer luz.
colors:
  marinho: "#00265F"
  dourado: "#EAB827"
  branco: "#FFFFFF"
  fundo: "#F1F4F8"
  texto: "#10213D"
  texto-suave: "#47566C"
  filete: "#DDE3EC"
  contorno: "#7A889C"
  atencao: "#5C4500"
  atencao-fundo: "#FFF6D9"
  envio-fundo: "#E3EAF5"
  erro: "#B42318"
  erro-fundo: "#FDECEA"
  carimbo-fundo: "rgba(0, 38, 95, 0.82)"
typography:
  display-small:
    fontFamily: "Overpass"
    fontSize: "30px"
    fontWeight: 900
    lineHeight: "34px"
    letterSpacing: "-0.3px"
  title-large:
    fontFamily: "Overpass"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: "26px"
  title-medium:
    fontFamily: "Overpass"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: "23px"
  body-large:
    fontFamily: "Overpass"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-medium:
    fontFamily: "Overpass"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label-large:
    fontFamily: "Overpass"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "20px"
  label-medium:
    fontFamily: "Overpass"
    fontSize: "13px"
    fontWeight: 800
    lineHeight: "19px"
    letterSpacing: "0.4px"
  label-small:
    fontFamily: "Overpass"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "18px"
  numero-placa:
    fontFamily: "Overpass"
    fontSize: "16px"
    fontWeight: 900
    lineHeight: "21px"
    fontFeature: "tnum"
  carimbo:
    fontFamily: "Overpass"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: "17px"
    fontFeature: "tnum"
  fab:
    fontFamily: "Overpass"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: "22px"
rounded:
  controle: "3px"
  carimbo: "4px"
  chip: "6px"
  filete-placa: "7px"
  placa: "9px"
  bloco: "12px"
  selo: "13px"
  botao: "15px"
  painel: "24px"
  pilula: "28px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  linha: "14px"
  lg: "16px"
  xl: "24px"
components:
  botao-principal:
    backgroundColor: "{colors.dourado}"
    textColor: "{colors.marinho}"
    typography: "{typography.label-large}"
    rounded: "{rounded.botao}"
    height: "52px"
  botao-camera-proximo-passo:
    backgroundColor: "{colors.dourado}"
    textColor: "{colors.marinho}"
    typography: "{typography.label-large}"
    rounded: "{rounded.botao}"
    height: "48px"
  botao-camera:
    backgroundColor: "{colors.marinho}"
    textColor: "{colors.branco}"
    typography: "{typography.label-large}"
    rounded: "{rounded.botao}"
    height: "48px"
  botao-contorno:
    textColor: "{colors.marinho}"
    typography: "{typography.label-large}"
    rounded: "{rounded.botao}"
    height: "48px"
  fab-nova-os:
    backgroundColor: "{colors.dourado}"
    textColor: "{colors.marinho}"
    typography: "{typography.fab}"
    rounded: "{rounded.bloco}"
  filtro:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.texto-suave}"
    typography: "{typography.label-large}"
    rounded: "{rounded.chip}"
    height: "42px"
  filtro-ativo:
    backgroundColor: "{colors.marinho}"
    textColor: "{colors.branco}"
    typography: "{typography.label-large}"
    rounded: "{rounded.chip}"
    height: "42px"
  campo:
    backgroundColor: "{colors.fundo}"
    textColor: "{colors.texto}"
    typography: "{typography.body-large}"
    rounded: "{rounded.controle}"
  busca:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.texto}"
    typography: "{typography.body-large}"
    rounded: "{rounded.pilula}"
  barra-topo:
    backgroundColor: "{colors.marinho}"
    textColor: "{colors.branco}"
    typography: "{typography.title-large}"
  placa:
    backgroundColor: "{colors.marinho}"
    textColor: "{colors.branco}"
    typography: "{typography.label-medium}"
    rounded: "{rounded.placa}"
    padding: "3px"
    width: "118px"
  placa-numero:
    textColor: "{colors.branco}"
    typography: "{typography.numero-placa}"
  placa-numero-destaque:
    textColor: "{colors.dourado}"
    typography: "{typography.numero-placa}"
  losango:
    backgroundColor: "{colors.dourado}"
    size: "9px"
  carimbo-foto:
    backgroundColor: "{colors.carimbo-fundo}"
    textColor: "{colors.dourado}"
    typography: "{typography.carimbo}"
    rounded: "{rounded.carimbo}"
    padding: "1px 5px"
  selo-envio:
    backgroundColor: "{colors.marinho}"
    textColor: "{colors.branco}"
    rounded: "{rounded.selo}"
    size: "26px"
  selo-erro:
    backgroundColor: "{colors.erro}"
    textColor: "{colors.branco}"
    rounded: "{rounded.selo}"
    size: "26px"
  faixa-enviando:
    backgroundColor: "{colors.envio-fundo}"
    textColor: "{colors.marinho}"
    typography: "{typography.label-large}"
    padding: "11px 16px"
  faixa-atencao:
    backgroundColor: "{colors.atencao-fundo}"
    textColor: "{colors.atencao}"
    typography: "{typography.label-large}"
    padding: "11px 16px"
  faixa-erro:
    backgroundColor: "{colors.erro-fundo}"
    textColor: "{colors.erro}"
    typography: "{typography.label-large}"
    padding: "11px 16px"
---

# Design System: GS Instalações

## Overview

**Creative North Star: "A Placa de Estrada"**

Cada ordem de serviço se lê como uma placa rodoviária: de relance, com pressa, em qualquer luz. A faixa marinho com legendas brancas dá o contraste, a letra de estrada Overpass dá a voz, e a placa com filete branco responde à pergunta que importa em toda tela: quantas fotos de antes e de depois esta OS já tem.

O sistema é denso e direto, feito para quem está em pé, em garagens e subsolos, com as mãos ocupadas. Os controles são Material 3 temados, sem reinvenção: o caráter vem da cor, da letra e da placa. O app existe só em tema claro e em retrato. Tema escuro é decisão em aberto no PRODUCT.md e não tem nenhum token aqui.

O mundo recusa o padrão da categoria, cartões empilhados com selo colorido de status. Os valores em `px` do frontmatter equivalem a `dp` no app; a fonte normativa no código é `mobile/src/tema.ts`.

**Key Characteristics:**
- Faixa marinho no topo das telas de trabalho, com texto branco.
- Lista em linhas com filete fino, não em cartões.
- Placa com número tabular como assinatura e único ponto de movimento próprio.
- Dourado raro, com função fixa.
- Seções brancas separadas por faixas de fundo azulado, sem sombra.
- Estado de envio sempre visível, com ícone e texto.

## Colors

Azul-marinho e branco medidos no material da empresa carregam a tela; o dourado da marca aparece pouco e sempre significa algo.

### Primary
- **Marinho de Placa** (#00265F): barras de topo, fundo da tela de login, placa, botão Câmera quando não é o próximo passo, botão Abrir do relatório, filtro ativo, chip de responsável escolhido, ícones de dado, selo de envio e faixa de total do orçamento. É também o `primary` do tema Paper.

### Secondary
- **Dourado GS** (#EAB827): os três usos da regra abaixo, nada mais. Preenchimentos dourados levam texto e ícone marinho (7,89:1).

### Neutral
- **Branco de Legenda** (#FFFFFF): superfície de lista, seções e formulário; texto e filete sobre marinho.
- **Faixa Azulada** (#F1F4F8): fundo das telas com seções, a faixa de 8dp entre elas, fundo dos campos, bloco de abertura da OS e esqueleto de carregamento.
- **Tinta Azulada** (#10213D): texto principal.
- **Tinta Suave** (#47566C): texto de apoio, como data, responsáveis, rótulos de dado e filtros inativos (7,46:1 sobre branco).
- **Filete Claro** (#DDE3EC): linhas finas entre itens da lista, sob os filtros e acima do rodapé do formulário, sempre na espessura mínima da tela.
- **Contorno de Controle** (#7A889C): borda dos botões de contorno, chips de contorno e campos (3,60:1 sobre branco).

### Estados
- **Atenção** (#5C4500 sobre #FFF6D9): sem internet, servidor sem resposta e linha "na fila" da lista. Tom próprio, separado do dourado.
- **Enviando** (marinho sobre #E3EAF5): fila em envio com conexão. O mesmo fundo é o `primaryContainer` e o `secondaryContainer` do tema.
- **Erro** (#B42318 sobre #FDECEA): item não enviado, validação e selo de erro na miniatura.

### Named Rules
**A Regra dos Três Dourados.** Na interface, o dourado tem exatamente três usos: a ação principal de cada tela, o losango que só significa "falta foto" e o carimbo de data sobre a foto. Se um quarto uso parecer necessário, a resposta é outra cor. O logo é arte da marca e fica fora da conta. O número que nasce dourado é a passagem da placa de "falta foto" para "tem foto", dura 450ms e não se reutiliza em nenhum outro lugar.

**A Regra do Próximo Passo.** Na tela da OS, só a Câmera da seção que o técnico precisa preencher agora é dourada: ANTES enquanto estiver vazia, depois DEPOIS. Com as duas preenchidas, nenhum botão da tela é dourado, porque não há passo pendente.

**A Regra do Losango Único.** O losango significa "falta foto" e mais nada. Fila usa ícone de envio (`cloud-upload-outline`), nunca o losango; erro usa ícone de alerta.

**A Regra do Fundo Escuro.** Dourado nunca é texto ou ícone sobre fundo claro (1,84:1 sobre branco). Sobre marinho ele chega a 7,89:1.

## Typography

**Display Font:** Overpass Black (arquivo próprio, sem fallback definido)
**Body Font:** Overpass Regular
**Label/Mono Font:** Overpass SemiBold e ExtraBold

**Character:** Uma só família, nascida da sinalização rodoviária, indo do regular ao black. A hierarquia vem do peso, com pouco salto de tamanho.

### Hierarchy
- **Display** (900, 30dp, entrelinha 34dp, -0,3): título da lista, "Ordens de serviço". Único uso.
- **Title Large** (800, 20dp, entrelinha 26dp): título da barra nativa e do estado vazio.
- **Title Medium** (800, 18dp, entrelinha 23dp): nome do cliente na lista, em até 2 linhas, e rótulo da seção no visualizador.
- **Body Large** (400, 16dp, entrelinha 24dp): valores de dado da OS, campos e texto de estado vazio.
- **Body Medium** (400, 14dp, entrelinha 20dp): data e responsáveis na lista, instruções e mensagens.
- **Label Large** (600, 15dp, entrelinha 20dp): botões, filtros, faixas de aviso e data no visualizador.
- **Label Medium** (800, 13dp, entrelinha 19dp, +0,4): legenda ANTES e DEPOIS da placa.
- **Label Small** (600, 13dp, entrelinha 18dp): rótulo de dado e linha "na fila".
- **Número da Placa** (900, 16dp, entrelinha 21dp, tabular): contagem de fotos.
- **Carimbo** (800, 12dp, entrelinha 17dp, tabular): data sobre a miniatura, no formato `06/11 14:08`. É o único texto do app definido abaixo de 13dp; o rótulo flutuante dos campos encolhe a 12dp por padrão do Paper.
- **FAB** (800, 17dp, entrelinha 22dp): rótulos Nova OS e Nova conta.

### Named Rules
**A Regra do Peso no Arquivo.** O peso vem do arquivo da fonte (`familia.regular`, `semi`, `extra`, `black`), com `fontWeight: 'normal'`. Outro valor engrossaria a letra de novo no Android.

**A Regra do Número Tabular.** Toda contagem e data que se compara de relance usa `tabular-nums`: placa, filtros, carimbo e data do visualizador.

## Layout

Coluna única em retrato, sem pontos de quebra, com margem lateral de 16dp. As capturas de referência cobrem larguras de 360 e 412dp.

O ritmo vem de 4dp entre fotos, 8dp entre chips e entre seções, 12dp entre elementos de um grupo, 14dp dentro das linhas e seções e 16dp nas margens. A lista é rente às bordas: cada linha tem fundo branco, filete inferior e placa à direita, com mínimo de 118dp. Fotos formam uma grade de 3 colunas quadradas, calculada pela largura da tela. Ações de seção dividem a largura em duas colunas iguais; a ação de formulário fica fixa num rodapé com filete, acima do teclado.

**A Regra dos 48dp.** Todo alvo de toque tem ao menos 48dp. Chips de 42dp completam a altura com área extra de toque de 3dp em cima e embaixo; a altura do botão é definida no conteúdo.

## Elevation & Depth

O sistema é plano e separa por tom: seções brancas sobre a faixa azulada, faixa marinho sobre o conteúdo, filete fino entre linhas. A barra nativa tem a sombra desligada e a busca tem elevação 0. Sombra só existe onde o Material 3 a usa em peças flutuantes, com os valores padrão do Paper: FAB, menu da conta e snackbar. A rampa de elevação do tema foi trocada para tons azulados (#F8FAFC, #F4F6FA, #F1F4F8, #EDF1F6, #E9EEF5), o que impede o lilás padrão do Material de aparecer. A aparência dessas sombras em Android real ainda não foi conferida: as capturas de referência vêm da prévia web.

**A Regra do Flutuante.** Sombra é só para o que flutua sobre a tela. Superfície que faz parte da tela separa por tom ou filete.

## Shapes

Cantos médios e firmes, de placa de metal, com a pílula reservada à busca. Campos, menu e snackbar têm canto quase reto (3dp, de `roundness: 3`); carimbo 4dp; chips 6dp; placa 9dp por fora e filete a 7dp por dentro; bloco de abertura e FAB 12dp; botões 15dp; painel do login 24dp só nos cantos de cima; busca 28dp. Fotos na grade não têm canto arredondado. O losango é o único ângulo diagonal do sistema: um quadrado de 9dp girado 45 graus.

## Components

### Buttons
Controles Material 3 sem reinvenção, ajustados em altura para mão ocupada.
- **Shape:** cantos firmes de botão (15dp).
- **Primary:** dourado com texto marinho, 52dp no login e no rodapé do formulário, 48dp na Câmera do próximo passo.
- **Preenchido em marinho:** Câmera fora do próximo passo e Abrir do relatório pronto, com texto branco, 48dp.
- **Contorno:** fundo transparente, borda de contorno e texto marinho, 48dp. Galeria fica ao lado da Câmera e Enviar, ao lado de Abrir; Gerar relatório em PDF e Tentar de novo aparecem sozinhos.
- **Texto:** "Ver tudo" e "Ver menos" nas observações, "Gerar de novo" no relatório pronto e "Sair" na troca obrigatória de senha, com 48dp de altura.
- **Toque e carga:** ripple nativo; durante o envio, o botão principal fica desabilitado e mostra indicador de carga.

### FAB
- **Style:** dourado com ícone e rótulo marinho, canto de 12dp, 16dp da borda direita e da base segura. Nova OS na lista de OS e Nova conta na Equipe. As duas listas reservam 96dp no fim para não esconder a última linha.

### Chips
- **Filtros:** contorno com fundo branco e texto suave; ativo em marinho com texto branco, sem marca de seleção. Mostram a contagem tabular, que acompanha a busca.
- **Responsáveis:** seletor com as pessoas cadastradas, sem digitação. Marcada em marinho com visto branco; desmarcada em contorno com ícone de mais. Um toque alterna.
- **Papel da conta:** Técnico e Gestor, com a mesma aparência dos filtros.

### Cards / Containers
Não há cartões. Os agrupamentos são:
- **Seção de fotos:** bloco branco de borda a borda, padding de 16dp, gap de 14dp, separado por 8dp de faixa azulada.
- **Bloco de abertura:** fundo azulado, canto de 12dp, padding de 14dp, com ícone e data automática no formulário.
- **Painel do login:** branco sobre marinho, canto de cima de 24dp, só com os campos e o botão. Sem título: a marca acima já diz onde se está, e o app vai além de ordens de serviço.
- **Tela de carregamento:** fundo marinho com o logo (carro dourado e nome branco) centrado em 288dp, a área do ícone da splash do Android 12+. A splash nativa usa a mesma imagem (`assets/splash-icon.png`) e o mesmo fundo, então a passagem de uma para a outra não aparece. Sem texto nem indicador de progresso.

### Inputs / Fields
- **Style:** TextInput contornado do Paper, fundo azulado, borda de contorno, canto de 3dp, rótulo flutuante.
- **Focus:** comportamento padrão do Material, com borda em marinho.
- **Error:** borda em erro e `HelperText` abaixo, só depois da tentativa de salvar.

### Navigation
- **Barra de topo:** marinho sem sombra, texto e ícones brancos, título extrabold de 20dp. Pilha nativa do Expo Router, com status bar clara.
- **Lista:** barra própria com título display, menu da conta e busca em pílula branca dentro dela.
- **Botão de ícone sobre escuro:** ícone branco de 24dp em área circular de 48dp, ripple branco a 30%.

### Linha de OS
Fundo branco, ripple em toda a linha, padding de 16 por 14dp, filete inferior. À esquerda, cliente, data e responsáveis; à direita, a placa ANTES e DEPOIS. Com itens na fila, acrescenta ícone de envio e texto em atenção. O rótulo de acessibilidade lê a linha inteira. No carregamento, o esqueleto repete a estrutura em barras azuladas estáticas, com a forma da placa em 118 por 56dp.

### Placa (assinatura)
Painel marinho com filete branco interno de 1,5dp, legendas à esquerda e número tabular à direita. Aparece com duas linhas na lista e com uma linha no cabeçalho de cada seção da OS. Quando o total é zero, o losango dourado de 9dp fica ao lado do 0; quando entra a primeira foto, ele some.

**Interação:** na transição de 0 para mais, o número nasce dourado já no primeiro quadro, segura 150ms e volta ao branco em 300ms com saída exponencial (`Easing.out(Easing.exp)`). Com animações reduzidas, o número aparece direto em branco. Outras mudanças de valor não animam. O dourado é uma camada sobre o número branco, cuja opacidade cai de 1 a 0 no driver nativo.

**A Regra da Placa Própria.** O filete branco interno pertence à placa, e a placa só mostra contagem de fotos. Outro conteúdo em painel marinho não leva filete.

### Carimbo de data
Dourado extrabold sobre marinho a 82%, encostado a 4dp do canto inferior esquerdo da miniatura. No visualizador, a mesma informação aparece por extenso em dourado, na faixa inferior sobre o preto, como "Adicionada em…".

**A Regra da Data de Adição.** O carimbo mostra quando a foto foi adicionada à OS, no aparelho, e toda foto tem um. A data de captura não é usada.

### Selos na miniatura
Círculo de 26dp, a 6dp do canto superior direito: marinho com `cloud-upload-outline` para foto aguardando envio; erro com ícone de alerta para foto não enviada.

### Faixa de aviso
Faixa de borda a borda, com altura mínima de 48dp, ícone de 20dp e texto em Label Large. Mostra um estado por vez, nesta ordem: erro (com "Tentar de novo" sublinhado, a faixa inteira tocável), sem internet, servidor sem resposta, enviando. Na tela da OS conta só a fila dessa OS.

### Visualizador de fotos
Palco preto em tela cheia com foto inteira, faixas a 60% de preto em cima e embaixo, troca por deslize e entrada em fade. O preto é palco para a foto; o resto do app continua em tema claro. Abaixo do rótulo da seção, data e situação de envio; "Tentar de novo" dourado só quando a foto falhou, porque ali é a ação principal. Pinça ou toque duplo ampliam até 5x; ampliada, a foto se arrasta dentro dos próprios limites, o deslize entre fotos trava e a faixa inferior some. O zoom segue os dedos e o toque duplo salta direto, sem animação própria.

### Relatório em PDF
Mesmo mundo em papel A4 (`backend/OrdemServico.Api/RelatorioPdf.cs`). Faixa marinho com logo, cliente em black e placa; nas páginas seguintes, faixa fina com o cliente e a placa de cada seção. A primeira página traz o par ANTES e DEPOIS. Foto sempre inteira, sem corte, centrada numa célula de altura igual à da vizinha, com o carimbo no próprio canto e número citável (A1, D1) na legenda, que cai na mesma linha. Foto em pé ao lado de foto deitada usa altura menor. A placa da seção se repete em toda página. O separador é o travessão curto, porque o ponto médio perde o espaço depois dele na Overpass. Nenhum dourado além do carimbo e do losango de "falta foto"; o logo é arte.

### Orçamento em PDF
Irmão do relatório (`backend/OrdemServico.Api/OrcamentoPdf.cs`), com as mesmas cores, fontes e logo de `RelatorioPdf.cs`. Faixa marinho com logo, nome do cliente em black 22, "Orçamento nº 0001 – emitido em" e, à direita, TOTAL com o valor em black 20: o preço se lê de relance, como a placa no relatório. Abaixo, os contatos do cliente que existirem (telefone, e-mail, CPF ou CNPJ e endereço), filete e a tabela: Nº, MATERIAL, QTD., UN., PREÇO UNIT. e TOTAL, com cabeçalho extrabold marinho, filete marinho de ponta a ponta sob ele e filete claro entre as linhas, números tabulares e total da linha em extrabold. O cabeçalho da tabela se repete em cada página. Depois, a faixa de total marinho (quantidade de itens à esquerda, TOTAL e valor em black à direita), sem filete interno, e as condições: forma de pagamento e prazo lado a lado, observações embaixo. Rodapé igual ao do relatório. Nenhum dourado além do logo. Cada filete é desenhado de uma vez, de ponta a ponta: a borda de cada célula deixaria emendas nas divisas das colunas.

### Orçamentos e clientes
Área do gestor, à parte das OS e só online. No app, entra pelo menu da conta (Orçamentos, Clientes, Equipe); no site, pelo trilho. Orçamentos usa o ícone `calculator-variant-outline` e Clientes `card-account-details-outline`, para não se confundirem com a prancheta das OS.

- **Listas:** as mesmas linhas da lista de OS. No orçamento, cliente em Title Medium, "Nº 0001 – 07/11/2026" em Body Medium suave e o total à direita em extrabold marinho tabular, no lugar da placa. No cliente, nome e "telefone – endereço" numa linha. Busca em pílula: no app, dentro de uma faixa marinho logo abaixo da barra; no site, no cabeçalho. Ação principal dourada: Novo orçamento, Novo cliente.
- **Orçamento aberto:** bloco branco com Cliente (nome e contato), Endereço e Emitido em, como os dados da OS, e o botão do PDF (Gerar orçamento em PDF, depois Abrir e Enviar no app ou Abrir e Baixar no site; se o orçamento ou o cliente mudar, volta a pedir para gerar). Depois, os itens: descrição, a conta "2,5 m × R$ 10,99" em suave e o total da linha à direita, filete entre eles e a faixa de total marinho com cantos de 9 e TOTAL em extrabold 13 com +0,4. Condições no último bloco. Editar e Excluir ficam na barra marinho.
- **Formulário de orçamento:** três seções com título marinho (Cliente, Itens, Condições). Cliente escolhido aparece num bloco azulado com Trocar; sem cliente, busca e até 5 opções no app ou 6 no site, mais Cadastrar cliente. Cada item tem Material e, numa linha, Qtd., Un. e Preço unit. com "R$" fixo, seguidos do total do item à direita ou do erro daquele item. O rodapé fixo mostra o total ao vivo em black marinho ao lado da ação dourada.
- **Cadastro de cliente:** Nome, Telefone, E-mail, CPF ou CNPJ e Endereço em texto livre. Aberto de dentro do orçamento, volta com o cliente já escolhido: no app pela pilha de telas, no site como segunda gaveta por cima da primeira, para o rascunho não se perder. Esc ou clique fora fecham só a de cima, e o envio de uma não dispara o da outra. Cliente com orçamento não pode ser excluído, e a mensagem diz o que fazer.

**A Regra do Total à Vista.** Em orçamento, o total tem o mesmo peso da placa nas OS: black, marinho e tabular, na faixa de topo do PDF, na faixa de total e no rodapé do formulário. Não ganha dourado nem o filete da placa.

## Versão web

Mesmo mundo no navegador (`web/`), com os tokens de cor, tipo e forma em `web/src/estilos/` (base, casca, gaveta, formularios, orcamentos e responsivo, nessa ordem), Overpass do `@fontsource/overpass` nos pesos 400, 600, 800 e 900 e os mesmos ícones Material Design Icons (`@mdi/js`). Na web o peso vem de `font-weight`, porque a regra do peso no arquivo é do Android.

- **Trilho:** coluna marinho de 232px à esquerda, com o logo, a navegação (Ordens de serviço e, só para o gestor, Orçamentos, Clientes e Equipe) e a conta no pé, com Trocar senha e Sair. Item ativo com fundo branco a 18%. Abaixo de 900px vira barra no topo, com "Ordens" no lugar de "Ordens de serviço" e as ações da conta só no ícone. Com as quatro áreas do gestor, abaixo de 700px só a área aberta mantém o nome, e as outras ficam no ícone com o nome acessível no `aria-label`; abaixo de 520px a barra do gestor deixa o carro do logo para esse nome caber. O técnico, com uma área só, mantém o nome e o logo em qualquer largura.
- **Área de trabalho:** cabeçalho branco com o título display, a busca em pílula e a ação principal dourada (Nova OS, Nova conta); filtros com contagem logo abaixo; lista rente às bordas, igual à do app.
- **Gaveta:** a OS, o formulário e a conta abrem num `<dialog>` nativo que desliza da direita, com largura de até 560px, sobre a lista escurecida. Faixa marinho no topo com título e ações, corpo em seções brancas sobre a faixa azulada e rodapé fixo com filete para a ação do formulário. Esc ou clique fora fecham; com alterações não salvas, o navegador pede confirmação antes. Abaixo de 900px ocupa a tela inteira.
- **Fotos:** grade de 3 colunas dentro da gaveta, com o carimbo no canto. "Enviar fotos" faz o papel da Câmera e segue a Regra do Próximo Passo. Cada foto é compactada no navegador antes de subir, com as mesmas regras do app.
- **Visualizador:** `yet-another-react-lightbox` aberto dentro da gaveta, para ficar na mesma camada do `<dialog>`. Setas e teclado trocam de foto na seção; roda, pinça ou duplo clique ampliam até 5x. A legenda "Adicionada em…" é o carimbo por extenso, em dourado sobre o preto. Com o visualizador aberto, Esc fecha só a foto.
- **Relatório:** só para o gestor, na gaveta da OS. Depois de gerado, Abrir (marinho) e Baixar (contorno); se a OS mudar, o botão volta a pedir para gerar de novo.
- **Movimento:** a gaveta desliza em 220ms na curva padrão do Material (`cubic-bezier(0.2, 0, 0, 1)`) e o número da placa nasce dourado como no app. Com animações reduzidas, nada se move.

## Do's and Don'ts

### Do:
- **Do** usar `cor` e `familia` de `mobile/src/tema.ts` e os controles temados do Paper antes de criar uma peça nova; na web, as variáveis de `web/src/estilos/` (base, casca, gaveta, formularios, orcamentos e responsivo, nessa ordem).
- **Do** manter dourado com texto e ícone marinho em todo preenchimento.
- **Do** mostrar a contagem de fotos de ANTES e DEPOIS sempre com a placa.
- **Do** dizer o estado de envio com ícone e texto, usando os tons de Atenção, Enviando e Erro.
- **Do** respeitar animações reduzidas em qualquer movimento próprio, como a placa faz.
- **Do** deixar o restante do movimento com o nativo do Material: ripple, transição de pilha, fade do visualizador e fade de 150ms ao carregar miniatura.
- **Do** conferir toda peça nova do Paper contra o tema, para que o lilás padrão do Material 3 não apareça.

### Don't:
- **Don't** usar dourado fora dos três usos, nem como cor de ênfase, ícone decorativo, faixa de aviso ou borda.
- **Don't** usar o losango para fila, erro ou qualquer estado que não seja "falta foto".
- **Don't** adicionar ação ao Snackbar sem decidir a cor: pelo `inversePrimary` do tema, ela nasceria dourada e abriria um uso fora dos três.
- **Don't** empilhar as OS em cartões com selo colorido de status. Os selos de envio ficam só na miniatura da foto.
- **Don't** criar tokens ou variantes de tema escuro enquanto a decisão estiver em aberto no PRODUCT.md.
- **Don't** definir `fontWeight` diferente de `normal` sobre as famílias Overpass no app.
- **Don't** pintar o número de dourado fora da transição de 0 para mais.
