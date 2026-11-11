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
