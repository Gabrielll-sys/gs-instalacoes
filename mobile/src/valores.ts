// Valores do orçamento. A conta usa milésimos e centavos inteiros para arredondar cada linha
// exatamente como o servidor, sem erro de ponto flutuante.

export type ItemDigitado = { descricao: string; quantidade: string; unidade: string; preco: string };

// Aceita o jeito brasileiro (1.234,56) e o ponto como decimal quando não há vírgula (12.5).
function normalizar(texto: string) {
  const limpo = texto.replace(/^\s*R\$/, '').replace(/\s/g, '');
  const normal = limpo.includes(',') ? limpo.replaceAll('.', '').replace(',', '.') : limpo;
  return /^\d+(\.\d+)?$/.test(normal) ? normal : null;
}

export function lerNumero(texto: string) {
  const normal = normalizar(texto);
  return normal === null ? null : Number(normal);
}

const casasDecimais = (texto: string) => normalizar(texto)?.split('.')[1]?.length ?? 0;

export const centavosDoItem = (quantidade: number, preco: number) =>
  Math.round((Math.round(quantidade * 1000) * Math.round(preco * 100)) / 1000);

// Soma enquanto se digita: item ainda incompleto conta como zero.
export const centavosDoTotal = (itens: ItemDigitado[]) =>
  itens.reduce((total, item) => {
    const quantidade = lerNumero(item.quantidade);
    const preco = lerNumero(item.preco);
    return quantidade === null || preco === null ? total : total + centavosDoItem(quantidade, preco);
  }, 0);

export function problemaNoItem(item: ItemDigitado) {
  if (!item.descricao.trim()) return 'Informe o material.';
  const quantidade = lerNumero(item.quantidade);
  if (quantidade === null || quantidade <= 0 || casasDecimais(item.quantidade) > 3) return 'Informe a quantidade, com até 3 casas decimais.';
  if (!item.unidade.trim()) return 'Informe a unidade.';
  if (lerNumero(item.preco) === null || casasDecimais(item.preco) > 2) return 'Informe o preço unitário, com até 2 casas decimais.';
  return null;
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarMoeda = (valor: number) => moeda.format(valor);
export const formatarCentavos = (centavos: number) => moeda.format(centavos / 100);
export const formatarQuantidade = (valor: number) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
export const formatarDia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
export const numeroDoOrcamento = (numero: number) => String(numero).padStart(4, '0');

// Sem separador de milhar: ao editar, o teclado numérico apaga e redigita sem tropeçar no ponto.
export const paraCampo = (valor: number) => String(valor).replace('.', ',');
export const precoParaCampo = (valor: number) => valor.toFixed(2).replace('.', ',');

// Busca sem acento nem maiúscula, como a das OS.
export const semAcento = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

type ClienteBuscavel = { nome: string; telefone: string; documento: string; endereco: string };
export const buscarClientes = <T extends ClienteBuscavel>(clientes: T[], busca: string) => {
  const termo = semAcento(busca.trim());
  return termo ? clientes.filter((c) => semAcento([c.nome, c.telefone, c.documento, c.endereco].join(' ')).includes(termo)) : clientes;
};

export const filtrarOrcamentos = <T extends { clienteNome: string; numero: number }>(orcamentos: T[], busca: string) => {
  const termo = semAcento(busca.trim());
  return termo ? orcamentos.filter((o) => semAcento(`${o.clienteNome} ${o.numero} ${numeroDoOrcamento(o.numero)}`).includes(termo)) : orcamentos;
};
