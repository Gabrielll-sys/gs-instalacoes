import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrumarPreco, buscarClientes, contatoDoTelefone, mascararDocumento, mascararTelefone, moverItem, centavosDoItem, centavosDoTotal, formatarCentavos, formatarQuantidade, lerNumero, paraCampo, precoParaCampo, filtrarOrcamentos, problemaNoItem } from './valores.ts';

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
  assert.equal(precoParaCampo(3890), '3.890,00');
  assert.equal(lerNumero(precoParaCampo(3890)), 3890);
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
  assert.equal(problemaNoItem({ ...ok, descricao: ' ' }).campo, 'descricao');
  assert.equal(problemaNoItem({ ...ok, quantidade: '0' }).campo, 'quantidade');
  assert.equal(problemaNoItem({ ...ok, quantidade: '1,0005' }).campo, 'quantidade');
  assert.equal(problemaNoItem({ ...ok, unidade: '' }).campo, 'unidade');
  assert.equal(problemaNoItem({ ...ok, preco: '1,234' }).campo, 'preco');
  assert.match(problemaNoItem({ ...ok, preco: '1,234' }).mensagem, /preço/);
});

test('busca de cliente e de orçamento ignora acento e acha pelo número', () => {
  const clientes = [
    { nome: 'Condomínio Aurora', telefone: '(31) 3333-0000', documento: '', endereco: 'Rua A' },
    { nome: 'João Prado', telefone: '', documento: '123', endereco: 'Av. Brasil' },
  ];
  assert.deepEqual(buscarClientes(clientes, 'condominio').map((c) => c.nome), ['Condomínio Aurora']);
  assert.deepEqual(buscarClientes(clientes, 'brasil').map((c) => c.nome), ['João Prado']);
  assert.equal(buscarClientes(clientes, '  ').length, 2);
  const orcamentos = [{ clienteNome: 'João Prado', numero: 7, situacao: 'aprovado' }, { clienteNome: 'Aurora', numero: 12, situacao: 'aberto' }];
  assert.deepEqual(filtrarOrcamentos(orcamentos, '0007').map((o) => o.numero), [7]);
  assert.deepEqual(filtrarOrcamentos(orcamentos, 'joao').map((o) => o.numero), [7]);
  assert.deepEqual(filtrarOrcamentos(orcamentos, '', 'aberto').map((o) => o.numero), [12]);
});

test('máscaras só fecham com a quantidade certa de dígitos', () => {
  assert.equal(mascararTelefone('31999990000'), '(31) 99999-0000');
  assert.equal(mascararTelefone('3133330000'), '(31) 3333-0000');
  assert.equal(mascararTelefone('+1 555 0100 ramal 2'), '+1 555 0100 ramal 2');
  assert.equal(mascararDocumento('12345678901'), '123.456.789-01');
  assert.equal(mascararDocumento('12345678000199'), '12.345.678/0001-99');
  assert.equal(mascararDocumento('123'), '123');
  assert.equal(arrumarPreco('3890'), '3.890,00');
  assert.equal(arrumarPreco('10,9'), '10,90');
  assert.equal(arrumarPreco('1,234'), '1,234');
  assert.equal(arrumarPreco('abc'), 'abc');
});

test('contato só para telefone do Brasil com DDD', () => {
  assert.deepEqual(contatoDoTelefone('(31) 99999-0000'), { ligar: 'tel:+5531999990000', whatsapp: 'https://wa.me/5531999990000' });
  assert.equal(contatoDoTelefone('+55 31 3333-0000').whatsapp, 'https://wa.me/553133330000');
  assert.equal(contatoDoTelefone('9999-0000'), null);
});

test('mover item troca de lugar e ignora a borda', () => {
  assert.deepEqual(moverItem(['a', 'b', 'c'], 2, 1), ['a', 'c', 'b']);
  assert.deepEqual(moverItem(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c']);
});
