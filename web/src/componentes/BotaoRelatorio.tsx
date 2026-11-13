import { mdiDownload, mdiEyeOutline, mdiFileDocumentOutline, mdiSendOutline, mdiWhatsapp } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, mensagemDoErro, type Ordem, type Pdf } from '../api';
import { Erro } from './Estado';
import { Icone } from './Icone';

// Tudo o que aparece no PDF: se mudar depois de gerar, o arquivo pronto deixa de valer.
const conteudoDoPdf = (o: Ordem) => JSON.stringify([o.cliente, o.responsaveis, o.observacoes, o.fotos.map((f) => f.id)]);

// Gera no servidor, depois oferece Abrir e Baixar. `conteudo` resume o que vai no PDF:
// se mudar depois de gerar, o arquivo fica velho e o botão volta a pedir para gerar.
// `envioDireto`, no orçamento: um botão principal que gera, se preciso, e compartilha o PDF pelo navegador.
// Sem compartilhamento de arquivos (ou se o navegador recusar), baixa o PDF e oferece a conversa do cliente no WhatsApp.
export function BotaoPdf({
  nome,
  conteudo,
  gerar,
  envioDireto,
}: {
  nome: 'relatório' | 'orçamento';
  conteudo: string;
  gerar: () => Promise<Pdf>;
  envioDireto?: { whatsapp?: string; mensagem: string };
}) {
  const [semCompartilhar, setSemCompartilhar] = useState(false);
  const [gerado, setGerado] = useState<(Pdf & { conteudo: string }) | null>(null);
  const criar = useMutation({
    mutationFn: gerar,
    onSuccess: (pdf) => setGerado({ ...pdf, conteudo }),
  });

  // O PDF fica na memória do navegador enquanto a gaveta está aberta.
  useEffect(() => () => {
    if (gerado) URL.revokeObjectURL(gerado.url);
  }, [gerado]);

  const pdf = gerado?.conteudo === conteudo ? gerado : null;
  const Nome = nome[0].toUpperCase() + nome.slice(1);

  const enviarAoCliente = async () => {
    const pronto = pdf ?? (await criar.mutateAsync().catch(() => null));
    if (!pronto || !envioDireto) return;
    const arquivo = new File([await (await fetch(pronto.url)).blob()], pronto.nome, { type: 'application/pdf' });
    try {
      if (!navigator.canShare?.({ files: [arquivo] })) throw new Error('sem compartilhamento');
      await navigator.share({ files: [arquivo], title: pronto.nome, text: envioDireto.mensagem });
    } catch (erro) {
      // Quem cancelou a janela de compartilhar não quer o plano B.
      if (erro instanceof DOMException && erro.name === 'AbortError') return;
      const link = document.createElement('a');
      link.href = pronto.url;
      link.download = pronto.nome;
      link.click();
      setSemCompartilhar(true);
    }
  };

  return (
    <div className="bloco-relatorio">
      {envioDireto && (
        <button type="button" className="botao botao-ouro" disabled={criar.isPending} onClick={() => void enviarAoCliente()}>
          <Icone caminho={mdiSendOutline} />
          {criar.isPending ? `Gerando ${nome}…` : 'Enviar ao cliente'}
        </button>
      )}
      {semCompartilhar && envioDireto && (
        <p aria-live="polite">
          O PDF foi baixado. Anexe na conversa com o cliente.
          {envioDireto.whatsapp && (
            <>
              {' '}
              <a href={`${envioDireto.whatsapp}?text=${encodeURIComponent(envioDireto.mensagem)}`} target="_blank" rel="noopener" className="link-whatsapp">
                <Icone caminho={mdiWhatsapp} tamanho={18} />
                Abrir a conversa no WhatsApp
              </a>
            </>
          )}
        </p>
      )}
      {pdf && (
        <>
          <p aria-live="polite">{Nome} pronto. Confira antes de enviar ao cliente.</p>
          <div className="linha-botoes">
            <a className="botao botao-marinho" href={pdf.url} target="_blank" rel="noopener">
              <Icone caminho={mdiEyeOutline} />
              Abrir
            </a>
            <a className="botao botao-contorno" href={pdf.url} download={pdf.nome}>
              <Icone caminho={mdiDownload} />
              Baixar
            </a>
          </div>
        </>
      )}
      <button type="button" className={`botao ${pdf ? 'botao-texto' : 'botao-contorno'}`} disabled={criar.isPending} onClick={() => criar.mutate()}>
        {!pdf && <Icone caminho={mdiFileDocumentOutline} />}
        {criar.isPending ? `Gerando ${nome}…` : pdf ? 'Gerar de novo' : `Gerar ${nome} em PDF`}
      </button>
      {criar.isError && <Erro>{mensagemDoErro(criar.error)}</Erro>}
    </div>
  );
}

export function BotaoRelatorio({ ordem }: { ordem: Ordem }) {
  return <BotaoPdf nome="relatório" conteudo={conteudoDoPdf(ordem)} gerar={() => api.gerarRelatorio(ordem.id)} />;
}
