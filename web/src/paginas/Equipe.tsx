import { mdiPlus } from '@mdi/js';
import { Link, Outlet, useParams } from 'react-router';
import { EstadoVazio } from '../componentes/Estado';
import { Icone } from '../componentes/Icone';
import { useContas } from '../consultas';

const PAPEIS = { gestor: 'Gestor', tecnico: 'Técnico' };

export function Equipe() {
  const { data: contas, isLoading, isError, refetch } = useContas();
  const { id } = useParams();
  const semTecnico = !!contas?.length && !contas.some((c) => c.papel === 'tecnico');

  return (
    <>
      <header className="topo-trabalho">
        <h1>Equipe</h1>
        <Link to="/equipe/nova" className="botao botao-ouro">
          <Icone caminho={mdiPlus} />
          Nova conta
        </Link>
      </header>

      {isLoading ? (
        <p className="suave carregando">Carregando…</p>
      ) : isError ? (
        <EstadoVazio titulo="Não foi possível carregar a equipe" texto="Confira a conexão e tente de novo.">
          <button type="button" className="botao botao-contorno" onClick={() => void refetch()}>
            Tentar de novo
          </button>
        </EstadoVazio>
      ) : (
        <ul className="lista">
          {contas?.map((conta) => {
            const situacao = !conta.ativo ? 'Desativada' : conta.trocarSenha ? 'Ainda usa a senha padrão' : '';
            return (
              <li key={conta.id}>
                <Link to={`/equipe/${conta.id}`} className={`linha${conta.id === id ? ' selecionada' : ''}`}>
                  <div className="info">
                    <strong className={conta.ativo ? undefined : 'suave'}>{conta.nome}</strong>
                    <span>
                      {PAPEIS[conta.papel]}, usuário {conta.login}
                    </span>
                    {situacao && <span className={conta.ativo ? 'atencao-texto' : undefined}>{situacao}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {semTecnico && (
        <p className="dica-lista">
          Nenhum técnico cadastrado ainda. Use Nova conta para cadastrar quem vai a campo; são eles que aparecem como responsáveis na OS.
        </p>
      )}

      <Outlet />
    </>
  );
}
