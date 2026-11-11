import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ampliar, ENQUADRO_INICIAL, limitarEnquadro, tamanhoContido } from './zoom.ts';

const tela = { largura: 400, altura: 800 };
// Foto 4:3 deitada: ocupa a largura toda e sobra preto em cima e embaixo.
const imagem = tamanhoContido({ largura: 4000, altura: 3000 }, tela);

test('foto contida respeita a proporção e cabe na tela', () => {
  assert.deepEqual(imagem, { largura: 400, altura: 300 });
  assert.deepEqual(tamanhoContido({ largura: 1000, altura: 4000 }, tela), { largura: 200, altura: 800 });
});

test('o ponto sob os dedos continua sob os dedos ao ampliar', () => {
  const foco = { x: 100, y: 50 };
  const e = ampliar(ENQUADRO_INICIAL, foco, foco, 2, imagem, tela);
  assert.equal(e.escala, 2);
  // Ponto da foto que estava no foco: (100, 50); com escala 2 precisa voltar ao mesmo lugar da tela.
  assert.equal(100 * e.escala + e.x, foco.x);
  // Em y a foto ampliada ainda cabe na altura (600 de 800), então o limite recentraliza.
  assert.equal(e.y, 0);
});

test('mover os dedos durante a pinça arrasta a foto', () => {
  const e = ampliar({ escala: 2, x: 0, y: 0 }, { x: 0, y: 0 }, { x: 30, y: 0 }, 1, imagem, tela);
  assert.equal(e.x, 30);
});

test('escala fica entre 1 e 5', () => {
  assert.equal(ampliar(ENQUADRO_INICIAL, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.2, imagem, tela).escala, 1);
  assert.equal(ampliar(ENQUADRO_INICIAL, { x: 0, y: 0 }, { x: 0, y: 0 }, 50, imagem, tela).escala, 5);
});

test('ao reduzir de volta a 1 a foto volta ao centro', () => {
  const ampliada = { escala: 3, x: 200, y: 100 };
  const e = ampliar(ampliada, { x: 50, y: 50 }, { x: 120, y: 90 }, 1 / 3, imagem, tela);
  assert.deepEqual(e, ENQUADRO_INICIAL);
});

test('não dá para arrastar a foto para fora da tela', () => {
  // Escala 2: 800x600 em tela 400x800. Sobra 200 para cada lado em x e nada em y.
  assert.deepEqual(limitarEnquadro({ escala: 2, x: 999, y: 999 }, imagem, tela), { escala: 2, x: 200, y: 0 });
  assert.deepEqual(limitarEnquadro({ escala: 2, x: -999, y: -999 }, imagem, tela), { escala: 2, x: -200, y: 0 });
  // Escala 4: 1600x1200. Agora também há folga em y.
  assert.deepEqual(limitarEnquadro({ escala: 4, x: 0, y: 999 }, imagem, tela), { escala: 4, x: 0, y: 200 });
});
