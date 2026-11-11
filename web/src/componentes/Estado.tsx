import type { ReactNode } from 'react';

export function EstadoVazio({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="estado-vazio">
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {children}
    </div>
  );
}

export function Erro({ children }: { children: ReactNode }) {
  return (
    <p className="erro" role="alert">
      {children}
    </p>
  );
}

// Linhas cinzas no formato da lista enquanto ela carrega; com placa só na lista de OS.
export function ListaEsqueleto({ rotulo, placa = false }: { rotulo: string; placa?: boolean }) {
  return (
    <ul className="lista" aria-busy="true" aria-label={rotulo}>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="linha esqueleto">
          <div className="info">
            <span className="barra-esqueleto" style={{ width: '40%', height: 18 }} />
            <span className="barra-esqueleto" style={{ width: '28%' }} />
          </div>
          {placa && <span className="placa-esqueleto" />}
        </li>
      ))}
    </ul>
  );
}

// Aparece quando a lista veio cheia: pode haver mais no servidor.
export function MostrarMais({ cheia, carregando, aoPedir }: { cheia: boolean; carregando: boolean; aoPedir: () => void }) {
  if (!cheia) return null;
  return (
    <div className="mostrar-mais">
      <button type="button" className="botao botao-contorno" disabled={carregando} onClick={aoPedir}>
        {carregando ? 'Carregando…' : 'Mostrar mais'}
      </button>
    </div>
  );
}
