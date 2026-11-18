import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { queryClient } from './sync/motor';
import { LIMITES, PASSO_DA_LISTA } from './tipos';

const CHAVE_CLIENTES = ['clientes'];
const CHAVE_ORCAMENTOS = ['orcamentos'];
const CHAVE_LEMBRETES = ['lembretes'];

// Só online: endereço e telefone de cliente não ficam gravados no aparelho (o _layout pula o que tem soOnline).
export const useClientes = (ativo = true) =>
  useQuery({ queryKey: CHAVE_CLIENTES, queryFn: api.listarClientes, meta: { soOnline: true }, enabled: ativo });
export const useOrcamentos = () => useQuery({ queryKey: CHAVE_ORCAMENTOS, queryFn: api.listarOrcamentos, meta: { soOnline: true } });
export const useLembretes = (ativo: boolean) =>
  useQuery({ queryKey: CHAVE_LEMBRETES, queryFn: api.listarLembretes, meta: { soOnline: true }, enabled: ativo });

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
