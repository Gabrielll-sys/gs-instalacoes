# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

O dono da GS Instalações é quem mais quer acompanhar como estão as OS: o que está aberto, o que foi concluído e a prova de cada serviço. Ele acompanha pelo app ou pela versão web, que tem as mesmas funções, sem painel separado.

Os técnicos da empresa, em Belo Horizonte e região, são quem alimenta tudo: vão até casas e empresas dos clientes instalar carregadores e tomadas de carro elétrico e usam o app no local do serviço, para abrir a OS e registrar o local antes e depois da instalação. Acompanhar não pode custar nada a eles.

Inferência a confirmar: o trabalho acontece em garagens e subsolos, em pé, com pressa e com sinal ruim ou inexistente. Vem do pedido de upload offline e das fotos de instalação no Instagram da empresa.

## Product Purpose

Registrar a ordem de serviço de cada instalação: nome do cliente, responsáveis, observações, data e hora de abertura obtidas automaticamente, e fotos nas seções ANTES e DEPOIS.

Sucesso significa que todo serviço concluído tem prova fotográfica que pode ser encontrada depois para três usos: comprovar o serviço ao cliente, permitir a conferência do gestor e sustentar garantia ou disputas.

À parte das OS, o gestor monta orçamentos para os clientes: materiais com quantidade, unidade e preço unitário, condições de pagamento e prazo, e um PDF para mandar ao cliente. Os clientes ficam num cadastro próprio, com contato e endereço.

## Positioning

O antes e o depois de cada instalação como prova do serviço, registrados no local mesmo sem internet e sincronizados sozinhos quando a conexão volta.

## Operating Context

Fluxo de uma visita: o técnico chega ao cliente, abre a OS, fotografa o estado atual do local onde os carregadores serão instalados, executa o serviço e fotografa o resultado.

A sincronização acontece com o app aberto, sempre que há internet. As fotos ficam no Cloudflare R2.

## Capabilities and Constraints

- OS com cliente, responsáveis (um ou mais, escolhidos entre os técnicos cadastrados e editáveis depois), observações e abertura automática, que não muda depois de criada.
- Seções ANTES e DEPOIS, com fotos da câmera ou da galeria; cada foto pode ser excluída.
- Cada foto é compactada no aparelho antes do envio, em WebP visualmente sem perda, e não passa de 4 MB. O servidor recusa foto maior.
- Em tela cheia, deslizar troca de foto dentro da seção; pinça ou toque duplo ampliam para conferir detalhes.
- Cada foto mostra quando foi adicionada à OS, no aparelho, mesmo que o envio aconteça depois. A data de captura não é usada, porque foto da galeria pode não ter.
- Criar e editar OS, enviar e excluir fotos funcionam offline, em fila persistida no aparelho. A lista de pessoas do seletor de responsáveis fica guardada no aparelho.
- Relatório em PDF da OS, gerado só pelo gestor, com internet, a partir do que já está no servidor: primeira página com o par antes e depois, dados da OS e as demais fotos nas páginas seguintes, numeradas. O gestor abre para conferir e depois envia.
- Versão web com as mesmas funções do app, só online: fotos enviadas do computador, compactadas no navegador com as mesmas regras, e o relatório aberto ou baixado direto.
- Backend em .NET 10 publicado no Railway; app em Expo; site em React com Vite publicado na Vercel; estado em React Query nos dois.
- Cada pessoa entra com usuário e senha próprios. Papéis: técnico e gestor. Só o gestor gerencia a equipe e gera o relatório. O gestor cria as contas, que nascem com a senha padrão 1234; cada pessoa escolhe outra no primeiro acesso, e o gestor pode voltar a senha para a padrão quando alguém esquecer. O gestor inicial não passa por essa troca. Conta desativada perde o acesso na hora.
- OS e fotos guardam quem abriu e quem enviou.
- Orçamentos e cadastro de clientes, só do gestor e só online, no app e no site. Cliente tem nome, telefone, e-mail, CPF ou CNPJ e endereço; cliente com orçamento não pode ser excluído. Orçamento tem número sequencial, um cliente, de 1 a 100 itens (material, quantidade com até 3 casas, unidade e preço unitário com até 2 casas), forma de pagamento, prazo de execução e observações. Cada linha é arredondada ao centavo e o total soma as linhas, igual no app, no site e no PDF. O PDF sai do servidor com o mesmo cabeçalho de empresa do relatório da OS. Os dados de clientes não ficam gravados no aparelho.

Decisões em aberto: exclusão de OS, numeração de OS (o relatório usa um código derivado do id), tema escuro.

## Brand Commitments

- Nome: GS Instalações (BH). Instagram: @gs_instalacoes_bh. Site citado no perfil: gsinstalacoesbh.com.br.
- Serviços que a marca declara: Wallbox, Padrão 220V e Manutenções.
- Logo: carro em linha dourada com plugue ligando as rodas, um "G" na roda de trás e um raio na da frente, sobre azul-marinho, com o nome em branco bem pesado.
- Cores medidas no material da empresa: dourado `#EAB827`, marinho `#00265F`, branco.
- Voz direta e sem floreio, como em "A gente instala seu wallbox em 24h."

## Evidence on Hand

- Logo em `mobile/assets/logo-gs-carro.png` e `mobile/assets/logo-gs-nome.png`, recortada de um post do Instagram. O arquivo original ainda precisa vir da empresa.
- Não há dados reais de OS, clientes nem fotos de serviço. Qualquer conteúdo de demonstração precisa ser identificado como tal.

## Product Principles

1. Foto tirada não se perde: capturar nunca depende de sinal, de login válido ou de o app continuar aberto.
2. A prova vem primeiro: em qualquer tela, antes e depois são o que mais importa saber sobre uma OS.
3. Feito para quem está com pressa e com as mãos ocupadas: poucos toques, alvos grandes, nada para decorar.
4. Estado honesto: o técnico sempre sabe o que já está no servidor e o que ainda está só no aparelho.
