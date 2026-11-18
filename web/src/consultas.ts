import { QueryClient, useQuery } from '@tanstack/react-query';
import { api, ErroApi } from './api';
import { LIMITES, PASSO_DA_LISTA } from './tipos';
import { sessao } from './sessao';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Erro 4xx repetiria igual: só vale tentar de novo quando foi rede ou servidor.
      retry: (tentativas, erro) => tentativas < 1 && !(erro instanceof ErroApi && erro.status >= 400 && erro.status < 500),
    },
  },
});

// Quem sai leva junto o que estava em memória: a próxima pessoa no mesmo navegador não vê dados da anterior.
sessao.subscribe(() => {
  if (!sessao.get()) queryClient.clear();
});

const CHAVE_ORDENS = ['ordens'];
const CHAVE_EQUIPE = ['equipe'];
const CHAVE_CONTAS = ['contas'];
const CHAVE_CLIENTES = ['clientes'];
const CHAVE_ORCAMENTOS = ['orcamentos'];
const CHAVE_LEMBRETES = ['lembretes'];

export const useOrdens = () => useQuery({ queryKey: CHAVE_ORDENS, queryFn: api.listarOrdens });
export const useEquipe = () => useQuery({ queryKey: CHAVE_EQUIPE, queryFn: api.listarEquipe });
export const useContas = () => useQuery({ queryKey: CHAVE_CONTAS, queryFn: api.listarContas });
export const useClientes = (ativo = true) => useQuery({ queryKey: CHAVE_CLIENTES, queryFn: api.listarClientes, enabled: ativo });
export const useOrcamentos = () => useQuery({ queryKey: CHAVE_ORCAMENTOS, queryFn: api.listarOrcamentos });
export const useLembretes = (ativo: boolean) => useQuery({ queryKey: CHAVE_LEMBRETES, queryFn: api.listarLembretes, enabled: ativo });

export const recarregarOrdens = () => queryClient.invalidateQueries({ queryKey: CHAVE_ORDENS });
export const recarregarEquipe = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_CONTAS }),
    queryClient.invalidateQueries({ queryKey: CHAVE_EQUIPE }),
  ]);

// O nome do cliente aparece em cada orçamento: mudar o cadastro atualiza as duas listas.
export const recarregarClientes = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_CLIENTES }),
    queryClient.invalidateQueries({ queryKey: CHAVE_ORCAMENTOS }),
  ]);
export const recarregarOrcamentos = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_ORCAMENTOS }),
    queryClient.invalidateQueries({ queryKey: CHAVE_LEMBRETES }),
  ]);
export const recarregarLembretes = () => queryClient.invalidateQueries({ queryKey: CHAVE_LEMBRETES });

// Pede mais itens da lista à API; a busca e os filtros passam a valer sobre o que veio.
export const mostrarMais = (lista: keyof typeof LIMITES) => {
  LIMITES[lista] += PASSO_DA_LISTA;
  return queryClient.invalidateQueries({ queryKey: [lista] });
};
