import { mdiMagnify, mdiPlus } from '@mdi/js';
import { useMemo, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { EstadoVazio } from '../componentes/Estado';
import { Icone } from '../componentes/Icone';
import { useClientes } from '../consultas';
import { buscarClientes } from '../valores';

export function Clientes() {
  const { data: clientes = [], isLoading, isError, refetch } = useClientes();
  const { id } = useParams();
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(() => buscarClientes(clientes, busca), [clientes, busca]);

  return (
    <>
      <header className="topo-trabalho">
        <h1>Clientes</h1>
        <label className="busca">
          <Icone caminho={mdiMagnify} />
          <span className="so-leitor">Buscar cliente</span>
          <input type="search" placeholder="Buscar nome, telefone ou endereço" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <Link to="/clientes/novo" className="botao botao-ouro">
          <Icone caminho={mdiPlus} />
          Novo cliente
        </Link>
      </header>

      {isLoading ? (
        <p className="suave carregando">Carregando…</p>
      ) : isError ? (
        <EstadoVazio titulo="Não foi possível carregar os clientes" texto="Confira a conexão e tente de novo.">
          <button type="button" className="botao botao-contorno" onClick={() => void refetch()}>
            Tentar de novo
          </button>
        </EstadoVazio>
      ) : visiveis.length === 0 ? (
        busca ? (
          <EstadoVazio titulo="Nenhum cliente encontrado" texto="Confira a busca ou cadastre o cliente." />
        ) : (
          <EstadoVazio titulo="Nenhum cliente cadastrado" texto="Use Novo cliente para cadastrar nome, telefone e endereço." />
        )
      ) : (
        <ul className="lista">
          {visiveis.map((cliente) => {
            const detalhe = [cliente.telefone, cliente.endereco].filter(Boolean).join(' – ');
            return (
              <li key={cliente.id}>
                <Link to={`/clientes/${cliente.id}`} className={`linha${cliente.id === id ? ' selecionada' : ''}`}>
                  <div className="info">
                    <strong>{cliente.nome}</strong>
                    {detalhe && <span>{detalhe}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Outlet />
    </>
  );
}
