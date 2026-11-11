import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { confirmar, DESCARTAR } from './confirmar';

// Sair de um formulário com alterações pergunta antes, como o "Descartar" do app.
export function useGuardaAlteracoes(ativo: boolean) {
  const bloqueio = useBlocker(({ currentLocation, nextLocation }) => ativo && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (bloqueio.state !== 'blocked') return;
    void confirmar(...DESCARTAR).then((sim) => (sim ? bloqueio.proceed() : bloqueio.reset()));
  }, [bloqueio]);

  // Fechar a aba ou recarregar também perderia o que foi digitado.
  useEffect(() => {
    if (!ativo) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [ativo]);
}
