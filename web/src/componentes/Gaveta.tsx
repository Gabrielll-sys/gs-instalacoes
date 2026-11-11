import { useEffect, useId, useState, type ReactNode } from 'react';
import { mdiClose } from '@mdi/js';
import { Icone } from './Icone';
import { RaizDaGaveta } from './raizDaGaveta';

// Painel que desliza da direita por cima da lista. O <dialog> nativo prende o foco, fecha no Esc
// e devolve o foco a quem abriu; a página continua por baixo, no mesmo lugar.
export function Gaveta({
  titulo,
  aoFechar,
  acoes,
  rodape,
  children,
}: {
  titulo: string;
  aoFechar: () => void;
  acoes?: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const [dialogo, setDialogo] = useState<HTMLDialogElement | null>(null);
  const idTitulo = useId();

  useEffect(() => {
    if (!dialogo || dialogo.open) return;
    dialogo.showModal();
    // O showModal leva o foco ao primeiro botão (o Fechar); formulário novo começa no campo marcado com data-foco.
    dialogo.querySelector<HTMLElement>('[data-foco]')?.focus();
  }, [dialogo]);

  return (
    <dialog
      ref={setDialogo}
      className="gaveta"
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        // O React repassa o Esc de uma gaveta aberta por cima desta: só o desta conta.
        if (evento.target !== dialogo) return;
        evento.preventDefault();
        // Com o visualizador aberto, o Esc é dele: fecha a foto, não a gaveta.
        if (!dialogo?.querySelector('.yarl__root')) aoFechar();
      }}
      onClick={(evento) => {
        // O clique no véu escuro cai no próprio <dialog>, fora da caixa.
        if (evento.target === dialogo) aoFechar();
      }}
    >
      <div className="gaveta-caixa">
        <header className="gaveta-topo">
          <h2 id={idTitulo}>{titulo}</h2>
          {acoes}
          <button type="button" className="botao-icone claro" onClick={aoFechar} aria-label="Fechar">
            <Icone caminho={mdiClose} />
          </button>
        </header>
        <RaizDaGaveta.Provider value={dialogo}>
          <div className="gaveta-corpo">{children}</div>
        </RaizDaGaveta.Provider>
        {rodape && <footer className="gaveta-rodape">{rodape}</footer>}
      </div>
    </dialog>
  );
}
