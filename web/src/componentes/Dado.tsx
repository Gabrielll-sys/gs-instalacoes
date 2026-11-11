import type { ReactNode } from 'react';
import { Icone } from './Icone';

// Ícone marinho, rótulo pequeno e valor: o par de leitura das gavetas de OS e de orçamento.
export function Dado({ icone, rotulo, children }: { icone: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="dado">
      <Icone caminho={icone} />
      <div>
        <dt>{rotulo}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}
