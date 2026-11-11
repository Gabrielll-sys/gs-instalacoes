import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aplicarOutbox, atrasoDaTentativa, descreverFila, drenar, ErroApi, estaConcluida, filtrarOrdens } from './regras.ts';

const local = (arquivo) => `file:///${arquivo}`;
const dados = (id, abertaEm = '2026-01-01T10:00:00Z') => ({
  id, cliente: `Cliente ${id}`, responsaveis: ['Ana'], observacoes: '', abertaEm,
});
const fotoServidor = { id: 'f1', ordemId: 'a', secao: 'antes', url: 'https://cdn/f1.jpg', criadaEm: '2026-01-01T11:00:00Z' };
const fotoFila = (id, ordemId = 'a') => ({
  id, ordemId, secao: 'depois', criadaEm: '2026-01-02T00:00:00Z', arquivo: `${id}.jpg`, contentType: 'image/jpeg',
});

test('OS criada offline aparece com pendência e na ordem de abertura', () => {
  const servidor = [{ ...dados('a', '2026-01-01T10:00:00+00:00'), fotos: [] }];
  const ops = [{ id: '1', tipo: 'salvar-ordem', estado: 'pendente', ordem: dados('b', '2026-01-02T10:00:00.000Z') }];
  const [primeira, segunda] = aplicarOutbox(servidor, ops, local);
  assert.equal(primeira.id, 'b');
  assert.equal(primeira.alteracoesNaFila, 1);
  assert.equal(segunda.alteracoesNaFila, 0);
});

test('editar mantém fotos e abertura originais', () => {
  const servidor = [{ ...dados('a'), fotos: [fotoServidor] }];
  const ops = [{ id: '1', tipo: 'salvar-ordem', estado: 'pendente', ordem: { ...dados('a', '2030-01-01T00:00:00Z'), cliente: 'Novo' } }];
  const [ordem] = aplicarOutbox(servidor, ops, local);
  assert.equal(ordem.cliente, 'Novo');
  assert.equal(ordem.abertaEm, '2026-01-01T10:00:00Z');
  assert.deepEqual(ordem.fotos, [fotoServidor]);
});

test('foto na fila usa arquivo local e não duplica quando o servidor já devolve', () => {
  const foto = fotoFila('f1');
  const ops = [{ id: '1', tipo: 'enviar-foto', estado: 'pendente', foto }];
  const [ordem] = aplicarOutbox([{ ...dados('a'), fotos: [fotoServidor] }], ops, local);
  assert.equal(ordem.fotos.length, 1);
  assert.equal(ordem.fotos[0].url, 'file:///f1.jpg');
  assert.equal(ordem.fotos[0].envio, 'pendente');
});

test('foto já enviada segue visível, sem selo e sem contar como pendência, até recarregar', () => {
  const ops = [{ id: '1', tipo: 'enviar-foto', estado: 'feito', foto: fotoFila('f2') }];
  const [ordem] = aplicarOutbox([{ ...dados('a'), fotos: [] }], ops, local);
  assert.equal(ordem.fotos[0].envio, undefined);
  assert.equal(ordem.fotosNaFila, 0);
});

test('fotos e alterações na fila são contadas à parte, e o número de fotos bate com os selos', () => {
  const ops = [
    { id: '1', tipo: 'salvar-ordem', estado: 'pendente', ordem: dados('a') },
    { id: '2', tipo: 'enviar-foto', estado: 'pendente', foto: fotoFila('f2') },
    { id: '3', tipo: 'excluir-foto', estado: 'pendente', ordemId: 'a', fotoId: 'f1' },
  ];
  const [ordem] = aplicarOutbox([{ ...dados('a'), fotos: [fotoServidor] }], ops, local);
  assert.equal(ordem.fotosNaFila, ordem.fotos.filter((f) => f.envio).length);
  assert.equal(ordem.alteracoesNaFila, 2);
  assert.equal(descreverFila(ordem.fotosNaFila, ordem.alteracoesNaFila), '1 foto e 2 alterações');
  assert.equal(descreverFila(2, 0), '2 fotos');
  assert.equal(descreverFila(0, 1), '1 alteração');
});

test('foto na fila mostra quando foi adicionada no aparelho', () => {
  const ops = [{ id: '1', tipo: 'enviar-foto', estado: 'pendente', foto: fotoFila('f2') }];
  const [ordem] = aplicarOutbox([{ ...dados('a'), fotos: [] }], ops, local);
  assert.equal(ordem.fotos[0].criadaEm, '2026-01-02T00:00:00Z');
});

test('concluída exige foto de antes e de depois', () => {
  const foto = (secao) => ({ ...fotoServidor, secao });
  assert.equal(estaConcluida({ ...dados('a'), fotos: [foto('antes')] }), false);
  assert.equal(estaConcluida({ ...dados('a'), fotos: [foto('depois')] }), false);
  assert.equal(estaConcluida({ ...dados('a'), fotos: [foto('antes'), foto('depois')] }), true);
});

