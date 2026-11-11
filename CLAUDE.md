# GS Instalações

## Paridade entre app e site

O app Android (`mobile/`) e o site (`web/`) são a mesma ferramenta em duas plataformas. Toda modificação feita em um deles precisa ser feita também no outro, na mesma tarefa: funções, regras, textos, validações, permissões por papel e design.

- Telas: `mobile/src/app/` corresponde a `web/src/paginas/`.
- Componentes: `mobile/src/componentes/` corresponde a `web/src/componentes/`.
- Tokens de design: `mobile/src/tema.ts` corresponde a `web/src/estilos.css`.
- Mudança na API (`backend/`) que afete os clientes entra nos dois.

A única diferença aceita é a de plataforma: o app funciona offline com a fila em `mobile/src/sync/`, e o site é só online. Quando algo não puder existir em um dos dois, diga isso ao usuário em vez de pular sem avisar.

Antes de dar por concluído, rode os testes e o typecheck dos dois (veja o README).
