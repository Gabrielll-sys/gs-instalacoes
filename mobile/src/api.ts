import { sessao, type Papel, type Sessao } from './sessao';
import { ErroApi, type DadosOrdem, type Ordem, type Secao } from './sync/regras';

export type Conta = { id: string; login: string; nome: string; papel: Papel; ativo: boolean; trocarSenha: boolean };
export type DadosCliente = { nome: string; telefone: string; email: string; documento: string; endereco: string };
export type Cliente = DadosCliente & { id: string };
export type ItemOrcamento = { descricao: string; quantidade: number; unidade: string; precoUnitario: number; total: number };
export type DadosOrcamento = {
  clienteId: string;
  itens: Omit<ItemOrcamento, 'total'>[];
  pagamento: string;
  prazo: string;
  observacoes: string;
};
export type Orcamento = Omit<DadosOrcamento, 'itens'> & {
  id: string;
  numero: number;
  clienteNome: string;
  criadoEm: string;
  itens: ItemOrcamento[];
  total: number;
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5202';
const TEMPO_LIMITE_MS = 20_000;

async function chamar<T = void>(caminho: string, metodo = 'GET', corpo?: unknown): Promise<T> {
  const token = sessao.get()?.token;
  // Sem limite, uma conexão travada prenderia a fila inteira para sempre.
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(`${API_URL}/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });

    if (resposta.status === 401 && token) {
      void sessao.sair('Sua sessão expirou. Entre de novo: o que está na fila continua guardado.');
    }
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      throw new ErroApi(resposta.status, dados?.message ?? `O servidor respondeu com erro ${resposta.status}.`);
    }
    return (resposta.status === 204 ? undefined : await resposta.json()) as T;
  } finally {
    clearTimeout(limite);
  }
}

const rotaFoto = (ordemId: string, fotoId: string) => `/ordens/${ordemId}/fotos/${fotoId}`;

// Para ações que só fazem sentido com internet; a fila offline tem o próprio tratamento.
export const mensagemDoErro = (erro: unknown) =>
  erro instanceof ErroApi ? erro.message : 'Sem conexão com o servidor. Confira a internet e tente de novo.';

export const api = {
  login: (usuario: string, senha: string) => chamar<Sessao>('/login', 'POST', { usuario, senha }),
  trocarSenha: (atual: string, nova: string) => chamar<Sessao>('/conta/senha', 'PUT', { atual, nova }),
  listarEquipe: () => chamar<string[]>('/equipe'),
  listarContas: () => chamar<Conta[]>('/usuarios'),
  criarConta: (conta: { login: string; nome: string; papel: Papel }) => chamar<Conta>('/usuarios', 'POST', conta),
  salvarConta: (id: string, conta: { nome: string; papel: Papel; ativo: boolean }) => chamar<Conta>(`/usuarios/${id}`, 'PUT', conta),
  redefinirSenha: (id: string) => chamar<Conta>(`/usuarios/${id}/senha`, 'PUT', {}),
  listarOrdens: () => chamar<Ordem[]>('/ordens'),
  salvarOrdem: (ordem: DadosOrdem) => chamar(`/ordens/${ordem.id}`, 'PUT', ordem),
  excluirOrdem: (id: string) => chamar(`/ordens/${id}`, 'DELETE'),
  urlDeUpload: (ordemId: string, fotoId: string, contentType: string) =>
    chamar<{ uploadUrl: string }>(`${rotaFoto(ordemId, fotoId)}/upload-url`, 'POST', { contentType }),
  registrarFoto: (
    ordemId: string,
    fotoId: string,
    foto: { secao: Secao; contentType: string; criadaEm: string },
  ) => chamar(rotaFoto(ordemId, fotoId), 'PUT', foto),
  excluirFoto: (ordemId: string, fotoId: string) => chamar(rotaFoto(ordemId, fotoId), 'DELETE'),
  listarClientes: () => chamar<Cliente[]>('/clientes'),
  criarCliente: (cliente: DadosCliente) => chamar<Cliente>('/clientes', 'POST', cliente),
  salvarCliente: (id: string, cliente: DadosCliente) => chamar<Cliente>(`/clientes/${id}`, 'PUT', cliente),
  excluirCliente: (id: string) => chamar(`/clientes/${id}`, 'DELETE'),
  listarOrcamentos: () => chamar<Orcamento[]>('/orcamentos'),
  criarOrcamento: (orcamento: DadosOrcamento) => chamar<Orcamento>('/orcamentos', 'POST', orcamento),
  salvarOrcamento: (id: string, orcamento: DadosOrcamento) => chamar<Orcamento>(`/orcamentos/${id}`, 'PUT', orcamento),
  excluirOrcamento: (id: string) => chamar(`/orcamentos/${id}`, 'DELETE'),
};
