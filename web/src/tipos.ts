// Formato de clientes e orçamentos na API. Igual no app e no site: o teste de paridade confere.
import type { Situacao } from './valores';

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
  situacao: Situacao;
};

// Quantos itens as listas pedem à API; "Mostrar mais" aumenta. A busca olha só o que já veio.
export const LIMITES = { ordens: 200, orcamentos: 200 };
export const PASSO_DA_LISTA = 200;
