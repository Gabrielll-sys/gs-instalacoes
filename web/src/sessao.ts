import { useSyncExternalStore } from 'react';

export type Papel = 'gestor' | 'tecnico';
export type Sessao = { token: string; nome: string; papel: Papel; trocarSenha: boolean };

const CHAVE = 'gs.sessao';

function ler(): Sessao | null {
  try {
    const salva = localStorage.getItem(CHAVE);
    return salva ? JSON.parse(salva) : null;
  } catch {
    return null;
  }
}

let atual = ler();
let aviso: string | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

export const sessao = {
  get: () => atual,
  aviso: () => aviso,

  subscribe(ouvinte: () => void) {
    ouvintes.add(ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
    };
  },

  definir(nova: Sessao) {
    localStorage.setItem(CHAVE, JSON.stringify(nova));
    atual = nova;
    aviso = null;
    avisar();
  },

  sair(mensagem?: string) {
    localStorage.removeItem(CHAVE);
    atual = null;
    aviso = mensagem ?? null;
    avisar();
  },
};

export const useSessao = () => useSyncExternalStore(sessao.subscribe, sessao.get);
