import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { adicionarFotos, FotoGrandeDemais, type Origem } from '../ordens';
import { formatarCarimbo, type Foto, type Secao } from '../sync/regras';
import { cor, familia } from '../tema';
import { Placa } from './Placa';

const COLUNAS = 3;
const ESPACO = 4;
const MARGEM = 16;

export const TEXTOS: Record<Secao, { rotulo: string; vazio: string }> = {
  antes: { rotulo: 'ANTES', vazio: 'Fotografe o local como está, antes de começar.' },
  depois: { rotulo: 'DEPOIS', vazio: 'Fotografe o resultado quando terminar a instalação.' },
};

function Miniatura({ foto, lado, onPress }: { foto: Foto; lado: number; onPress: () => void }) {
  const situacao = foto.envio === 'erro' ? ', não enviada' : foto.envio === 'pendente' ? ', aguardando envio' : '';
  const carimbo = formatarCarimbo(foto.criadaEm);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={`Abrir foto adicionada em ${carimbo}${situacao}`}
      android_ripple={{ color: 'rgba(255,255,255,0.3)', foreground: true }}
      style={{ width: lado, height: lado }}
    >
      <Image source={{ uri: foto.miniaturaUrl ?? foto.url }} recyclingKey={foto.id} transition={150} contentFit="cover" style={estilos.imagem} />
      <View style={estilos.carimbo}>
        <Text style={estilos.carimboTexto}>{carimbo}</Text>
      </View>
      {foto.envio === 'pendente' && (
        <View style={estilos.selo}>
          <Icon source="cloud-upload-outline" size={16} color={cor.branco} />
        </View>
      )}
      {foto.envio === 'erro' && (
        <View style={[estilos.selo, { backgroundColor: cor.erro }]}>
          <Icon source="alert" size={15} color={cor.branco} />
        </View>
      )}
    </Pressable>
  );
}

export function SecaoFotos({
  ordemId,
  secao,
  fotos,
  proximoPasso,
  onAbrir,
  onErro,
}: {
  ordemId: string;
  secao: Secao;
  fotos: Foto[];
  // Dourado só na seção que o técnico precisa preencher agora.
  proximoPasso: boolean;
  onAbrir: (indice: number) => void;
  onErro: (mensagem: string) => void;
}) {
  const { width } = useWindowDimensions();
  const lado = (width - MARGEM * 2 - ESPACO * (COLUNAS - 1)) / COLUNAS;
  const { rotulo, vazio } = TEXTOS[secao];

  const adicionar = useMutation({
    mutationFn: (origem: Origem) => adicionarFotos(ordemId, secao, origem),
    onError: (erro) =>
      onErro(erro instanceof FotoGrandeDemais ? erro.message : 'Não foi possível guardar a foto no aparelho. Tente de novo.'),
  });
  // Compactar leva cerca de um segundo por foto: o botão tocado mostra que está trabalhando.
  const carregando = (origem: Origem) => adicionar.isPending && adicionar.variables === origem;

  return (
    <View style={estilos.secao}>
      <View style={estilos.cabecalho}>
        <Placa style={estilos.placa} linhas={[{ rotulo, total: fotos.length }]} />
        {fotos.length === 0 && (
          <Text variant="bodyMedium" style={estilos.vazio}>
            {vazio}
          </Text>
        )}
      </View>

      {fotos.length > 0 && (
        <View style={estilos.grade}>
          {fotos.map((foto, indice) => (
            <Miniatura key={foto.id} foto={foto} lado={lado} onPress={() => onAbrir(indice)} />
          ))}
        </View>
      )}

      <View style={estilos.acoes}>
        <Button
          mode="contained"
          icon="camera-outline"
          buttonColor={proximoPasso ? cor.dourado : undefined}
          textColor={proximoPasso ? cor.sobreDourado : undefined}
          onPress={() => adicionar.mutate('camera')}
          loading={carregando('camera')}
          disabled={adicionar.isPending}
          style={estilos.acao}
          contentStyle={estilos.acaoConteudo}
          accessibilityLabel={`Tirar foto de ${rotulo.toLowerCase()}`}
        >
          Câmera
        </Button>
        <Button
          mode="outlined"
          icon="image-multiple-outline"
          onPress={() => adicionar.mutate('galeria')}
          loading={carregando('galeria')}
          disabled={adicionar.isPending}
          style={estilos.acao}
          contentStyle={estilos.acaoConteudo}
          accessibilityLabel={`Escolher fotos de ${rotulo.toLowerCase()} na galeria`}
        >
          Galeria
        </Button>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: { backgroundColor: cor.superficie, padding: MARGEM, gap: 14, marginTop: 8 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placa: { minWidth: 118 },
  vazio: { flex: 1, color: cor.textoSuave },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO },
  imagem: { flex: 1, backgroundColor: cor.fundo },
  carimbo: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,38,95,0.82)',
  },
  carimboTexto: {
    fontFamily: familia.extra,
    fontSize: 12,
    lineHeight: 17,
    color: cor.dourado,
    fontVariant: ['tabular-nums'],
  },
  selo: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cor.marinho,
  },
  acoes: { flexDirection: 'row', gap: 12 },
  acao: { flex: 1 },
  acaoConteudo: { height: 48 },
});
