// Percorre login, Equipe, OS, fotos, relatório e celular no site com uma API temporária (banco próprio) e o Vite em 5173.
// Envia fotos de verdade ao R2 configurado no .env da API (o CORS do bucket precisa aceitar localhost:5173) e apaga no fim.
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const raiz = path.resolve(import.meta.dirname, '../..');
const tmp = tmpdir();
// Chrome ou Edge instalado; outro caminho vai em NAVEGADOR.
const NAVEGADOR = process.env.NAVEGADOR ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const projeto = `${raiz}/backend/OrdemServico.Api`;
const saida = `${raiz}/.impeccable/review`;
const banco = `${tmp}/gs-e2e-web-teste.db`;
const API = 'http://localhost:5299/api';
const SITE = 'http://localhost:5173';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ver = (nome, ok, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome} ${extra}`); if (!ok) process.exitCode = 1; };
for (const s of ['', '-shm', '-wal']) rmSync(`${banco}${s}`, { force: true });

const { Usuario: gestor, Senha: senhaGestor } = JSON.parse(readFileSync(`${projeto}/appsettings.Development.json`, 'utf8').replace(/^\uFEFF/, '')).Auth.GestorInicial;
// Com a porta ocupada, o teste falaria com outro servidor (e com o banco de verdade): para antes.
if (await fetch('http://localhost:5173').catch(() => null)) throw new Error('A porta 5173 já está em uso. Pare o npm run dev e rode de novo.');
if (await fetch('http://localhost:5299').catch(() => null)) throw new Error('A porta 5299 já está em uso. Pare a API temporária e rode de novo.');
const api = spawn('dotnet', [`${projeto}/bin/Debug/net10.0/OrdemServico.Api.dll`], {
  cwd: projeto,
  stdio: 'ignore',
  env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', ASPNETCORE_URLS: 'http://localhost:5299', ConnectionStrings__Db: `Data Source=${banco}` },
});
const vite = spawn('npx vite --port 5173 --strictPort', {
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
pagina.on('console', (m) => { if (m.type() === 'error' && !(m.text().includes('401') && !token)) erros.push(m.text()); });

const texto = () => pagina.evaluate(() => document.body.innerText);
const tem = async (t, espera = 8000) => { try { await pagina.waitForFunction((x) => document.body.innerText.includes(x), { timeout: espera }, t); return true; } catch { return false; } };
const clicarTexto = async (t, seletor = 'a,button') => {
  const ok = await pagina.evaluate((alvo, sel) => {
    const e = [...document.querySelectorAll(sel)].filter((x) => x.innerText.trim() === alvo || x.getAttribute('aria-label') === alvo).at(-1);
    if (e) e.click();
    return !!e;
  }, t, seletor);
  if (!ok) throw new Error(`não achei: ${t}`);
  await dormir(700);
};
const preencher = async (rotulo, valor) => {
  const id = await pagina.evaluate((r) => [...document.querySelectorAll('label')].filter((l) => l.innerText.trim() === r).at(-1)?.htmlFor, rotulo);
  if (!id) throw new Error(`campo não encontrado: ${rotulo}`);
  const campo = await pagina.$(`[id="${id}"]`);
  // Texto entra como inserção, não tecla a tecla: no Chrome sem janela, teclas dentro de um <dialog> aberto se perdem.
  await campo.focus();
  await campo.evaluate((e) => e.select());
  await pagina.keyboard.sendCharacter(valor);
};
// O site pergunta com um <dialog class="confirmacao"> próprio: responde clicando no botão pelo texto.
const responder = async (acao) => {
  await pagina.waitForSelector('dialog.confirmacao[open]', { timeout: 5000 });
  const titulo = await pagina.$eval('dialog.confirmacao h2', (e) => e.innerText);
  await pagina.evaluate((a) => [...document.querySelectorAll('dialog.confirmacao button')].find((b) => b.innerText.trim() === a).click(), acao);
  await dormir(700);
  return titulo;
};
// Imagem gerada na hora, para o teste não depender de foto de ninguém.
const amostra = async (nome, largura, altura) => {
  const dados = await pagina.evaluate((l, a) => {
    const c = document.createElement('canvas');
    c.width = l;
    c.height = a;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, l, a);
    grad.addColorStop(0, '#00265f');
    grad.addColorStop(1, '#eab827');
    g.fillStyle = grad;
    g.fillRect(0, 0, l, a);
    return c.toDataURL('image/jpeg', 0.92).split(',')[1];
  }, largura, altura);
  const arquivo = `${tmp}/gs-e2e-${nome}`;
  writeFileSync(arquivo, Buffer.from(dados, 'base64'));
  return arquivo;
};
// O pedido de fechar que o Esc faria: no Chrome sem janela, o Esc não chega ao <dialog> de cima.
const pedirFechar = () => pagina.evaluate(() => [...document.querySelectorAll('dialog[open]')].at(-1).dispatchEvent(new Event('cancel', { cancelable: true })));
const foto = (nome) => pagina.screenshot({ path: `${saida}/${nome}.png` });
let token;
const chamar = (c, m = 'GET', corpo) => fetch(`${API}${c}`, { method: m, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: corpo && JSON.stringify(corpo) });

try {
  for (let i = 0; i < 60; i++) { if (await fetch(`${API}/ordens`).catch(() => null)) break; await dormir(500); }
  for (let i = 0; i < 60; i++) { if (await fetch(SITE).catch(() => null)) break; await dormir(500); }

  // Login
  await pagina.goto(`${SITE}/`, { waitUntil: 'networkidle2' });
  ver('sem sessão vai para o login', pagina.url().endsWith('/login'));
  ver('login sem a frase Ordens de serviço', !(await texto()).includes('Ordens de serviço'));
  await foto('web-login');
  await preencher('Usuário', gestor);
  await preencher('Senha', 'errada');
  await clicarTexto('Entrar');
  ver('senha errada mostra o motivo', await tem('Usuário ou senha incorretos'));
  await preencher('Senha', senhaGestor);
  await clicarTexto('Entrar');
  ver('gestor entra direto na lista', await tem('Nenhuma OS aberta ainda'));
  token = await pagina.evaluate(() => JSON.parse(localStorage.getItem('gs.sessao')).token);

  // Equipe
  await clicarTexto('Equipe');
  ver('Equipe mostra a dica sem técnico', await tem('Nenhum técnico cadastrado ainda'));
  await clicarTexto('Nova conta');
  ver('nova conta avisa a senha padrão', await tem('A senha inicial é 1234'));
  await preencher('Nome', 'Carlos Lima');
  await preencher('Usuário', 'carlos');
  await foto('web-nova-conta');
  await clicarTexto('Criar conta');
  ver('conta criada aparece na lista', await tem('Ainda usa a senha padrão'));
  await pagina.goto(`${SITE}/equipe`, { waitUntil: 'networkidle2' });
  await pagina.evaluate(() => [...document.querySelectorAll('a.linha')].find((a) => a.querySelector('strong')?.innerText.trim() === 'Gestor').click());
  await dormir(700);
  ver('única conta de gestor trava o papel', await tem('Esta é a única conta de gestor'));
  await pedirFechar();
  await dormir(700);
  ver('Esc fecha a gaveta', !(await pagina.evaluate(() => !!document.querySelector('dialog[open]'))));

  // Nova OS
  await clicarTexto('Ordens de serviço', 'a');
  await clicarTexto('Nova OS');
  ver('gaveta de Nova OS abre', await tem('Registrada automaticamente'));
  await clicarTexto('Abrir OS');
  ver('validação do formulário', await tem('Informe o nome do cliente.'));
  await preencher('Nome do cliente', 'Residencial Exemplo');
  await clicarTexto('Carlos Lima');
  await clicarTexto('Abrir OS');
  ver('OS criada abre na gaveta', await tem('Enviar fotos'));
  const ordens = await (await chamar('/ordens')).json();
  const ordem = ordens.find((o) => o.cliente === 'Residencial Exemplo');
  ver('OS chegou à API com o responsável', ordem?.responsaveis.join() === 'Carlos Lima');

  // Fotos
  const entradas = await pagina.$$('dialog[open] input[type=file]');
  await entradas[0].uploadFile(await amostra('retrato.jpg', 3000, 4000), await amostra('paisagem.jpg', 4000, 3000));
  ver('envio mostra o andamento', await tem('Enviando', 3000));
  await pagina.waitForFunction(() => document.querySelectorAll('dialog[open] .miniatura').length >= 2, { timeout: 60000 });
  ver('duas fotos em ANTES', true);
  await (await pagina.$$('dialog[open] input[type=file]'))[1].uploadFile(await amostra('outra.jpg', 2000, 2000));
  await pagina.waitForFunction(() => document.querySelectorAll('dialog[open] .miniatura').length >= 3, { timeout: 60000 });
  let enviadas = (await (await chamar('/ordens')).json()).find((o) => o.id === ordem.id).fotos;
  ver('fotos chegaram em WebP', enviadas.length === 3 && enviadas.every((f) => f.url.endsWith('.webp')), enviadas.map((f) => f.url.slice(-5)).join());
  await dormir(1500);
  await foto('web-os-fotos');

  // Visualizador
  await pagina.$eval('dialog[open] .miniatura', (e) => e.click());
  ver('visualizador abre dentro da gaveta', await pagina.waitForSelector('dialog[open] .yarl__root', { timeout: 5000 }).then(() => true).catch(() => false));
  ver('legenda diz quando foi adicionada', await tem('Adicionada em'));
  await dormir(800);
  await foto('web-visualizador');
  await clicarTexto('Próxima foto', 'button');
  await dormir(500);
  ver('próxima troca de foto', await tem('ANTES 2 de 2'));
  await clicarTexto('Fechar', '.yarl__root button');
  await dormir(800);
  ver('fechar o visualizador deixa a gaveta aberta', await pagina.evaluate(() => !document.querySelector('.yarl__root') && !!document.querySelector('dialog[open]')));

  // Relatório
  await clicarTexto('Gerar relatório em PDF');
  ver('relatório pronto oferece Abrir e Baixar', await tem('Relatório pronto', 60000));
  const pdf = await pagina.evaluate(async () => {
    const a = [...document.querySelectorAll('a[download]')].at(-1);
    const b = await (await fetch(a.href)).blob();
    return { nome: a.getAttribute('download'), tipo: b.type, tamanho: b.size };
  });
  ver('PDF baixável com nome da OS', pdf.tipo === 'application/pdf' && pdf.tamanho > 100000 && pdf.nome.startsWith('Relatorio-OS-'), JSON.stringify(pdf));
  await foto('web-relatorio');

  // Excluir uma foto pelo visualizador
  await pagina.$eval('dialog[open] .miniatura', (e) => e.click());
  await dormir(800);
  await clicarTexto('Excluir foto', 'button');
  await responder('Excluir foto');
  await dormir(2000);
  enviadas = (await (await chamar('/ordens')).json()).find((o) => o.id === ordem.id).fotos;
  ver('exclusão tira a foto', enviadas.length === 2);
  await clicarTexto('Fechar', '.yarl__root button');
  await dormir(600);

  // Editar e descartar
  await clicarTexto('Editar OS');
  await preencher('Nome do cliente', 'Nome que não vai ficar');
  await pedirFechar();
  await responder('Descartar');
  await dormir(600);
  ver('descartar volta para a OS sem salvar', await tem('Residencial Exemplo') && !(await texto()).includes('Editar OS'));

  // Celular
  await pagina.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await pagina.goto(`${SITE}/`, { waitUntil: 'networkidle2' });
  await dormir(800);
  await foto('web-celular-lista');
  await pagina.goto(`${SITE}/ordens/${ordem.id}`, { waitUntil: 'networkidle2' });
  await dormir(1500);
  await foto('web-celular-os');
  const largura = await pagina.evaluate(() => document.documentElement.scrollWidth);
  ver('sem rolagem horizontal no celular', largura <= 390, largura);
  await pagina.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // Técnico
  await clicarTexto('Sair');
  await dormir(800);
  await preencher('Usuário', 'carlos');
  await preencher('Senha', '1234');
  await clicarTexto('Entrar');
  ver('técnico com 1234 cai na troca de senha', await tem('Você entrou com a senha padrão'));
  await foto('web-trocar-senha');
  await preencher('Senha padrão', '1234');
  await preencher('Nova senha', 'carlos-nova-1');
  await clicarTexto('Salvar senha');
  ver('técnico chega à lista', await tem('Residencial Exemplo'));
  ver('técnico não vê Equipe', !(await pagina.evaluate(() => [...document.querySelectorAll('a')].some((a) => a.innerText.trim() === 'Equipe'))));
  await pagina.goto(`${SITE}/ordens/${ordem.id}`, { waitUntil: 'networkidle2' });
  await dormir(1500);
  ver('técnico não vê o relatório', !(await texto()).includes('Gerar relatório em PDF'));
  await pagina.goto(`${SITE}/equipe`, { waitUntil: 'networkidle2' });
  await dormir(800);
  ver('técnico não abre Equipe pelo endereço', !pagina.url().includes('/equipe'));
  await foto('web-lista');
} catch (e) {
  console.log('interrompido:', e.message);
  await foto('web-erro').catch(() => {});
  process.exitCode = 1;
} finally {
  const lista = token ? await (await chamar('/ordens')).json().catch(() => []) : [];
  let removidas = 0;
  for (const o of lista) for (const f of o.fotos) { await chamar(`/ordens/${o.id}/fotos/${f.id}`, 'DELETE'); removidas++; }
  console.log('fotos de teste removidas do R2:', removidas);
  ver('nenhum erro no navegador', erros.length === 0, erros.slice(0, 3).join(' | '));
  await navegador.close();
  api.kill();
  spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' });
  await dormir(1500);
  for (const s of ['', '-shm', '-wal']) rmSync(`${banco}${s}`, { force: true });
}
