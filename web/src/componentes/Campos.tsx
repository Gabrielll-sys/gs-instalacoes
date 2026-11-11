import { useId, type ReactNode } from 'react';

type PropsDoCampo = { id: string; 'aria-invalid': boolean; 'aria-describedby': string };

// Rótulo, campo e mensagem ligados por id, para o leitor de tela anunciar a dica ou o erro.
export function Campo({
  rotulo,
  erro,
  dica,
  children,
}: {
  rotulo: string;
  erro?: string;
  dica?: string;
  children: (props: PropsDoCampo) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={`campo${erro ? ' com-erro' : ''}`}>
      <label htmlFor={id}>{rotulo}</label>
      {children({ id, 'aria-invalid': !!erro, 'aria-describedby': `${id}-ajuda` })}
      <p id={`${id}-ajuda`} className="campo-ajuda">
        {erro ?? dica}
      </p>
    </div>
  );
}

export function Interruptor({
  rotulo,
  descricao,
  marcado,
  aoMudar,
  desabilitado,
}: {
  rotulo: string;
  descricao: string;
  marcado: boolean;
  aoMudar: (valor: boolean) => void;
  desabilitado?: boolean;
}) {
  const id = useId();
  return (
    <div className="interruptor">
      <div>
        <label htmlFor={id}>{rotulo}</label>
        <p id={`${id}-descricao`}>{descricao}</p>
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={marcado}
        disabled={desabilitado}
        aria-describedby={`${id}-descricao`}
        onChange={(e) => aoMudar(e.target.checked)}
      />
    </div>
  );
}
