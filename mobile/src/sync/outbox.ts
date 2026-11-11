import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { NovaOp, Op } from './regras';

const CHAVE = 'os.outbox.v1';

let ops: Op[] = [];
let gravacao: Promise<unknown> = Promise.resolve();
const ouvintes = new Set<() => void>();

function gravar() {
  ouvintes.forEach((ouvinte) => ouvinte());
  const json = JSON.stringify(ops);
  // Em cadeia para uma gravação antiga nunca sobrescrever uma mais nova.
  const atual = gravacao.then(() => AsyncStorage.setItem(CHAVE, json));
  gravacao = atual.catch(() => undefined);
  return atual;
}

export const outbox = {
  snapshot: () => ops,

  subscribe(ouvinte: () => void) {
    ouvintes.add(ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
    };
  },

  async carregar() {
    const salvo = await AsyncStorage.getItem(CHAVE);
    if (salvo) ops = JSON.parse(salvo);
  },

  // Só resolve depois de gravado em disco: se o app morrer em seguida, a operação não se perde.
  adicionar(op: NovaOp) {
    ops = [...ops, { ...op, estado: 'pendente' } as Op];
    return gravar();
  },

  marcar(id: string, mudancas: Partial<Pick<Op, 'estado' | 'erro'>>) {
    ops = ops.map((op) => (op.id === id ? { ...op, ...mudancas } : op));
    return gravar();
  },

  remover(ids: string[]) {
    ops = ops.filter((op) => !ids.includes(op.id));
    return gravar();
  },
};

export const useOutbox = () => useSyncExternalStore(outbox.subscribe, outbox.snapshot);
