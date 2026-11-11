// Regras puras da sincronização, sem imports nativos para poderem rodar em `node --test`.

export type Secao = 'antes' | 'depois';

export type Foto = {
  id: string;
  ordemId: string;
  secao: Secao;
  url: string;
  // Quando foi adicionada à OS, no aparelho. É a única data que a foto mostra.
  criadaEm: string;
  // Só existem enquanto a foto está na fila do aparelho.
  envio?: 'pendente' | 'erro';
  erro?: string;
};

export type DadosOrdem = {
  id: string;
  cliente: string;
  responsaveis: string[];
  observacoes: string;
  abertaEm: string;
};

export type Ordem = DadosOrdem & { fotos: Foto[]; fotosNaFila?: number; alteracoesNaFila?: number };

export type FotoNaFila = {
  id: string;
  ordemId: string;
  secao: Secao;
  criadaEm: string;
  arquivo: string;
  contentType: string;
};

export type NovaOp =
  | { id: string; tipo: 'salvar-ordem'; ordem: DadosOrdem }
  | { id: string; tipo: 'enviar-foto'; foto: FotoNaFila }
  | { id: string; tipo: 'excluir-foto'; ordemId: string; fotoId: string };

export type Op = NovaOp & { estado: 'pendente' | 'erro' | 'feito'; erro?: string };

export class ErroApi extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Mesmo limite do GET /api/ordens: ao atingi-lo, os totais do app são só o mínimo.
export const LIMITE_ORDENS = 200;

// Mesmo limite que o servidor confere ao registrar a foto.
export const LIMITE_FOTO_BYTES = 4 * 1024 * 1024;

// WebP a 0,85 fica visualmente igual ao original. Só reduz foto acima de 16 MP; os passos seguintes
// só entram se a foto ainda passar de 4 MB.
export const PASSOS_COMPRESSAO = [
  { lado: 4096, qualidade: 0.85 },
  { lado: 4096, qualidade: 0.75 },
  { lado: 3072, qualidade: 0.75 },
  { lado: 2048, qualidade: 0.7 },
];

export const ordemDaOp = (op: Op) =>
  op.tipo === 'salvar-ordem' ? op.ordem.id : op.tipo === 'enviar-foto' ? op.foto.ordemId : op.ordemId;

// Sobrepõe a fila aos dados do servidor em vez de editar o cache: um refetch nunca apaga o que está pendente.
export function aplicarOutbox(servidor: Ordem[], ops: Op[], urlLocal: (arquivo: string) => string): Ordem[] {
  const ordens = new Map(
    servidor.map((o) => [o.id, { ...o, fotos: [...o.fotos], fotosNaFila: 0, alteracoesNaFila: 0 }]),
  );

  for (const op of ops) {
    const ordemId = ordemDaOp(op);

    if (op.tipo === 'salvar-ordem') {
      const atual = ordens.get(ordemId);
      ordens.set(ordemId, {
        ...op.ordem,
        // A abertura não muda depois de criada, igual ao servidor.
        abertaEm: atual?.abertaEm ?? op.ordem.abertaEm,
        fotos: atual?.fotos ?? [],
        fotosNaFila: atual?.fotosNaFila ?? 0,
        alteracoesNaFila: atual?.alteracoesNaFila ?? 0,
      });
    }

    const ordem = ordens.get(ordemId);
    if (!ordem) continue;
    if (op.estado !== 'feito') {
      if (op.tipo === 'enviar-foto') ordem.fotosNaFila++;
      else ordem.alteracoesNaFila++;
    }

    if (op.tipo === 'enviar-foto') {
      const { id, secao, criadaEm, arquivo } = op.foto;
      ordem.fotos = ordem.fotos.filter((f) => f.id !== id);
      ordem.fotos.push({
        id,
        ordemId,
        secao,
        criadaEm,
        url: urlLocal(arquivo),
        envio: op.estado === 'feito' ? undefined : op.estado,
        erro: op.erro,
      });
    } else if (op.tipo === 'excluir-foto') {
      ordem.fotos = ordem.fotos.filter((f) => f.id !== op.fotoId);
    }
  }

  return [...ordens.values()].sort((a, b) => Date.parse(b.abertaEm) - Date.parse(a.abertaEm));
}

// Processa em ordem e devolve false quando vale a pena tentar de novo mais tarde.
export async function drenar(deps: {
  proxima: () => Op | undefined;
  executar: (op: Op) => Promise<void>;
  marcar: (id: string, mudancas: Partial<Pick<Op, 'estado' | 'erro'>>) => Promise<void>;
}): Promise<boolean> {
  for (let op = deps.proxima(); op; op = deps.proxima()) {
    try {
      await deps.executar(op);
      await deps.marcar(op.id, { estado: 'feito', erro: undefined });
    } catch (erro) {
      if (!erroPermanente(erro)) return false;
      await deps.marcar(op.id, { estado: 'erro', erro: (erro as Error).message });
    }
  }
  return true;
}

// Rede, 5xx, 401, 408 e 429 passam sozinhos; o resto repetiria igual e fica para o usuário decidir.
function erroPermanente(erro: unknown) {
  if (!(erro instanceof ErroApi)) return false;
  return erro.status >= 400 && erro.status < 500 && ![401, 408, 429].includes(erro.status);
}

const ATRASOS_MS = [5_000, 30_000, 120_000, 600_000];
export const atrasoDaTentativa = (tentativa: number) =>
  ATRASOS_MS[Math.min(tentativa, ATRASOS_MS.length) - 1];

export function formatarData(iso: string) {
  const data = new Date(iso);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data.toLocaleDateString('pt-BR')} às ${hora}`;
}

export function formatarCarimbo(iso: string) {
  const data = new Date(iso);
  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} ${hora}`;
}

export type Filtro = 'todas' | 'andamento' | 'concluidas';

export const contarFotos = (ordem: Ordem, secao: Secao) => ordem.fotos.filter((f) => f.secao === secao).length;
// Concluída exige a prova inteira: sem o antes, a OS ainda tem o que corrigir.
export const estaConcluida = (ordem: Ordem) => contarFotos(ordem, 'antes') > 0 && contarFotos(ordem, 'depois') > 0;

// Fotos à parte: é o número que precisa bater com os selos da tela.
export function descreverFila(fotos: number, alteracoes: number) {
  const partes: string[] = [];
  if (fotos > 0) partes.push(fotos === 1 ? '1 foto' : `${fotos} fotos`);
  if (alteracoes > 0) partes.push(alteracoes === 1 ? '1 alteração' : `${alteracoes} alterações`);
  return partes.join(' e ');
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function filtrarOrdens(ordens: Ordem[], busca: string, filtro: Filtro) {
  const termo = normalizar(busca);
  return ordens.filter((o) => {
    if (filtro === 'andamento' && estaConcluida(o)) return false;
    if (filtro === 'concluidas' && !estaConcluida(o)) return false;
    return !termo || normalizar([o.cliente, ...o.responsaveis].join(' ')).includes(termo);
  });
}
