// Percorre Orçamentos, Clientes e a exclusão de OS no site, com uma API temporária (banco próprio) e o Vite em 5174.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const raiz = path.resolve(import.meta.dirname, '../..');
const tmp = tmpdir();
// Chrome ou Edge instalado; outro caminho vai em NAVEGADOR.
const NAVEGADOR = process.env.NAVEGADOR ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const projeto = `${raiz}/backend/OrdemServico.Api`;
const saida = `${raiz}/.impeccable/review`;
const banco = `${tmp}/gs-e2e-orcamentos-teste.db`;
const API = 'http://localhost:5299/api';
const SITE = 'http://localhost:5174';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ver = (nome, ok, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome} ${extra}`); if (!ok) process.exitCode = 1; };
for (const s of ['', '-shm', '-wal']) rmSync(`${banco}${s}`, { force: true });

const { Usuario: gestor, Senha: senhaGestor } = JSON.parse(readFileSync(`${projeto}/appsettings.Development.json`, 'utf8').replace(/^\uFEFF/, '')).Auth.GestorInicial;
// Com a porta ocupada, o teste falaria com outro servidor (e com o banco de verdade): para antes.
if (await fetch('http://localhost:5174').catch(() => null)) throw new Error('A porta 5174 já está em uso. Pare o npm run dev e rode de novo.');
if (await fetch('http://localhost:5299').catch(() => null)) throw new Error('A porta 5299 já está em uso. Pare a API temporária e rode de novo.');
const api = spawn('dotnet', [`${projeto}/bin/Debug/net10.0/OrdemServico.Api.dll`], {
  cwd: projeto,
  stdio: 'ignore',
  env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', ASPNETCORE_URLS: 'http://localhost:5299', ConnectionStrings__Db: `Data Source=${banco}` },
});
const vite = spawn('npx vite --port 5174 --strictPort', {
  cwd: `${raiz}/web`,
  shell: true,
  stdio: 'ignore',
  env: { ...process.env, VITE_API_URL: 'http://localhost:5299' },
});

const navegador = await puppeteer.launch({
  executablePath: NAVEGADOR,
  headless: true,
  userDataDir: `${tmp}/gs-e2e-perfil-${Date.now()}`,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const pagina = await navegador.newPage();
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
// O 400 esperado é o da exclusão recusada do cliente com orçamento.
pagina.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warn') && !m.text().includes('status of 400')) erros.push(m.text()); });

const texto = () => pagina.evaluate(() => document.body.innerText);
// O real formatado usa espaço sem quebra: compara com espaço comum.
const tem = async (t, espera = 8000) => { try { await pagina.waitForFunction((x) => document.body.innerText.replaceAll(' ', ' ').includes(x), { timeout: espera }, t); return true; } catch { return false; } };
const clicarTexto = async (t, seletor = 'a,button') => {
  const ok = await pagina.evaluate((alvo, sel) => {
    const e = [...document.querySelectorAll(sel)].filter((x) => x.innerText.trim() === alvo || x.getAttribute('aria-label') === alvo).at(-1);
    if (e) e.click();
    return !!e;
  }, t, seletor);
  if (!ok) throw new Error(`não achei: ${t}`);
  await dormir(700);
};
// Texto entra como inserção, não tecla a tecla: no Chrome sem janela, teclas dentro de um <dialog> aberto se perdem.
const digitar = async (campo, valor) => {
  await campo.focus();
  await campo.evaluate((e) => e.select());
  if (valor) await pagina.keyboard.sendCharacter(valor);
  else await pagina.keyboard.press('Delete');
};
const preencher = async (rotulo, valor) => {
  const id = await pagina.evaluate((r) => [...document.querySelectorAll('label')].filter((l) => l.innerText.trim() === r).at(-1)?.htmlFor, rotulo);
  if (!id) throw new Error(`campo não encontrado: ${rotulo}`);
  await digitar(await pagina.$(`[id="${id}"]`), valor);
};
const preencherItem = async (n, rotulo, valor) => {
  const campos = await pagina.$$(`.item-editor:nth-child(${n}) label.campo`);
  for (const c of campos) {
    if ((await c.$eval('.campo-rotulo', (e) => e.innerText.trim())) === rotulo) return digitar(await c.$('input'), valor);
  }
  throw new Error(`campo do item ${n} não encontrado: ${rotulo}`);
};
// O site pergunta com um <dialog class="confirmacao"> próprio: responde clicando no botão pelo texto.
const responder = async (acao) => {
  await pagina.waitForSelector('dialog.confirmacao[open]', { timeout: 5000 });
  const titulo = await pagina.$eval('dialog.confirmacao h2', (e) => e.innerText);
  await pagina.evaluate((a) => [...document.querySelectorAll('dialog.confirmacao button')].find((b) => b.innerText.trim() === a).click(), acao);
  await dormir(700);
  return titulo;
};
const abertos = () => pagina.evaluate(() => document.querySelectorAll('dialog[open]').length);
const foto = (nome) => pagina.screenshot({ path: `${saida}/${nome}.png` });
const semRolagemLateral = () => pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
let token;
const chamar = (c, m = 'GET', corpo) => fetch(`${API}${c}`, { method: m, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: corpo && JSON.stringify(corpo) });

try {
  for (let i = 0; i < 60; i++) { if (await fetch(`${API}/ordens`).catch(() => null)) break; await dormir(500); }
  for (let i = 0; i < 60; i++) { if (await fetch(SITE).catch(() => null)) break; await dormir(500); }

  await pagina.goto(`${SITE}/login`, { waitUntil: 'networkidle2' });
  await preencher('Usuário', gestor);
  await preencher('Senha', senhaGestor);
  await clicarTexto('Entrar');
  await tem('Nenhuma OS aberta ainda');
  token = await pagina.evaluate(() => JSON.parse(localStorage.getItem('gs.sessao')).token);

  // Lista vazia e nova
  await clicarTexto('Orçamentos', 'a');
  ver('lista vazia explica o próximo passo', await tem('Nenhum orçamento ainda'));
  ver('trilho marca Orçamentos', await pagina.evaluate(() => document.querySelector('.trilho-item[aria-current="page"]')?.innerText.trim() === 'Orçamentos'));
  await clicarTexto('Novo orçamento');
  ver('sem clientes, o formulário avisa', await tem('Nenhum cliente cadastrado ainda'));

  // Cadastro de cliente por cima do orçamento
  await preencherItem(1, 'Material', 'Cabo flexível 10 mm²');
  await clicarTexto('Cadastrar cliente');
  ver('cadastro abre por cima do orçamento', (await abertos()) === 2);
  await preencher('Nome', 'Maria Souza (fictícia)');
  // Fechar pelo X: no Chrome sem janela, o Esc sobre dois diálogos não chega igual ao do navegador de verdade.
  await clicarTexto('Fechar');
  const pergunta = await responder('Descartar');
  ver('fechar com alteração pergunta e fecha só o cadastro', (await abertos()) === 1 && pergunta.startsWith('Descartar'));
  ver('o que foi digitado no orçamento continua', await pagina.$eval('.item-editor input', (e) => e.value) === 'Cabo flexível 10 mm²');
  await clicarTexto('Cadastrar cliente');
  await preencher('Nome', 'Maria Souza (fictícia)');
  await preencher('Telefone', '31900000000');
  await preencher('E-mail', 'sem-arroba');
  ver('telefone ganha a máscara ao sair do campo', (await pagina.$eval('input[type=tel]', (e) => e.value)) === '(31) 90000-0000');
  await preencher('CPF ou CNPJ', '000.000.000-00');
  await preencher('Endereço', 'Rua Exemplo, 100 – Belo Horizonte/MG');
  await clicarTexto('Cadastrar cliente', 'button[type=submit]');
  ver('e-mail inválido é apontado', await tem('Confira o e-mail.'));
  await preencher('E-mail', 'maria@exemplo.com');
  await foto('web-cliente-por-cima');
  await clicarTexto('Cadastrar cliente', 'button[type=submit]');
  await dormir(800);
  ver('cliente criado volta escolhido', (await abertos()) === 1 && (await tem('Maria Souza (fictícia)')) && (await tem('Trocar')));

  // Itens e total
  await preencherItem(1, 'Qtd.', '2,5');
  await preencherItem(1, 'Un.', 'm');
  await preencherItem(1, 'Preço unit.', '10,99');
  ver('total do item arredonda como o servidor', await tem('Total do item: R$ 27,48'));
  await clicarTexto('Adicionar item');
  await preencherItem(2, 'Material', 'Wallbox 7,4 kW');
  await preencherItem(2, 'Preço unit.', '3.890,00');
  await clicarTexto('Adicionar item');
  await clicarTexto('Criar orçamento');
  ver('item vazio é apontado', await tem('Informe o material.'));
  ver('não salva com erro', pagina.url().endsWith('/orcamentos/novo'));
  await clicarTexto('Remover item 3');
  ver('total no rodapé soma as linhas', await pagina.$eval('.rodape-total strong', (e) => e.innerText.replace(/\s/g, ' ')) === 'R$ 3.917,48');
  await preencher('Forma de pagamento', 'PIX à vista ou cartão em até 3x');
  await preencher('Prazo de execução', 'Até 5 dias úteis após a aprovação');
  await foto('web-orcamento-form');
  await clicarTexto('Criar orçamento');
  await dormir(800);
  ver('criar abre o orçamento salvo', /\/orcamentos\/[0-9a-f-]{36}$/.test(pagina.url()) && (await tem('Orçamento 0001')) && (await tem('2 itens')));

  // PDF
  await clicarTexto('Gerar orçamento em PDF');
  ver('PDF fica pronto', await tem('Orçamento pronto. Confira antes de enviar ao cliente.', 20000));
  ver('Baixar usa o nome do servidor', await pagina.$eval('a[download]', (a) => a.getAttribute('download')) === 'Orcamento-0001.pdf');
  await foto('web-orcamento');

  // Editar deixa o PDF velho
  await clicarTexto('Editar orçamento');
  await preencherItem(1, 'Qtd.', '3');
  await clicarTexto('Salvar');
  await dormir(800);
  ver('editar volta ao orçamento com o novo total', (await tem('R$ 3.922,97')) && !(await texto()).includes('Orçamento pronto'));

  // Situação, contato e duplicar
  ver('telefone vira Ligar e WhatsApp', await pagina.$eval('a[href^="https://wa.me/"]', (a) => a.getAttribute('href')) === 'https://wa.me/5531900000000');
  await clicarTexto('Aprovado', 'button[role=radio]');
  ver('situação muda na hora', await pagina.$eval('button[role=radio][aria-checked=true]', (b) => b.innerText.trim()) === 'Aprovado');
  await clicarTexto('Duplicar orçamento');
  ver('duplicar abre a cópia preenchida', (await tem('Cópia do orçamento 0001')) && (await pagina.$eval('.item-editor input', (e) => e.value)) === 'Cabo flexível 10 mm²');
  await preencherItem(2, 'Preço unit.', '3890');
  await preencherItem(2, 'Material', 'Wallbox 7,4 kW');
  ver('preço ganha milhar ao sair do campo', (await pagina.$$eval('.item-editor', (l) => l[1].querySelectorAll('input')[3].value)) === '3.890,00');
  await clicarTexto('Subir item 2');
  ver('subir troca a ordem dos itens', (await pagina.$eval('.item-editor input', (e) => e.value)) === 'Wallbox 7,4 kW');
  await clicarTexto('Criar orçamento');
  await dormir(800);
  ver('a cópia ganha número novo e começa em aberto', (await tem('Orçamento 0002')) && (await pagina.$eval('button[role=radio][aria-checked=true]', (b) => b.innerText.trim())) === 'Em aberto');
  await clicarTexto('Excluir orçamento');
  await responder('Excluir orçamento');
  await clicarTexto('Maria Souza (fictícia)', 'a.linha strong');
  await dormir(500);

  // Lista e clientes
  await pagina.keyboard.press('Escape');
  await dormir(500);
  ver('lista mostra cliente, número, total e situação', (await tem('Maria Souza (fictícia)')) && (await tem('Nº 0001')) && (await tem('R$ 3.922,97')) && (await tem('Aprovado')));
  await clicarTexto('Em aberto\n0', '.filtros button');
  ver('filtro de situação esconde o aprovado', await tem('Nenhum orçamento encontrado'));
  await clicarTexto('Todos\n1', '.filtros button');
  await foto('web-orcamentos');
  await clicarTexto('Clientes', 'a');
  await clicarTexto('Maria Souza (fictícia)', 'a.linha strong');
  await dormir(300);
  await clicarTexto('Excluir cliente');
  await responder('Excluir cliente');
  ver('cliente com orçamento não é excluído', await tem('Este cliente tem orçamentos'));
  await foto('web-clientes');

  // Celular
  await pagina.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await pagina.goto(`${SITE}/orcamentos`, { waitUntil: 'networkidle2' });
  await dormir(600);
  ver('celular: barra cabe sem rolar', await pagina.evaluate(() => { const t = document.querySelector('.trilho'); return t.scrollWidth <= t.clientWidth; }));
  ver('celular: sem rolagem lateral na lista', await semRolagemLateral());
  ver('390px: gestor cabe só com ícones', (await pagina.evaluate(() => { const t = document.querySelector('.trilho'); return t.scrollWidth <= t.clientWidth; })));
  await foto('web-celular-orcamentos');
  const id = pagina.url();
  await clicarTexto('Maria Souza (fictícia)', 'a.linha strong');
  await dormir(600);
  await foto('web-celular-orcamento');
  await clicarTexto('Editar orçamento');
  await dormir(500);
  ver('celular: formulário sem rolagem lateral', await pagina.evaluate(() => { const c = document.querySelector('.gaveta-corpo'); return c.scrollWidth <= c.clientWidth; }));
  await foto('web-celular-orcamento-form');
  await pagina.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await dormir(300);
  ver('360px: barra cabe sem rolar', await pagina.evaluate(() => { const t = document.querySelector('.trilho'); return t.scrollWidth <= t.clientWidth; }));
  const barra = () => pagina.evaluate(() => {
    const t = document.querySelector('.trilho');
    const rotulos = [...document.querySelectorAll('.trilho-nav .trilho-item')].map((i) => (i.querySelector('span')?.offsetWidth ? i.getAttribute('aria-label') : ''));
    return { cabe: t.scrollWidth <= t.clientWidth, rotulos: rotulos.filter(Boolean) };
  });
  for (const largura of [520, 600, 800]) {
    await pagina.setViewport({ width: largura, height: 900, deviceScaleFactor: 1 });
    await dormir(300);
    const b = await barra();
    ver(`${largura}px: barra cabe e mostra o nome da área aberta`, b.cabe && b.rotulos.includes('Orçamentos'), JSON.stringify(b.rotulos));
  }
  for (const largura of [500, 390, 360]) {
    await pagina.setViewport({ width: largura, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await dormir(300);
    const b = await barra();
    ver(`${largura}px: gestor vê o nome da área aberta e a barra cabe`, b.cabe && b.rotulos.join() === 'Orçamentos', JSON.stringify(b.rotulos));
  }
  await foto('web-celular-gestor-360');
  await pagina.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  void id;

  // Excluir
  await pagina.goto(`${SITE}/orcamentos`, { waitUntil: 'networkidle2' });
  await clicarTexto('Maria Souza (fictícia)', 'a.linha strong');
  await clicarTexto('Excluir orçamento');
  const perguntaOrcamento = await responder('Excluir orçamento');
  ver('excluir confirma e some da lista', (await tem('Nenhum orçamento ainda')) && perguntaOrcamento.startsWith('Excluir o orçamento 0001'));

  // OS: o nome sugere os clientes cadastrados, e o gestor exclui a OS
  await pagina.goto(`${SITE}/ordens/nova`, { waitUntil: 'networkidle2' });
  await dormir(600);
  ver('nome da OS sugere o cliente cadastrado', (await pagina.$$eval('#clientes-cadastrados option', (o) => o.map((x) => x.value))).includes('Maria Souza (fictícia)'));
  const idOs = randomUUID();
  await chamar(`/ordens/${idOs}`, 'PUT', { id: idOs, cliente: 'OS para excluir (fictícia)', responsaveis: ['Gestor'], observacoes: '', abertaEm: new Date().toISOString() });
  await pagina.goto(`${SITE}/ordens/${idOs}`, { waitUntil: 'networkidle2' });
  await dormir(600);
  await clicarTexto('Excluir OS');
  await foto('web-excluir-os');
  ver('excluir OS pergunta antes', (await responder('Excluir OS')).startsWith('Excluir a OS de OS para excluir'));
  ver('OS excluída some da lista', (await tem('Nenhuma OS aberta ainda')) && !(await (await chamar('/ordens')).json()).some((o) => o.id === idOs));

  await clicarTexto('Clientes', 'a');
  await clicarTexto('Maria Souza (fictícia)', 'a.linha strong');
  await clicarTexto('Excluir cliente');
  await responder('Excluir cliente');
  ver('sem orçamento, o cliente é excluído', await tem('Nenhum cliente cadastrado'));

  // Técnico no celular: uma área só, com o nome à vista, e sem Orçamentos nem Clientes
  const novo = await (await chamar('/usuarios', 'POST', { login: 'tecnico.teste', nome: 'Técnico Teste', papel: 'tecnico' })).json();
  const sessaoTecnico = await (await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'tecnico.teste', senha: '1234' }) })).json();
  await fetch(`${API}/conta/senha`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessaoTecnico.token}` }, body: JSON.stringify({ atual: '1234', nova: 'senha-teste-123' }) });
  await pagina.evaluate(() => localStorage.clear());
  await pagina.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await pagina.goto(`${SITE}/login`, { waitUntil: 'networkidle2' });
  await preencher('Usuário', 'tecnico.teste');
  await preencher('Senha', 'senha-teste-123');
  await clicarTexto('Entrar');
  await tem('Nenhuma OS aberta ainda');
  const t = await barra();
  ver('técnico a 360px: Ordens com nome e barra cabendo', t.cabe && t.rotulos.join() === 'Ordens de serviço', JSON.stringify(t.rotulos));
  await foto('web-celular-tecnico');
  await pagina.goto(`${SITE}/orcamentos`, { waitUntil: 'networkidle2' });
  await dormir(600);
  ver('técnico não abre Orçamentos pelo endereço', !pagina.url().includes('/orcamentos'));
  void novo;
} catch (e) {
  console.log('interrompido:', e.message);
  await foto('web-erro').catch(() => {});
  process.exitCode = 1;
} finally {
  ver('nenhum erro nem aviso no navegador', erros.length === 0, erros.slice(0, 3).join(' | '));
  await navegador.close();
  api.kill();
  spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' });
  await dormir(1500);
  for (const s of ['', '-shm', '-wal']) rmSync(`${banco}${s}`, { force: true });
}
