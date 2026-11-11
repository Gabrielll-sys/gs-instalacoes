import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { queryClient } from './sync/motor';

// A mesma de Usuario.SenhaPadrao no servidor: só aparece na tela para o gestor avisar a pessoa.
export const SENHA_PADRAO = '1234';

const CHAVE_EQUIPE = ['equipe'];
const CHAVE_CONTAS = ['contas'];

// Fica guardada no aparelho junto com as OS: o seletor de responsáveis precisa funcionar sem internet.
export const useEquipe = () => useQuery({ queryKey: CHAVE_EQUIPE, queryFn: api.listarEquipe });

// Só existe com a tela aberta: usuários de login não precisam ficar guardados no aparelho.
export const useContas = () => useQuery({ queryKey: CHAVE_CONTAS, queryFn: api.listarContas, gcTime: 0 });

export const recarregarEquipe = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_CONTAS }),
    queryClient.invalidateQueries({ queryKey: CHAVE_EQUIPE }),
  ]);
