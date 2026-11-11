// Mesmas regras do app (mobile/src/sync/regras.ts). A versão web é só online e não tem fila.
import type { Ordem, Secao } from './api';

export type Filtro = 'todas' | 'andamento' | 'concluidas';


// Mesmo limite que o servidor confere ao registrar a foto.
export const LIMITE_FOTO_BYTES = 4 * 1024 * 1024;

// WebP a 0,85 fica visualmente igual ao original. Só reduz foto acima de 16 MP; os passos seguintes
// só entram se a foto ainda passar de 4 MB.
export const PASSOS_COMPRESSAO = [
  { lado: 4096, qualidade: 0.85 },
  { lado: 4096, qualidade: 0.75 },
  { lado: 3072, qualidade: 0.75 },
  { lado: 2048, qualidade: 0.7 },
];

export const contarFotos = (ordem: Ordem, secao: Secao) => ordem.fotos.filter((f) => f.secao === secao).length;
// Concluída exige a prova inteira: sem o antes, a OS ainda tem o que corrigir.
export const estaConcluida = (ordem: Ordem) => contarFotos(ordem, 'antes') > 0 && contarFotos(ordem, 'depois') > 0;

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function filtrarOrdens(ordens: Ordem[], busca: string, filtro: Filtro) {
  const termo = normalizar(busca);
  return ordens.filter((o) => {
    if (filtro === 'andamento' && estaConcluida(o)) return false;
    if (filtro === 'concluidas' && !estaConcluida(o)) return false;
    return !termo || normalizar([o.cliente, ...o.responsaveis].join(' ')).includes(termo);
  });
}

export function formatarData(iso: string) {
  const data = new Date(iso);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data.toLocaleDateString('pt-BR')} às ${hora}`;
}

export function formatarCarimbo(iso: string) {
  const data = new Date(iso);
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} ${hora}`;
}
