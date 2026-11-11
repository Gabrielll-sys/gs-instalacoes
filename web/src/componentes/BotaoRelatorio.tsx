import { mdiDownload, mdiEyeOutline, mdiFileDocumentOutline } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, mensagemDoErro, type Ordem, type Pdf } from '../api';
import { Erro } from './Estado';
import { Icone } from './Icone';

// Tudo o que aparece no PDF: se mudar depois de gerar, o arquivo pronto deixa de valer.
const conteudoDoPdf = (o: Ordem) => JSON.stringify([o.cliente, o.responsaveis, o.observacoes, o.fotos.map((f) => f.id)]);

// Gera no servidor, depois oferece Abrir e Baixar. `conteudo` resume o que vai no PDF:
// se mudar depois de gerar, o arquivo fica velho e o botão volta a pedir para gerar.
export function BotaoPdf({ nome, conteudo, gerar }: { nome: 'relatório' | 'orçamento'; conteudo: string; gerar: () => Promise<Pdf> }) {
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

  return (
    <div className="bloco-relatorio">
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
