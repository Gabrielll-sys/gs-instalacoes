import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { Directory, File, Paths, UploadType } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { api } from '../api';
import { sessao } from '../sessao';
import { outbox } from './outbox';
import { atrasoDaTentativa, drenar, ErroApi, type Op } from './regras';

export const CHAVE_ORDENS = ['ordens'];
export const UM_MES_MS = 30 * 24 * 60 * 60 * 1000;
const TEMPO_LIMITE_UPLOAD_MS = 5 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    // Infinity, não 30 dias: acima de 2^31 ms o setTimeout dispara na hora e apaga o cache restaurado.
    queries: { gcTime: Infinity, staleTime: 30_000, networkMode: 'offlineFirst', retry: 1 },
    mutations: { networkMode: 'always' },
  },
});

// Guarda só o nome do arquivo: no iOS o caminho absoluto do app muda a cada atualização.
export const pastaFotos = () => new Directory(Paths.document, 'fotos');
export const arquivoFoto = (nome: string) => new File(pastaFotos(), nome);

export function apagarArquivo(nome: string) {
  try {
    const arquivo = arquivoFoto(nome);
    if (arquivo.exists) arquivo.delete();
  } catch {
    // Sobra de arquivo não atrapalha; a foto já foi enviada ou descartada.
  }
}

let rodadaAtual: Promise<void> | null = null;
let tentativas = 0;
let agendada: ReturnType<typeof setTimeout> | undefined;
let idEmExecucao: string | null = null;
const ouvintesFalha = new Set<() => void>();

export const opEmExecucao = () => idEmExecucao;

function definirTentativas(valor: number) {
  tentativas = valor;
  ouvintesFalha.forEach((ouvinte) => ouvinte());
}

// Sinal fraco costuma parecer conectado: sem isto o aviso mostraria "Enviando" para sempre.
export const useSemResposta = () =>
  useSyncExternalStore(
    (ouvinte) => {
      ouvintesFalha.add(ouvinte);
      return () => {
        ouvintesFalha.delete(ouvinte);
      };
    },
    () => tentativas > 0,
  );

async function enviarFoto({ foto }: Extract<Op, { tipo: 'enviar-foto' }>) {
  const arquivo = arquivoFoto(foto.arquivo);
  if (!arquivo.exists) throw new ErroApi(410, 'O arquivo desta foto não existe mais no aparelho.');

  const { uploadUrl } = await api.urlDeUpload(foto.ordemId, foto.id, foto.contentType);

  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_UPLOAD_MS);
  try {
    const { status } = await arquivo.upload(uploadUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: { 'Content-Type': foto.contentType },
      signal: controle.signal,
    });
    if (status < 200 || status >= 300) throw new ErroApi(status, `O armazenamento recusou a foto (${status}).`);
  } finally {
    clearTimeout(limite);
  }

  await api.registrarFoto(foto.ordemId, foto.id, {
    secao: foto.secao,
    contentType: foto.contentType,
    criadaEm: foto.criadaEm,
  });
}

function executar(op: Op) {
  switch (op.tipo) {
    case 'salvar-ordem':
      return api.salvarOrdem(op.ordem);
    case 'enviar-foto':
      return enviarFoto(op);
    case 'excluir-foto':
      return api.excluirFoto(op.ordemId, op.fotoId);
  }
}

async function limparFeitas() {
  const feitas = outbox.snapshot().filter((op) => op.estado === 'feito');
  if (feitas.length === 0) return;

  // Recarrega antes de tirar da fila para a foto não sumir da tela entre as duas coisas.
  // Cancela primeiro porque uma busca já em andamento traria dados de antes do envio.
  await queryClient.cancelQueries({ queryKey: CHAVE_ORDENS });
  await queryClient.fetchQuery({ queryKey: CHAVE_ORDENS, queryFn: api.listarOrdens, staleTime: 0 });

  await outbox.remover(feitas.map((op) => op.id));
  for (const op of feitas) if (op.tipo === 'enviar-foto') apagarArquivo(op.foto.arquivo);
}

async function rodar() {
  clearTimeout(agendada);
  if (!sessao.get() || !onlineManager.isOnline()) return;

  let ok = false;
  try {
    do {
      ok = await drenar({
        proxima: () => outbox.snapshot().find((op) => op.estado === 'pendente'),
        executar: async (op) => {
          idEmExecucao = op.id;
          try {
            await executar(op);
          } finally {
            idEmExecucao = null;
          }
        },
        marcar: outbox.marcar,
      });
      if (ok) await limparFeitas();
    } while (ok && outbox.snapshot().some((op) => op.estado === 'pendente'));
  } catch {
    ok = false;
  }

  if (ok) {
    definirTentativas(0);
  } else if (sessao.get()) {
    definirTentativas(tentativas + 1);
    agendada = setTimeout(() => void sincronizar(), atrasoDaTentativa(tentativas));
  }
}

// Uma rodada por vez: internet voltando, app em primeiro plano e foto nova não enviam a mesma coisa em dobro.
export function sincronizar() {
  rodadaAtual ??= rodar().finally(() => {
    rodadaAtual = null;
  });
  return rodadaAtual;
}

export function iniciarMotor() {
  onlineManager.setEventListener((definirOnline) =>
    NetInfo.addEventListener((estado) =>
      definirOnline(Boolean(estado.isConnected && estado.isInternetReachable !== false)),
    ),
  );
  onlineManager.subscribe((online) => {
    if (online) void sincronizar();
  });
  AppState.addEventListener('change', (estado) => {
    focusManager.setFocused(estado === 'active');
    if (estado === 'active') void sincronizar();
  });
  // Entrar de novo depois da sessão expirar retoma a fila.
  sessao.subscribe(() => void sincronizar());
  void sincronizar();
}
