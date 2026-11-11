import { mdiArrowDown, mdiArrowUp, mdiTrashCanOutline } from '@mdi/js';
import { arrumarPreco, centavosDoItem, formatarCentavos, lerNumero, problemaNoItem, type ItemDigitado, type Linha } from '../valores';
import { Icone } from './Icone';

// Uma linha do orçamento: material, quantidade, unidade e preço, com o total da linha ou o erro dela.
export function ItemOrcamento({
  item,
  indice,
  quantos,
  tentou,
  aoMudar,
  aoMover,
  aoRemover,
}: {
  item: Linha;
  indice: number;
  quantos: number;
  tentou: boolean;
  aoMudar: (campo: keyof ItemDigitado, valor: string) => void;
  aoMover: (para: number) => void;
  aoRemover: () => void;
}) {
  const problema = tentou ? problemaNoItem(item) : null;
  const quantidade = lerNumero(item.quantidade);
  const preco = lerNumero(item.preco);
  const total = quantidade !== null && preco !== null ? formatarCentavos(centavosDoItem(quantidade, preco)) : '';
  const erro = (campo: keyof ItemDigitado) => problema?.campo === campo;
  const n = indice + 1;

  return (
    <li className="item-editor">
      <div className="item-topo">
        <span>Item {n}</span>
        <div className="item-acoes">
          <button type="button" className="botao-icone" aria-label={`Subir item ${n}`} title="Subir" disabled={indice === 0} onClick={() => aoMover(indice - 1)}>
            <Icone caminho={mdiArrowUp} />
          </button>
          <button type="button" className="botao-icone" aria-label={`Descer item ${n}`} title="Descer" disabled={indice === quantos - 1} onClick={() => aoMover(indice + 1)}>
            <Icone caminho={mdiArrowDown} />
          </button>
          {quantos > 1 && (
            <button type="button" className="botao-icone" aria-label={`Remover item ${n}`} title="Remover item" onClick={aoRemover}>
              <Icone caminho={mdiTrashCanOutline} />
            </button>
          )}
        </div>
      </div>
      <label className={`campo${erro('descricao') ? ' com-erro' : ''}`}>
        <span className="campo-rotulo">Material</span>
        <input value={item.descricao} onChange={(e) => aoMudar('descricao', e.target.value)} maxLength={200} aria-invalid={erro('descricao')} />
      </label>
      <div className="item-numeros">
        <label className={`campo${erro('quantidade') ? ' com-erro' : ''}`}>
          <span className="campo-rotulo">Qtd.</span>
          <input value={item.quantidade} onChange={(e) => aoMudar('quantidade', e.target.value)} inputMode="decimal" aria-invalid={erro('quantidade')} />
        </label>
        <label className={`campo${erro('unidade') ? ' com-erro' : ''}`}>
          <span className="campo-rotulo">Un.</span>
          <input value={item.unidade} onChange={(e) => aoMudar('unidade', e.target.value)} maxLength={10} list="unidades-comuns" aria-invalid={erro('unidade')} />
        </label>
        <label className={`campo${erro('preco') ? ' com-erro' : ''}`}>
          <span className="campo-rotulo">Preço unit.</span>
          <span className="com-prefixo">
            <span aria-hidden="true">R$</span>
            <input
              value={item.preco}
              onChange={(e) => aoMudar('preco', e.target.value)}
              onBlur={(e) => aoMudar('preco', arrumarPreco(e.target.value))}
              inputMode="decimal"
              aria-invalid={erro('preco')}
            />
          </span>
        </label>
      </div>
      {problema ? (
        <p className="item-erro" role="alert">
          {problema.mensagem}
        </p>
      ) : (
        <p className="item-total">{total && `Total do item: ${total}`}</p>
      )}
    </li>
  );
}
