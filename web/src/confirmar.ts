// Pergunta no visual da casa, no lugar da caixa do navegador. É um <dialog> próprio, fora do React,
// então abre por cima de qualquer gaveta e o Esc dele não chega até elas.
export function confirmar(titulo: string, texto: string, acao: string): Promise<boolean> {
  return new Promise((responder) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'confirmacao';
    dialogo.setAttribute('aria-labelledby', 'confirmacao-titulo');
    dialogo.setAttribute('aria-describedby', 'confirmacao-texto');
    dialogo.innerHTML =
      '<h2 id="confirmacao-titulo"></h2><p id="confirmacao-texto"></p>' +
      '<div class="linha-botoes"><button type="button" class="botao botao-contorno" value="nao">Cancelar</button>' +
      '<button type="button" class="botao botao-perigo" value="sim"></button></div>';
    dialogo.querySelector('h2')!.textContent = titulo;
    dialogo.querySelector('p')!.textContent = texto;
    dialogo.querySelector('[value="sim"]')!.textContent = acao;

    const fechar = (sim: boolean) => {
      dialogo.close();
      dialogo.remove();
      responder(sim);
    };
    dialogo.addEventListener('click', (evento) => {
      const valor = (evento.target as HTMLElement).closest('button')?.value;
      if (valor) fechar(valor === 'sim');
      else if (evento.target === dialogo) fechar(false);
    });
    dialogo.addEventListener('cancel', (evento) => {
      evento.preventDefault();
      fechar(false);
    });

    document.body.append(dialogo);
    dialogo.showModal();
    // Foco no lado seguro: Enter sem olhar não apaga nada.
    dialogo.querySelector<HTMLButtonElement>('[value="nao"]')!.focus();
  });
}

export const DESCARTAR: [string, string, string] = [
  'Descartar o que foi preenchido?',
  'As alterações desta tela ainda não foram salvas e serão perdidas.',
  'Descartar',
];
