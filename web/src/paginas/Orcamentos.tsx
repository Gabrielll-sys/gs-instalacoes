import { mdiMagnify, mdiPlus } from '@mdi/js';
import { useMemo, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { EstadoVazio } from '../componentes/Estado';
import { Icone } from '../componentes/Icone';
import { useOrcamentos } from '../consultas';
import { filtrarOrcamentos, formatarDia, formatarMoeda, numeroDoOrcamento } from '../valores';

export function Orcamentos() {
  const { data: orcamentos = [], isLoading, isError, refetch } = useOrcamentos();
  const { id } = useParams();
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(() => filtrarOrcamentos(orcamentos, busca), [orcamentos, busca]);

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

      {isLoading ? (
        <p className="suave carregando">Carregando…</p>
      ) : isError ? (
        <EstadoVazio titulo="Não foi possível carregar os orçamentos" texto="Confira a conexão e tente de novo.">
          <button type="button" className="botao botao-contorno" onClick={() => void refetch()}>
            Tentar de novo
          </button>
        </EstadoVazio>
      ) : visiveis.length === 0 ? (
        busca ? (
          <EstadoVazio titulo="Nenhum orçamento encontrado" texto="Busque pelo nome do cliente ou pelo número." />
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
                <span className="valor-linha">{formatarMoeda(orcamento.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Outlet />
    </>
  );
}
