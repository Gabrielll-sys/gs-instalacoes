// Ícones do Material Design, a mesma família do app.
export function Icone({ caminho, tamanho = 22 }: { caminho: string; tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="currentColor" aria-hidden="true" focusable="false">
      <path d={caminho} />
    </svg>
  );
}
