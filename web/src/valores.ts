// Valores do orçamento. A conta usa milésimos e centavos inteiros para arredondar cada linha
// exatamente como o servidor, sem erro de ponto flutuante.

export type ItemDigitado = { descricao: string; quantidade: string; unidade: string; preco: string };

// Linha do formulário: a chave mantém o estado de cada item ao reordenar ou remover.
export type Linha = ItemDigitado & { chave: number };
let proximaChave = 0;
export const novaLinha = (item?: ItemDigitado): Linha => ({
  chave: proximaChave++,
  ...(item ?? { descricao: '', quantidade: '1', unidade: 'un', preco: '' }),
});
export const linhaDoItem = (i: { descricao: string; quantidade: number; unidade: string; precoUnitario: number }) =>
  novaLinha({ descricao: i.descricao, quantidade: paraCampo(i.quantidade), unidade: i.unidade, preco: precoParaCampo(i.precoUnitario) });

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

// Diz qual campo marcar em vermelho, além da mensagem: a tela não depende do texto para isso.
export function problemaNoItem(item: ItemDigitado): { campo: keyof ItemDigitado; mensagem: string } | null {
  if (!item.descricao.trim()) return { campo: 'descricao', mensagem: 'Informe o material.' };
  const quantidade = lerNumero(item.quantidade);
  if (quantidade === null || quantidade <= 0 || casasDecimais(item.quantidade) > 3)
    return { campo: 'quantidade', mensagem: 'Informe a quantidade, com até 3 casas decimais.' };
  if (!item.unidade.trim()) return { campo: 'unidade', mensagem: 'Informe a unidade.' };
  if (lerNumero(item.preco) === null || casasDecimais(item.preco) > 2)
    return { campo: 'preco', mensagem: 'Informe o preço unitário, com até 2 casas decimais.' };
  return null;
}

// As mais usadas em instalação elétrica; o campo continua livre para outra.
export const UNIDADES = ['un', 'm', 'm²', 'pç', 'cx', 'rl', 'kg', 'l', 'h', 'sv'];

export const moverItem = <T>(lista: T[], de: number, para: number) => {
  if (para < 0 || para >= lista.length) return lista;
  const nova = [...lista];
  nova.splice(para, 0, ...nova.splice(de, 1));
  return nova;
};

// Preço digitado vira 1.234,50 ao sair do campo; o que não dá para ler fica como está, para a validação apontar.
export const arrumarPreco = (texto: string) => {
  const valor = lerNumero(texto);
  return valor === null || casasDecimais(texto) > 2 ? texto : precoParaCampo(valor);
};

const digitos = (texto: string) => texto.replace(/\D/g, '');

// Máscaras aplicadas ao sair do campo, só quando a quantidade de dígitos fecha: número de fora ou com ramal fica como foi digitado.
export function mascararTelefone(texto: string) {
  const d = digitos(texto);
  if (d.length !== 10 && d.length !== 11) return texto.trim();
  const corte = d.length === 11 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`;
}

export function mascararDocumento(texto: string) {
  const d = digitos(texto);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return texto.trim();
}

// Telefone do Brasil com DDD vira link de ligação e de WhatsApp; outro formato não gera link.
export function contatoDoTelefone(telefone: string) {
  const d = digitos(telefone);
  const nacional = d.length === 10 || d.length === 11 ? d : d.startsWith('55') && (d.length === 12 || d.length === 13) ? d.slice(2) : null;
  return nacional ? { ligar: `tel:+55${nacional}`, whatsapp: `https://wa.me/55${nacional}` } : null;
}

export type Situacao = 'aberto' | 'enviado' | 'aprovado' | 'recusado' | 'finalizado';
export const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'aberto', rotulo: 'Em aberto' },
  { valor: 'enviado', rotulo: 'Enviado' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'recusado', rotulo: 'Recusado' },
  // Serviço concluído: 6 meses depois, o gestor recebe o lembrete de manutenção periódica.
  { valor: 'finalizado', rotulo: 'Finalizado' },
];
export const rotuloDaSituacao = (situacao: string) => SITUACOES.find((x) => x.valor === situacao)?.rotulo ?? situacao;

