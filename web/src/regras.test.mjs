import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estaConcluida, filtrarOrdens, LIMITE_FOTO_BYTES, PASSOS_COMPRESSAO } from './regras.ts';

const foto = (secao) => ({ id: secao, ordemId: 'a', secao, url: '', criadaEm: '2026-01-01T00:00:00Z' });
const ordem = (id, cliente, responsaveis, fotos) => ({ id, cliente, responsaveis, observacoes: '', abertaEm: '2026-01-01T00:00:00Z', fotos });

test('concluída exige foto de antes e de depois', () => {
  assert.equal(estaConcluida(ordem('a', 'X', ['Ana'], [foto('antes')])), false);
  assert.equal(estaConcluida(ordem('a', 'X', ['Ana'], [foto('depois')])), false);
  assert.equal(estaConcluida(ordem('a', 'X', ['Ana'], [foto('antes'), foto('depois')])), true);
});

test('busca ignora acento e maiúscula, filtro separa abertas de concluídas', () => {
  const concluida = ordem('a', 'Condomínio Aurora', ['Ana'], [foto('antes'), foto('depois')]);
  const aberta = ordem('b', 'Casa', ['João'], [foto('antes')]);
  const ordens = [concluida, aberta];
  assert.deepEqual(filtrarOrdens(ordens, 'condominio', 'todas'), [concluida]);
  assert.deepEqual(filtrarOrdens(ordens, 'JOAO', 'todas'), [aberta]);
  assert.deepEqual(filtrarOrdens(ordens, '', 'concluidas'), [concluida]);
  assert.deepEqual(filtrarOrdens(ordens, '', 'andamento'), [aberta]);
});

test('compressão começa sem perda visível e só depois reduz', () => {
  assert.equal(LIMITE_FOTO_BYTES, 4 * 1024 * 1024);
  assert.deepEqual(PASSOS_COMPRESSAO[0], { lado: 4096, qualidade: 0.85 });
  for (let i = 1; i < PASSOS_COMPRESSAO.length; i++) {
    const [antes, depois] = [PASSOS_COMPRESSAO[i - 1], PASSOS_COMPRESSAO[i]];
    assert.ok(depois.lado <= antes.lado && depois.qualidade <= antes.qualidade && (depois.lado < antes.lado || depois.qualidade < antes.qualidade));
  }
});