test('foto com erro mostra a mensagem e conta como pendência', () => {
  const ops = [{ id: '1', tipo: 'enviar-foto', estado: 'erro', erro: 'Formato', foto: fotoFila('f2') }];
  const [ordem] = aplicarOutbox([{ ...dados('a'), fotos: [] }], ops, local);
  assert.equal(ordem.fotos[0].envio, 'erro');
  assert.equal(ordem.fotos[0].erro, 'Formato');
  assert.equal(ordem.fotosNaFila, 1);
});

test('exclusão pendente some com a foto, inclusive se o envio veio antes na fila', () => {
  const ops = [
    { id: '1', tipo: 'enviar-foto', estado: 'feito', foto: fotoFila('f2') },
    { id: '2', tipo: 'excluir-foto', estado: 'pendente', ordemId: 'a', fotoId: 'f2' },
    { id: '3', tipo: 'excluir-foto', estado: 'pendente', ordemId: 'a', fotoId: 'f1' },
  ];
  const [ordem] = aplicarOutbox([{ ...dados('a'), fotos: [fotoServidor] }], ops, local);
  assert.deepEqual(ordem.fotos, []);
});

const fila = (...ids) => {
  const ops = ids.map((id) => ({ id, tipo: 'excluir-foto', estado: 'pendente', ordemId: 'a', fotoId: id }));
  return {
    ops,
    proxima: () => ops.find((o) => o.estado === 'pendente'),
    marcar: async (id, mudancas) => Object.assign(ops.find((o) => o.id === id), mudancas),
  };
};

test('processa em ordem e marca como feito', async () => {
  const f = fila('1', '2');
  const ordem = [];
  assert.equal(await drenar({ ...f, executar: async (op) => void ordem.push(op.id) }), true);
  assert.deepEqual(ordem, ['1', '2']);
  assert.ok(f.ops.every((o) => o.estado === 'feito'));
});

for (const [nome, erro] of [
  ['rede', new TypeError('Network request failed')],
  ['5xx', new ErroApi(503, 'fora do ar')],
  ['sessão expirada', new ErroApi(401, 'expirou')],
  ['limite de taxa', new ErroApi(429, 'calma')],
]) {
  test(`${nome} para a fila sem perder nem pular nada`, async () => {
    const f = fila('1', '2');
    const executadas = [];
    const resultado = await drenar({ ...f, executar: async (op) => { executadas.push(op.id); throw erro; } });
    assert.equal(resultado, false);
    assert.deepEqual(executadas, ['1']);
    assert.ok(f.ops.every((o) => o.estado === 'pendente'));
  });
}

test('erro permanente fica marcado e não trava o resto', async () => {
  const f = fila('1', '2');
  const resultado = await drenar({
    ...f,
    executar: async (op) => { if (op.id === '1') throw new ErroApi(400, 'Formato inválido'); },
  });
  assert.equal(resultado, true);
  assert.deepEqual(f.ops.map((o) => [o.estado, o.erro]), [['erro', 'Formato inválido'], ['feito', undefined]]);
});

test('operação adicionada durante a execução entra na mesma rodada', async () => {
  const f = fila('1');
  await drenar({
    ...f,
    executar: async (op) => {
      if (op.id === '1') f.ops.push({ id: '2', tipo: 'excluir-foto', estado: 'pendente', ordemId: 'a', fotoId: '2' });
    },
  });
  assert.ok(f.ops.every((o) => o.estado === 'feito'));
  assert.equal(f.ops.length, 2);
});

test('atraso cresce e estabiliza', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 99].map(atrasoDaTentativa), [5_000, 30_000, 120_000, 600_000, 600_000, 600_000]);
});

test('busca ignora acento e maiúscula, filtro separa abertas de concluídas', () => {
  const concluida = {
    ...dados('a'),
    cliente: 'Condomínio Aurora',
    fotos: [{ ...fotoServidor, secao: 'antes' }, { ...fotoServidor, secao: 'depois' }],
  };
  const andamento = { ...dados('b'), responsaveis: ['João'], fotos: [{ ...fotoServidor, secao: 'antes' }] };
  const ordens = [concluida, andamento];
  assert.deepEqual(filtrarOrdens(ordens, 'condominio', 'todas'), [concluida]);
  assert.deepEqual(filtrarOrdens(ordens, 'JOAO', 'todas'), [andamento]);
  assert.deepEqual(filtrarOrdens(ordens, '', 'concluidas'), [concluida]);
  assert.deepEqual(filtrarOrdens(ordens, '', 'andamento'), [andamento]);
});
