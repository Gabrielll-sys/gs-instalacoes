import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// As regras de valores são copiadas no app e no site: uma não pode mudar sem a outra.
test('valores.ts e o teste dele são iguais no app e no site', () => {
  for (const arquivo of ['valores.ts', 'valores.test.mjs', 'tipos.ts']) {
    const site = readFileSync(new URL(`./${arquivo}`, import.meta.url), 'utf8');
    const app = readFileSync(new URL(`../../mobile/src/${arquivo}`, import.meta.url), 'utf8');
    assert.equal(site, app, `${arquivo} está diferente entre web/src e mobile/src`);
  }
});
