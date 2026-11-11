import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buscarClientes, centavosDoItem, centavosDoTotal, formatarCentavos, formatarQuantidade, lerNumero, paraCampo, precoParaCampo, filtrarOrcamentos, problemaNoItem } from './valores.ts';

test('lê números no jeito brasileiro e recusa texto', () => {
  assert.equal(lerNumero('1.234,56'), 1234.56);
  assert.equal(lerNumero('12,5'), 12.5);
  assert.equal(lerNumero('12.5'), 12.5);
  assert.equal(lerNumero(' R$ 3.890,00 '), 3890);
  assert.equal(lerNumero(''), null);
  assert.equal(lerNumero('abc'), null);
  assert.equal(lerNumero('-1'), null);
  assert.equal(lerNumero(paraCampo(10.99)), 10.99);
  assert.equal(precoParaCampo(35.9), '35,90');
});

test('cada linha arredonda como o servidor e o total soma as linhas', () => {
  // 2,5 x 10,99 = 27,475: em ponto flutuante daria 27,47; o servidor arredonda para 27,48.
  assert.equal(centavosDoItem(2.5, 10.99), 2748);
  assert.equal(centavosDoItem(1, 3890), 389000);
  const itens = [
    { descricao: 'Cabo', quantidade: '2,5', unidade: 'm', preco: '10,99' },
    { descricao: 'Wallbox', quantidade: '1', unidade: 'un', preco: '3.890,00' },
  ];
  assert.equal(centavosDoTotal(itens), 391748);
  assert.equal(centavosDoTotal([...itens, { descricao: 'x', quantidade: '', unidade: 'un', preco: '1' }]), 391748);
  assert.match(formatarCentavos(391748), /^R\$\s3\.917,48$/);
  assert.equal(formatarQuantidade(12.5), '12,5');
});

test('item incompleto ou com casas demais é apontado', () => {
  const ok = { descricao: 'Cabo', quantidade: '2,5', unidade: 'm', preco: '10,99' };
  assert.equal(problemaNoItem(ok), null);
  assert.equal(problemaNoItem({ ...ok, preco: '0' }), null);
  assert.match(problemaNoItem({ ...ok, descricao: ' ' }), /material/);
  assert.match(problemaNoItem({ ...ok, quantidade: '0' }), /quantidade/);
  assert.match(problemaNoItem({ ...ok, quantidade: '1,0005' }), /quantidade/);
  assert.match(problemaNoItem({ ...ok, unidade: '' }), /unidade/);
  assert.match(problemaNoItem({ ...ok, preco: '1,234' }), /preço/);
});

test('busca de cliente e de orçamento ignora acento e acha pelo número', () => {
  const clientes = [
    { nome: 'Condomínio Aurora', telefone: '(31) 3333-0000', documento: '', endereco: 'Rua A' },
    { nome: 'João Prado', telefone: '', documento: '123', endereco: 'Av. Brasil' },
  ];
  assert.deepEqual(buscarClientes(clientes, 'condominio').map((c) => c.nome), ['Condomínio Aurora']);
  assert.deepEqual(buscarClientes(clientes, 'brasil').map((c) => c.nome), ['João Prado']);
  assert.equal(buscarClientes(clientes, '  ').length, 2);
  const orcamentos = [{ clienteNome: 'João Prado', numero: 7 }, { clienteNome: 'Aurora', numero: 12 }];
  assert.deepEqual(filtrarOrcamentos(orcamentos, '0007').map((o) => o.numero), [7]);
  assert.deepEqual(filtrarOrcamentos(orcamentos, 'joao').map((o) => o.numero), [7]);
});
