import { mdiMagnify, mdiPlus } from '@mdi/js';
import { useState } from 'react';
import { mensagemDoErro } from '../api';
import { useClientes } from '../consultas';
import { buscarClientes } from '../valores';
import { Erro } from './Estado';
import { Icone } from './Icone';

const OPCOES_VISIVEIS = 6;

export function SeletorCliente({ onEscolher, onCadastrar }: { onEscolher: (id: string) => void; onCadastrar: () => void }) {
  const clientes = useClientes();
  const [busca, setBusca] = useState('');

  if (clientes.isLoading) return <p className="suave">Carregando clientes…</p>;
  if (clientes.isError)
    return (
      <div className="aviso-campo">
        <Erro>{mensagemDoErro(clientes.error)}</Erro>
        <button type="button" className="botao botao-contorno" onClick={() => void clientes.refetch()}>
          Tentar de novo
        </button>
      </div>
    );

  const todos = clientes.data ?? [];
  const encontrados = buscarClientes(todos, busca);
  const dica =
    todos.length === 0
      ? 'Nenhum cliente cadastrado ainda.'
      : encontrados.length === 0
        ? 'Nenhum cliente com essa busca.'
        : encontrados.length > OPCOES_VISIVEIS
          ? `Mais ${encontrados.length - OPCOES_VISIVEIS} na lista: refine a busca.`
          : '';

  return (
    <div className="seletor-cliente">
      {todos.length > 0 && (
        <label className="busca busca-larga">
          <Icone caminho={mdiMagnify} />
          <span className="so-leitor">Buscar cliente</span>
          <input type="search" placeholder="Buscar nome, telefone ou endereço" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      )}
      {encontrados.length > 0 && (
        <ul className="opcoes">
          {encontrados.slice(0, OPCOES_VISIVEIS).map((cliente) => (
            <li key={cliente.id}>
              <button type="button" className="opcao" onClick={() => onEscolher(cliente.id)} aria-label={`Escolher ${cliente.nome}`}>
                <strong>{cliente.nome}</strong>
                {cliente.telefone && <span>{cliente.telefone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {dica && <p className="suave">{dica}</p>}
      <button type="button" className="botao botao-texto alinha-inicio" onClick={onCadastrar}>
        <Icone caminho={mdiPlus} />
        Cadastrar cliente
      </button>
    </div>
  );
}
