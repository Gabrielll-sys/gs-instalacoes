import { mdiMagnify, mdiPlus } from '@mdi/js';
import { useMemo, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { EstadoVazio, ListaEsqueleto, MostrarMais } from '../componentes/Estado';
import { Icone } from '../componentes/Icone';
import { useBuscaCompleta } from '../buscaCompleta';
import { mostrarMais, useOrcamentos } from '../consultas';
import { filtrarOrcamentos, formatarDia, formatarMoeda, numeroDoOrcamento, rotuloDaSituacao, SITUACOES, type Situacao } from '../valores';

export function Orcamentos() {
  const { data: carregados = [], isLoading, isError, isFetching, refetch } = useOrcamentos();
  const { id } = useParams();
  const [busca, setBusca] = useState('');
  const { itens: orcamentos, cheia, buscando } = useBuscaCompleta('orcamentos', carregados, busca);
  const [situacao, setSituacao] = useState<Situacao | 'todas'>('todas');
  const visiveis = useMemo(() => filtrarOrcamentos(orcamentos, busca, situacao), [orcamentos, busca, situacao]);
  // Contagens seguem a busca, como nas OS, para baterem com a lista.
  const contagem = (valor: Situacao | 'todas') => `${filtrarOrcamentos(orcamentos, busca, valor).length}${cheia ? '+' : ''}`;

  return (
    <>
      <header className="topo-trabalho">
        <h1>Orçamentos</h1>
        <label className="busca">
          <Icone caminho={mdiMagnify} />
          <span className="so-leitor">Buscar orçamento</span>
          <input type="search" placeholder="Buscar cliente ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <Link to="/orcamentos/novo" className="botao botao-ouro">
          <Icone caminho={mdiPlus} />
          Novo orçamento
        </Link>
      </header>

      <div className="filtros" role="group" aria-label="Filtrar por situação">
        {[{ valor: 'todas' as const, rotulo: 'Todos' }, ...SITUACOES].map(({ valor, rotulo }) => (
          <button key={valor} type="button" className={`chip${situacao === valor ? ' ativo' : ''}`} aria-pressed={situacao === valor} onClick={() => setSituacao(valor)}>
            {rotulo} <span className="numero">{contagem(valor)}</span>
          </button>
        ))}
      </div>

      {buscando && <p className="dica-lista" aria-live="polite">Buscando em todos os orçamentos…</p>}
      {isLoading ? (
        <ListaEsqueleto rotulo="Carregando orçamentos" />
      ) : isError ? (
        <EstadoVazio titulo="Não foi possível carregar os orçamentos" texto="Confira a conexão e tente de novo.">
          <button type="button" className="botao botao-contorno" onClick={() => void refetch()}>
            Tentar de novo
          </button>
        </EstadoVazio>
      ) : visiveis.length === 0 ? (
        busca || situacao !== 'todas' ? (
          <EstadoVazio titulo="Nenhum orçamento encontrado" texto="Busque pelo nome do cliente ou pelo número, ou mude o filtro." />
        ) : (
          <EstadoVazio titulo="Nenhum orçamento ainda" texto="Use Novo orçamento para montar o primeiro." />
        )
      ) : (
        <ul className="lista">
          {visiveis.map((orcamento) => (
            <li key={orcamento.id}>
              <Link to={`/orcamentos/${orcamento.id}`} className={`linha${orcamento.id === id ? ' selecionada' : ''}`}>
                <div className="info">
                  <strong>{orcamento.clienteNome}</strong>
                  <span className="numero">
                    Nº {numeroDoOrcamento(orcamento.numero)} – {formatarDia(orcamento.criadoEm)}
                  </span>
                </div>
                <div className="valor-e-situacao">
                  <span className="valor-linha">{formatarMoeda(orcamento.total)}</span>
                  <span className={`situacao situacao-${orcamento.situacao}`}>{rotuloDaSituacao(orcamento.situacao)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && <MostrarMais cheia={cheia} carregando={isFetching} aoPedir={() => void mostrarMais('orcamentos')} />}

      <Outlet />
    </>
  );
}
