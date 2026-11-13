import { mdiMagnify, mdiPlus } from '@mdi/js';
import { useMemo, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { EstadoVazio, ListaEsqueleto, MostrarMais } from '../componentes/Estado';
import { Icone } from '../componentes/Icone';
import { Placa } from '../componentes/Placa';
import { useBuscaCompleta } from '../buscaCompleta';
import { mostrarMais, useOrdens } from '../consultas';
import { contarFotos, filtrarOrdens, formatarData, type Filtro } from '../regras';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'andamento', rotulo: 'Abertas' },
  { valor: 'concluidas', rotulo: 'Concluídas' },
];

export function ListaOrdens() {
  const { data: carregadas = [], isLoading, isError, isFetching, refetch } = useOrdens();
  const { id } = useParams();
  const [busca, setBusca] = useState('');
  const { itens: ordens, cheia, buscando } = useBuscaCompleta('ordens', carregadas, busca);
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const visiveis = useMemo(() => filtrarOrdens(ordens, busca, filtro), [ordens, busca, filtro]);
  // O panorama que o dono quer ver sem abrir nenhuma OS; segue a busca para os números baterem com a lista.
  const contagens = useMemo(
    () => Object.fromEntries(FILTROS.map(({ valor }) => [valor, filtrarOrdens(ordens, busca, valor).length])) as Record<Filtro, number>,
    [ordens, busca],
  );
  const mais = cheia ? '+' : '';

  return (
    <>
      <header className="topo-trabalho">
        <h1>Ordens de serviço</h1>
        <label className="busca">
          <Icone caminho={mdiMagnify} />
          <span className="so-leitor">Buscar cliente ou responsável</span>
          <input type="search" placeholder="Buscar cliente ou responsável" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <Link to="/ordens/nova" className="botao botao-ouro">
          <Icone caminho={mdiPlus} />
          Nova OS
        </Link>
      </header>

      <div className="filtros" role="group" aria-label="Filtrar ordens de serviço">
        {FILTROS.map(({ valor, rotulo }) => (
          <button key={valor} type="button" className={`chip${filtro === valor ? ' ativo' : ''}`} aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>
            {rotulo} <span className="numero">{contagens[valor]}{mais}</span>
          </button>
        ))}
      </div>

      {buscando && <p className="dica-lista" aria-live="polite">Buscando em todas as OS…</p>}
      {isLoading ? (
        <ListaEsqueleto rotulo="Carregando ordens de serviço" placa />
      ) : isError && ordens.length === 0 ? (
        <EstadoVazio titulo="Não foi possível carregar as OS" texto="Confira a conexão e tente de novo.">
          <button type="button" className="botao botao-contorno" onClick={() => void refetch()}>
            Tentar de novo
          </button>
        </EstadoVazio>
      ) : visiveis.length === 0 ? (
        ordens.length > 0 ? (
          <EstadoVazio titulo="Nenhuma OS encontrada" texto="Tente outro nome ou mude o filtro." />
        ) : (
          <EstadoVazio titulo="Nenhuma OS aberta ainda" texto="Toque em Nova OS para abrir a primeira." />
        )
      ) : (
        <ul className="lista">
          {visiveis.map((ordem) => (
            <li key={ordem.id}>
              <Link to={`/ordens/${ordem.id}`} className={`linha${ordem.id === id ? ' selecionada' : ''}`} aria-current={ordem.id === id ? 'true' : undefined}>
                <div className="info">
                  <strong>{ordem.cliente}</strong>
                  <span>
                    {formatarData(ordem.abertaEm)}, {ordem.responsaveis.join(', ')}
                  </span>
                </div>
                <Placa
                  linhas={[
                    { rotulo: 'ANTES', total: contarFotos(ordem, 'antes') },
                    { rotulo: 'DEPOIS', total: contarFotos(ordem, 'depois') },
                  ]}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && <MostrarMais cheia={cheia} carregando={isFetching} aoPedir={() => void mostrarMais('ordens')} />}

      <Outlet />
    </>
  );
}
