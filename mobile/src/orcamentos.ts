import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { queryClient } from './sync/motor';

const CHAVE_CLIENTES = ['clientes'];
const CHAVE_ORCAMENTOS = ['orcamentos'];

// Só online: endereço e telefone de cliente não ficam gravados no aparelho (o _layout pula o que tem soOnline).
export const useClientes = (ativo = true) =>
  useQuery({ queryKey: CHAVE_CLIENTES, queryFn: api.listarClientes, meta: { soOnline: true }, enabled: ativo });
export const useOrcamentos = () => useQuery({ queryKey: CHAVE_ORCAMENTOS, queryFn: api.listarOrcamentos, meta: { soOnline: true } });

// O nome do cliente aparece em cada orçamento: mudar o cadastro atualiza as duas listas.
export const recarregarClientes = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_CLIENTES }),
    queryClient.invalidateQueries({ queryKey: CHAVE_ORCAMENTOS }),
  ]);
export const recarregarOrcamentos = () => queryClient.invalidateQueries({ queryKey: CHAVE_ORCAMENTOS });

// Cliente cadastrado de dentro do formulário de orçamento: ao voltar, ele já vem escolhido.
let clienteCriado: string | null = null;
export const lembrarClienteCriado = (id: string) => {
  clienteCriado = id;
};
export const usarClienteCriado = () => {
  const id = clienteCriado;
  clienteCriado = null;
  return id;
};
