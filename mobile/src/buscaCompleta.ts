import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { arquivoFoto } from './sync/motor';
import { useOutbox } from './sync/outbox';
import { aplicarOutbox, type Ordem } from './sync/regras';
import { LIMITES } from './tipos';

// Espera a pessoa parar de digitar antes de perguntar à API.
function useAtrasado<T>(valor: T, ms = 400) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const espera = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(espera);
  }, [valor, ms]);
  return atrasado;
}

// Com a lista cheia (pode haver mais no servidor) e 2 letras ou mais, a busca vai à API, que procura em tudo.
// Fora disso, ou sem internet, filtra o que já está no aparelho. Só online: o resultado não fica gravado.
export function useBuscaCompleta<T>(lista: keyof typeof LIMITES, carregados: T[], busca: string) {
  const termo = useAtrasado(busca.trim());
  const cheia = carregados.length >= LIMITES[lista];
  const ativa = cheia && termo.length >= 2;
  const remota = useQuery({
    queryKey: [lista, 'busca', termo],
    queryFn: () => (lista === 'ordens' ? api.buscarOrdens(termo) : api.buscarOrcamentos(termo)) as Promise<T[]>,
    enabled: ativa,
    meta: { soOnline: true },
  });
  // OS que vêm do servidor ganham por cima o que ainda está na fila deste aparelho, como na lista normal.
  const ops = useOutbox();
  const doServidor = useMemo(
    () =>
      remota.data && lista === 'ordens'
        ? (aplicarOutbox(remota.data as Ordem[], ops, (arquivo) => arquivoFoto(arquivo).uri) as T[])
        : remota.data,
    [remota.data, lista, ops],
  );
  const usar = ativa && doServidor !== undefined;
  return { itens: usar ? doServidor! : carregados, cheia: cheia && !usar, buscando: ativa && remota.isFetching };
}
