import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from './api';
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
// Fora disso, filtra o que já veio, sem gastar pedido.
export function useBuscaCompleta<T>(lista: keyof typeof LIMITES, carregados: T[], busca: string) {
  const termo = useAtrasado(busca.trim());
  const cheia = carregados.length >= LIMITES[lista];
  const ativa = cheia && termo.length >= 2;
  const remota = useQuery({
    queryKey: [lista, 'busca', termo],
    queryFn: () => (lista === 'ordens' ? api.buscarOrdens(termo) : api.buscarOrcamentos(termo)) as Promise<T[]>,
    enabled: ativa,
  });
  const doServidor = ativa && remota.data !== undefined;
  return { itens: doServidor ? remota.data! : carregados, cheia: cheia && !doServidor, buscando: ativa && remota.isFetching };
}