// Seis meses depois de finalizado, como o lembrete do servidor. Conta dias do calendário, sem a hora:
// no próprio dia já diz "a agendar", mesmo que o lembrete do servidor só apareça na hora exata.
const MESES_ATE_MANUTENCAO = 6;
// Como o AddMonths do .NET: 31 de agosto + 6 meses vira 28 de fevereiro.
const somarMeses = (data: Date, meses: number) => {
  const ultimoDia = new Date(data.getFullYear(), data.getMonth() + meses + 1, 0).getDate();
  return new Date(data.getFullYear(), data.getMonth() + meses, Math.min(data.getDate(), ultimoDia));
};
const diaDoCalendario = (data: Date) => new Date(data.getFullYear(), data.getMonth(), data.getDate());
const quantos = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export type PrazoDaManutencao = { texto: string; estado: 'falta' | 'vencida' | 'agendada' };
export function prazoDaManutencao(
  o: { situacao: string; finalizadoEm: string | null; lembreteResolvidoEm: string | null },
  agora = new Date(),
): PrazoDaManutencao | null {
  if (o.situacao !== 'finalizado' || !o.finalizadoEm) return null;
  if (o.lembreteResolvidoEm) return { texto: 'Manutenção agendada', estado: 'agendada' };
  const hoje = diaDoCalendario(agora);
  const alvo = somarMeses(diaDoCalendario(new Date(o.finalizadoEm)), MESES_ATE_MANUTENCAO);
  if (alvo <= hoje) return { texto: 'Manutenção a agendar', estado: 'vencida' };
  let meses = 0;
  while (somarMeses(hoje, meses + 1) <= alvo) meses++;
  // round: a troca de horário de verão deixaria o dia com 23 ou 25 horas.
  const dias = Math.round((alvo.getTime() - somarMeses(hoje, meses).getTime()) / 86_400_000);
  const partes = [meses ? quantos(meses, 'mês', 'meses') : '', dias ? quantos(dias, 'dia', 'dias') : ''].filter(Boolean);
  return { texto: `${(meses || dias) === 1 ? 'Falta' : 'Faltam'} ${partes.join(' e ')}`, estado: 'falta' };
}

// Marcação da OS, que também serve de busca. Mesma lista e mesma ordem da API.
export const TIPOS_ORDEM = ['Visita técnica', 'Manutenção', 'Manutenção predial', 'Instalação'];
// Marca ou desmarca mantendo a ordem da lista, como o servidor guarda.
export const alternarTipo = (tipos: string[], tipo: string) =>
  TIPOS_ORDEM.filter((t) => (t === tipo ? !tipos.includes(t) : tipos.includes(t)));

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarMoeda = (valor: number) => moeda.format(valor);
export const formatarCentavos = (centavos: number) => moeda.format(centavos / 100);
export const formatarQuantidade = (valor: number) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
export const formatarDia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
export const numeroDoOrcamento = (numero: number) => String(numero).padStart(4, '0');

// Sem separador de milhar: ao editar, o teclado numérico apaga e redigita sem tropeçar no ponto.
export const paraCampo = (valor: number) => String(valor).replace('.', ',');
export const precoParaCampo = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Busca sem acento nem maiúscula, como a das OS.
export const semAcento = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

type ClienteBuscavel = { nome: string; telefone: string; documento: string; endereco: string };
export const buscarClientes = <T extends ClienteBuscavel>(clientes: T[], busca: string) => {
  const termo = semAcento(busca.trim());
  return termo ? clientes.filter((c) => semAcento([c.nome, c.telefone, c.documento, c.endereco].join(' ')).includes(termo)) : clientes;
};

// Pelo nome ou telefone do cliente (com ou sem máscara) ou pelo número, como a busca do servidor.
export const filtrarOrcamentos = <T extends { clienteNome: string; clienteTelefone: string; numero: number; situacao: string }>(
  orcamentos: T[],
  busca: string,
  situacao: Situacao | 'todas' = 'todas',
) => {
  const termo = semAcento(busca.trim());
  return orcamentos.filter(
    (o) =>
      (situacao === 'todas' || o.situacao === situacao) &&
      (!termo || semAcento(`${o.clienteNome} ${o.numero} ${numeroDoOrcamento(o.numero)} ${o.clienteTelefone} ${digitos(o.clienteTelefone)}`).includes(termo)),
  );
};
