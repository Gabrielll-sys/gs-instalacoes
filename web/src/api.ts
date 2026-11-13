import { sessao, type Papel, type Sessao } from './sessao';
import { LIMITES, type Cliente, type DadosCliente, type DadosOrcamento, type Orcamento } from './tipos';
import type { Situacao } from './valores';

export type Secao = 'antes' | 'depois';
// miniaturaUrl: versão de 360 px para a grade; nula nas fotos antigas, que mostram a inteira.
export type Foto = { id: string; ordemId: string; secao: Secao; url: string; criadaEm: string; miniaturaUrl?: string | null };
export type DadosOrdem = { id: string; cliente: string; responsaveis: string[]; observacoes: string; abertaEm: string };
export type Ordem = DadosOrdem & { fotos: Foto[] };
export type Conta = { id: string; login: string; nome: string; papel: Papel; ativo: boolean; trocarSenha: boolean };
export type { Cliente, DadosCliente, DadosOrcamento, ItemOrcamento, Orcamento } from './tipos';
export type Pdf = { url: string; nome: string };

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:5202';
const TEMPO_LIMITE_MS = 20_000;
// Gerar o PDF lê todas as fotos da OS no armazenamento: leva bem mais do que as outras chamadas.
const TEMPO_LIMITE_RELATORIO_MS = 3 * 60_000;

export class ErroApi extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SEM_CONEXAO = 'Sem conexão com o servidor. Confira a internet e tente de novo.';

const mensagemPadrao = (status: number) =>
  status === 403
    ? 'Sua conta não tem permissão para isso.'
    : status === 429
      ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
      : `O servidor respondeu com erro ${status}. Tente de novo.`;

export const mensagemDoErro = (erro: unknown) => (erro instanceof ErroApi ? erro.message : SEM_CONEXAO);

async function requisitar(caminho: string, init: RequestInit = {}, tempo = TEMPO_LIMITE_MS) {
  const token = sessao.get()?.token;
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}/api${caminho}`, {
      ...init,
      headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(tempo),
    });
  } catch {
    throw new ErroApi(0, SEM_CONEXAO);
  }
  if (resposta.status === 401 && token) sessao.sair('Sua sessão expirou. Entre de novo.');
  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null);
    throw new ErroApi(resposta.status, dados?.message ?? mensagemPadrao(resposta.status));
  }
  return resposta;
}

async function chamar<T = void>(caminho: string, metodo = 'GET', corpo?: unknown): Promise<T> {
  const resposta = await requisitar(caminho, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return (resposta.status === 204 ? undefined : await resposta.json()) as T;
}

const rotaFoto = (ordemId: string, fotoId: string) => `/ordens/${ordemId}/fotos/${fotoId}`;

async function baixarPdf(caminho: string, nomePadrao: string): Promise<Pdf> {
  const resposta = await requisitar(caminho, {}, TEMPO_LIMITE_RELATORIO_MS);
  const nome = /filename="?([^";]+)/.exec(resposta.headers.get('Content-Disposition') ?? '')?.[1] ?? nomePadrao;
  return { url: URL.createObjectURL(await resposta.blob()), nome };
}

export const api = {
  login: (usuario: string, senha: string) => chamar<Sessao>('/login', 'POST', { usuario, senha }),
  trocarSenha: (atual: string, nova: string) => chamar<Sessao>('/conta/senha', 'PUT', { atual, nova }),
  listarEquipe: () => chamar<string[]>('/equipe'),
  listarContas: () => chamar<Conta[]>('/usuarios'),
  criarConta: (conta: { login: string; nome: string; papel: Papel }) => chamar<Conta>('/usuarios', 'POST', conta),
  salvarConta: (id: string, conta: { nome: string; papel: Papel; ativo: boolean }) => chamar<Conta>(`/usuarios/${id}`, 'PUT', conta),
  redefinirSenha: (id: string) => chamar<Conta>(`/usuarios/${id}/senha`, 'PUT', {}),
  listarOrdens: () => chamar<Ordem[]>(`/ordens?limite=${LIMITES.ordens}`),
  buscarOrdens: (busca: string) => chamar<Ordem[]>(`/ordens?limite=${LIMITES.ordens}&busca=${encodeURIComponent(busca)}`),
  salvarOrdem: (ordem: DadosOrdem) => chamar(`/ordens/${ordem.id}`, 'PUT', ordem),
  excluirOrdem: (id: string) => chamar(`/ordens/${id}`, 'DELETE'),
  urlDeUpload: (ordemId: string, fotoId: string, contentType: string) =>
    chamar<{ uploadUrl: string }>(`${rotaFoto(ordemId, fotoId)}/upload-url`, 'POST', { contentType }),
  registrarFoto: (ordemId: string, fotoId: string, foto: { secao: Secao; contentType: string; criadaEm: string }) =>
    chamar(rotaFoto(ordemId, fotoId), 'PUT', foto),
  excluirFoto: (ordemId: string, fotoId: string) => chamar(rotaFoto(ordemId, fotoId), 'DELETE'),
  gerarRelatorio: (ordemId: string) => baixarPdf(`/ordens/${ordemId}/relatorio`, 'Relatorio-OS.pdf'),

  listarClientes: () => chamar<Cliente[]>('/clientes'),
  criarCliente: (cliente: DadosCliente) => chamar<Cliente>('/clientes', 'POST', cliente),
  salvarCliente: (id: string, cliente: DadosCliente) => chamar<Cliente>(`/clientes/${id}`, 'PUT', cliente),
  excluirCliente: (id: string) => chamar(`/clientes/${id}`, 'DELETE'),
  listarOrcamentos: () => chamar<Orcamento[]>(`/orcamentos?limite=${LIMITES.orcamentos}`),
  buscarOrcamentos: (busca: string) => chamar<Orcamento[]>(`/orcamentos?limite=${LIMITES.orcamentos}&busca=${encodeURIComponent(busca)}`),
  mudarSituacao: (id: string, situacao: Situacao) => chamar<Orcamento>(`/orcamentos/${id}/situacao`, 'PUT', { situacao }),
  criarOrcamento: (orcamento: DadosOrcamento) => chamar<Orcamento>('/orcamentos', 'POST', orcamento),
  salvarOrcamento: (id: string, orcamento: DadosOrcamento) => chamar<Orcamento>(`/orcamentos/${id}`, 'PUT', orcamento),
  excluirOrcamento: (id: string) => chamar(`/orcamentos/${id}`, 'DELETE'),
  gerarPdfOrcamento: (id: string) => baixarPdf(`/orcamentos/${id}/pdf`, 'Orcamento.pdf'),
};
