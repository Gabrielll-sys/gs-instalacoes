import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL, type Orcamento } from './api';
import { sessao } from './sessao';
import { numeroDoOrcamento } from './valores';

const TIPO_PDF = 'application/pdf';
// Gerar o relatório lê todas as fotos da OS no armazenamento: leva bem mais do que as outras chamadas.
const TEMPO_LIMITE_MS = 3 * 60 * 1000;

export function gerarRelatorio(ordemId: string) {
  const codigo = ordemId.replaceAll('-', '').slice(0, 8).toUpperCase();
  return baixarPdf(`/ordens/${ordemId}/relatorio`, `Relatorio-OS-${codigo}.pdf`);
}

export const gerarPdfOrcamento = (orcamento: Orcamento) =>
  baixarPdf(`/orcamentos/${orcamento.id}/pdf`, `Orcamento-${numeroDoOrcamento(orcamento.numero)}.pdf`);

async function baixarPdf(rota: string, nome: string) {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    return await File.downloadFileAsync(
      `${API_URL}/api${rota}`,
      new File(Paths.cache, nome),
      {
        headers: { Authorization: `Bearer ${sessao.get()?.token}` },
        idempotent: true,
        signal: controle.signal,
      },
    );
  } finally {
    clearTimeout(limite);
  }
}

export const abrirPdf = (pdf: File) => pdf.preview({ mimeType: TIPO_PDF });

export const enviarPdf = (pdf: File, titulo: string) => Sharing.shareAsync(pdf.uri, { mimeType: TIPO_PDF, dialogTitle: titulo });

// O download nativo só informa o código HTTP dentro da mensagem: "response has status: 404".
export function mensagemDoPdf(erro: unknown, naoEncontrado: string) {
  const status = erro instanceof Error ? erro.message.match(/status: (\d+)/)?.[1] : undefined;
  if (status === '401') {
    void sessao.sair('Sua sessão expirou. Entre de novo: o que está na fila continua guardado.');
    return 'Sua sessão expirou.';
  }
  if (status === '403') return 'Só o gestor pode gerar este PDF.';
  if (status === '404') return naoEncontrado;
  if (status) return `O servidor não conseguiu gerar o PDF (erro ${status}). Tente de novo.`;
  return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
}
