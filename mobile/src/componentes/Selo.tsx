import { StyleSheet, Text } from 'react-native';
import { cor, familia } from '../tema';
import { rotuloDaSituacao } from '../valores';

// Selo da situação do orçamento, sem dourado: aprovado é o único preenchido em marinho.
const CORES: Record<string, { fundo: string; texto: string }> = {
  aberto: { fundo: cor.fundo, texto: cor.textoSuave },
  enviado: { fundo: cor.envioFundo, texto: cor.marinho },
  aprovado: { fundo: cor.marinho, texto: cor.branco },
  recusado: { fundo: cor.erroFundo, texto: cor.erro },
};

export function Selo({ situacao }: { situacao: string }) {
  const { fundo, texto } = CORES[situacao] ?? CORES.aberto;
  return <Text style={[estilos.selo, { backgroundColor: fundo, color: texto }]}>{rotuloDaSituacao(situacao)}</Text>;
}

const estilos = StyleSheet.create({
  selo: { fontFamily: familia.extra, fontSize: 12, lineHeight: 18, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
});
