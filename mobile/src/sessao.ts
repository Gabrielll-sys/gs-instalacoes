import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export type Papel = 'gestor' | 'tecnico';
export type Sessao = { token: string; nome: string; papel: Papel; trocarSenha: boolean };

const CHAVE = 'os.sessao';

// SecureStore não existe no web, que só serve de preview em desenvolvimento.
const cofre =
  Platform.OS === 'web'
    ? AsyncStorage
    : { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync };

let atual: Sessao | null = null;
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

  async carregar() {
    const salva = await cofre.getItem(CHAVE);
    atual = salva ? JSON.parse(salva) : null;
  },

  async definir(nova: Sessao) {
    await cofre.setItem(CHAVE, JSON.stringify(nova));
    atual = nova;
    aviso = null;
    avisar();
  },

  async sair(mensagem?: string) {
    await cofre.removeItem(CHAVE);
    atual = null;
    aviso = mensagem ?? null;
    avisar();
  },
};

export const useSessao = () => useSyncExternalStore(sessao.subscribe, sessao.get);
