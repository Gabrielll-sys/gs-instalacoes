import { useState } from 'react';
import { Alert, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlatList, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { excluirFoto, tentarErrosDeNovo } from '../ordens';
import { formatarData, type Foto } from '../sync/regras';
import { cor } from '../tema';
import { BotaoIcone } from './BotaoIcone';
import { FotoAmpliavel } from './FotoAmpliavel';
import { TEXTOS } from './SecaoFotos';

export function VisualizadorFotos({
  fotos,
  indiceInicial,
  onFechar,
}: {
  fotos: Foto[];
  indiceInicial: number;
  onFechar: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [indice, setIndice] = useState(indiceInicial);
  const [ampliada, setAmpliada] = useState(false);
  // Depois de excluir a última, o índice antigo apontaria para fora da lista.
  const atual = Math.min(indice, fotos.length - 1);
  const foto = fotos[atual];
  if (!foto) return null;

  const confirmarExclusao = () =>
    Alert.alert('Excluir esta foto?', 'Ela sai da OS e do armazenamento. Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          // Era a última da seção: não sobra nada para mostrar.
          if (fotos.length === 1) onFechar();
          // A foto ampliada some; sem isto o deslize ficaria travado na próxima.
          setAmpliada(false);
          void excluirFoto(foto.ordemId, foto.id);
        },
      },
    ]);

  return (
    <Modal visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onFechar}>
      {/* No Android o Modal abre outra janela, que precisa da própria raiz de gestos. */}
      <GestureHandlerRootView style={estilos.tela}>
        <FlatList
          horizontal
          pagingEnabled
          scrollEnabled={!ampliada}
          data={fotos}
          keyExtractor={(f) => f.id}
          initialScrollIndex={atual}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <FotoAmpliavel
              id={item.id}
              url={item.url}
              rotulo={`Foto de ${TEXTOS[item.secao].rotulo.toLowerCase()}, adicionada em ${formatarData(item.criadaEm)}`}
              tela={{ largura: width, altura: height }}
              onTravarDeslize={setAmpliada}
            />
          )}
        />

        <View style={[estilos.topo, { paddingTop: insets.top + 4 }]}>
          <BotaoIcone icone="close" rotulo="Fechar" onPress={onFechar} />
          <Text variant="labelLarge" style={estilos.branco}>
            {atual + 1} de {fotos.length}
          </Text>
          <BotaoIcone icone="trash-can-outline" rotulo="Excluir foto" onPress={confirmarExclusao} />
        </View>

        {/* Ampliada, a legenda só atrapalharia a conferência da foto. */}
        <View
          pointerEvents={ampliada ? 'none' : 'auto'}
          style={[estilos.base, { paddingBottom: insets.bottom + 16, opacity: ampliada ? 0 : 1 }]}
        >
          <Text variant="titleMedium" style={estilos.branco}>
            {TEXTOS[foto.secao].rotulo}
          </Text>
          <Text variant="labelLarge" style={estilos.dourado}>
            Adicionada em {formatarData(foto.criadaEm)}
          </Text>
          {foto.envio === 'pendente' && (
            <Text variant="bodyMedium" style={estilos.situacao}>
              Aguardando envio. A foto está guardada no aparelho.
            </Text>
          )}
          {foto.envio === 'erro' && (
            <>
              <Text variant="bodyMedium" style={estilos.situacao}>
                Não foi enviada: {foto.erro}
              </Text>
              <Button
                mode="contained"
                buttonColor={cor.dourado}
                textColor={cor.sobreDourado}
                onPress={() => void tentarErrosDeNovo()}
                style={estilos.repetir}
                contentStyle={estilos.repetirConteudo}
              >
                Tentar de novo
              </Button>
            </>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000000' },
  topo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  branco: { color: cor.branco },
  dourado: { color: cor.dourado, fontVariant: ['tabular-nums'] },
  situacao: { color: cor.branco, marginTop: 4 },
  repetir: { marginTop: 10, alignSelf: 'flex-start' },
  repetirConteudo: { height: 48 },
});
