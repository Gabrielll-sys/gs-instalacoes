import { useState } from 'react';

type Linha = { rotulo: string; total: number };

// A assinatura do sistema: filete branco interno, e só contagem de fotos dentro.
export function Placa({ linhas }: { linhas: Linha[] }) {
  const descricao = linhas.map(({ rotulo, total }) => `${rotulo} ${total} ${total === 1 ? 'foto' : 'fotos'}`).join(', ');
  return (
    <div className="placa" role="img" aria-label={descricao}>
      <div className="placa-filete">
        {linhas.map((linha) => (
          <LinhaPlaca key={linha.rotulo} {...linha} />
        ))}
      </div>
    </div>
  );
}

function LinhaPlaca({ rotulo, total }: Linha) {
  // Ajuste de estado durante a renderização: a passagem de 0 para mais é a única que anima.
  const [anterior, setAnterior] = useState(total);
  const [nasce, setNasce] = useState(false);
  if (total !== anterior) {
    setAnterior(total);
    if (anterior === 0 && total > 0) setNasce(true);
  }

  return (
    <div className="placa-linha">
      <span className="placa-rotulo">{rotulo}</span>
      {/* O losango só significa "falta foto". */}
      {total === 0 && <span className="losango" aria-hidden="true" />}
      <span className={`placa-numero${nasce ? ' nasce' : ''}`} onAnimationEnd={() => setNasce(false)}>
        {total}
      </span>
    </div>
  );
}
