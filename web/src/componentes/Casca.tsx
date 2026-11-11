import { mdiAccountGroupOutline, mdiCardAccountDetailsOutline, mdiClipboardTextOutline, mdiCalculatorVariantOutline, mdiLockOutline, mdiLogout } from '@mdi/js';
import { Link, NavLink, Outlet, useMatch } from 'react-router';
import carro from '../assets/logo-gs-carro.png';
import nome from '../assets/logo-gs-nome.png';
import { sessao, useSessao } from '../sessao';
import { Icone } from './Icone';

const PAPEIS = { gestor: 'Gestor', tecnico: 'Técnico' };

export function Casca() {
  const conta = useSessao();
  const naLista = useMatch('/');
  const numaOrdem = useMatch('/ordens/*');
  const emOrdens = !!naLista || !!numaOrdem;
  if (!conta) return null;

  return (
    <div className="casca">
      <aside className="trilho">
        <Link to="/" className="trilho-marca" aria-label="GS Instalações, início">
          <img src={carro} alt="" className="trilho-carro" />
          <img src={nome} alt="" className="trilho-nome" />
        </Link>
        <nav aria-label="Principal" className="trilho-nav">
          <Link to="/" className="trilho-item" aria-current={emOrdens ? 'page' : undefined} aria-label="Ordens de serviço">
            <Icone caminho={mdiClipboardTextOutline} />
            <span>
              Ordens<span className="so-largo"> de serviço</span>
            </span>
          </Link>
          {conta.papel === 'gestor' && (
            <>
              <NavLink to="/orcamentos" className="trilho-item" aria-label="Orçamentos" title="Orçamentos">
                <Icone caminho={mdiCalculatorVariantOutline} />
                <span>Orçamentos</span>
              </NavLink>
              <NavLink to="/clientes" className="trilho-item" aria-label="Clientes" title="Clientes">
                <Icone caminho={mdiCardAccountDetailsOutline} />
                <span>Clientes</span>
              </NavLink>
              <NavLink to="/equipe" className="trilho-item" aria-label="Equipe" title="Equipe">
                <Icone caminho={mdiAccountGroupOutline} />
                <span>Equipe</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="trilho-conta">
          <div className="trilho-quem">
            <strong>{conta.nome}</strong>
            <span>{PAPEIS[conta.papel]}</span>
          </div>
          {/* Em tela estreita só o ícone aparece; o nome acessível vem do aria-label. */}
          <Link to="/trocar-senha" className="trilho-item pequeno" aria-label="Trocar senha" title="Trocar senha">
            <Icone caminho={mdiLockOutline} tamanho={20} />
            <span>Trocar senha</span>
          </Link>
          <button type="button" className="trilho-item pequeno" onClick={() => sessao.sair()} aria-label="Sair" title="Sair">
            <Icone caminho={mdiLogout} tamanho={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      <main className="trabalho">
        <Outlet />
      </main>
    </div>
  );
}
