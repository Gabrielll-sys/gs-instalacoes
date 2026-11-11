import { useMutation } from '@tanstack/react-query';
import type { File } from 'expo-file-system';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { abrirPdf, enviarPdf, gerarRelatorio, mensagemDoPdf } from '../relatorio';
import { descreverFila, type Ordem } from '../sync/regras';
import { cor } from '../tema';

// Tudo o que aparece no PDF. Fotos ainda na fila ficam de fora, como no servidor: quando chegarem, o PDF fica velho.
const conteudoDoPdf = (ordem: Ordem) =>
  JSON.stringify([ordem.cliente, ordem.responsaveis, ordem.observacoes, ordem.fotos.filter((f) => !f.envio).map((f) => f.id)]);

// Gera no servidor, depois oferece Abrir e Enviar. `conteudo` resume o que vai no PDF:
// se mudar depois de gerar, o arquivo fica velho e o botão volta a pedir para gerar.
export function BotaoPdf({
  nome,
  conteudo,
  gerar,
  tituloEnvio,
  mensagemDoErro,
  onErro,
  children,
}: {
  nome: 'relatório' | 'orçamento';
  conteudo: string;
  gerar: () => Promise<File>;
  tituloEnvio: string;
  mensagemDoErro: (erro: unknown) => string;
  onErro: (mensagem: string) => void;
  children?: ReactNode;
}) {
  const [gerado, setGerado] = useState<{ pdf: File; conteudo: string } | null>(null);
  const criar = useMutation({
    mutationFn: gerar,
    onSuccess: (pdf) => setGerado({ pdf, conteudo }),
    onError: (erro) => onErro(mensagemDoErro(erro)),
  });

  // Mudou depois de gerar: enviar esse arquivo seria mandar ao cliente uma versão que não vale mais.
  const pdf = gerado?.conteudo === conteudo ? gerado.pdf : null;
  const Nome = nome[0].toUpperCase() + nome.slice(1);

  const abrir = (arquivo: File) =>
    abrirPdf(arquivo).catch(() => onErro('Nenhum app deste aparelho abre PDF. Use Enviar para mandar o arquivo.'));
  const enviar = (arquivo: File) =>
    enviarPdf(arquivo, tituloEnvio).catch(() => onErro(`Não foi possível enviar o ${nome}. Tente de novo.`));

  return (
    <View style={estilos.bloco}>
      {pdf && (
        <>
          <Text variant="bodyMedium" accessibilityLiveRegion="polite">
            {Nome} pronto. Confira antes de enviar ao cliente.
          </Text>
          <View style={estilos.linha}>
            <Button mode="contained" icon="eye-outline" onPress={() => void abrir(pdf)} style={estilos.expande} contentStyle={estilos.botao}>
              Abrir
            </Button>
            <Button mode="outlined" icon="share-variant-outline" onPress={() => void enviar(pdf)} style={estilos.expande} contentStyle={estilos.botao}>
              Enviar
            </Button>
          </View>
        </>
      )}
      <Button
        mode={pdf ? 'text' : 'outlined'}
        icon={pdf ? undefined : 'file-document-outline'}
        onPress={() => criar.mutate()}
        loading={criar.isPending}
        disabled={criar.isPending}
        contentStyle={estilos.botao}
      >
        {criar.isPending ? `Gerando ${nome}…` : pdf ? 'Gerar de novo' : `Gerar ${nome} em PDF`}
      </Button>
      {children}
    </View>
  );
}

export function BotaoRelatorio({ ordem, onErro }: { ordem: Ordem; onErro: (mensagem: string) => void }) {
  // O relatório sai do servidor: o que ainda está só neste aparelho fica de fora.
  const naFila = descreverFila(ordem.fotosNaFila ?? 0, ordem.alteracoesNaFila ?? 0);
  return (
    <BotaoPdf
      nome="relatório"
      conteudo={conteudoDoPdf(ordem)}
      gerar={() => gerarRelatorio(ordem.id)}
      tituloEnvio={`Relatório de ${ordem.cliente}`}
      mensagemDoErro={(erro) => mensagemDoPdf(erro, 'Esta OS ainda não chegou ao servidor. Aguarde o envio e tente de novo.')}
      onErro={onErro}
    >
      {!!naFila && (
        <Text variant="bodyMedium" style={estilos.fila}>
          Ainda na fila, fora do relatório: {naFila}.
        </Text>
      )}
    </BotaoPdf>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 8, paddingTop: 6, paddingBottom: 10 },
  linha: { flexDirection: 'row', gap: 12 },
  expande: { flex: 1 },
  botao: { height: 48 },
  fila: { color: cor.textoSuave },
});
