import { useMutation } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvisoSync } from '../../../componentes/AvisoSync';
import { EstadoVazio } from '../../../componentes/EstadoVazio';
import { BotaoIcone } from '../../../componentes/BotaoIcone';
import { BotaoRelatorio } from '../../../componentes/BotaoRelatorio';
import { Dado } from '../../../componentes/Dado';
import { SecaoFotos } from '../../../componentes/SecaoFotos';
import { VisualizadorFotos } from '../../../componentes/VisualizadorFotos';
import { mensagemDoErro } from '../../../api';
import { excluirOrdem, useOrdens } from '../../../ordens';
import { useSessao } from '../../../sessao';
import { ErroApi, formatarData, type Secao } from '../../../sync/regras';
import { cor } from '../../../tema';

// O header nativo tem uma linha só: largura média de uma letra e o espaço ocupado pelos botões.
const LARGURA_LETRA_CABECALHO = 10.5;
const BOTOES_CABECALHO = 128;
// Cerca de 3 linhas: observação longa não pode empurrar as fotos para fora da tela.
const OBSERVACAO_CURTA = 130;

function Observacoes({ texto }: { texto: string }) {
  const [inteira, setInteira] = useState(false);
  const longa = texto.length > OBSERVACAO_CURTA || texto.split('\n').length > 3;
  return (
    <>
      <Dado icone="note-text-outline" rotulo="Observações" valor={texto} linhas={longa && !inteira ? 3 : undefined} />
      {longa && (
        <Button
          mode="text"
          compact
          onPress={() => setInteira((v) => !v)}
          style={estilos.verTudo}
          contentStyle={estilos.verTudoConteudo}
        >
          {inteira ? 'Ver menos' : 'Ver tudo'}
        </Button>
      )}
    </>
  );
}

export default function TelaOrdem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const { ordens, consulta } = useOrdens();
  const papel = useSessao()?.papel;
  const [aberta, setAberta] = useState<{ secao: Secao; indice: number } | null>(null);
  const [erro, setErro] = useState('');

  const ordem = ordens.find((o) => o.id === id);
  const fotosAntes = ordem?.fotos.filter((f) => f.secao === 'antes') ?? [];
  const fotosDepois = ordem?.fotos.filter((f) => f.secao === 'depois') ?? [];
  const fotosAbertas = aberta?.secao === 'antes' ? fotosAntes : fotosDepois;

  const excluir = useMutation({
    mutationFn: () => excluirOrdem(id),
    onSuccess: () => router.back(),
    onError: (e) => setErro(e instanceof ErroApi || e.message.includes('fila') ? e.message : mensagemDoErro(e)),
  });

  const confirmarExclusao = () => {
    const total = fotosAntes.length + fotosDepois.length;
    Alert.alert(
      `Excluir a OS de ${ordem?.cliente}?`,
      `A OS e ${total === 0 ? 'os dados dela' : total === 1 ? 'a foto' : `as ${total} fotos`} somem de vez, inclusive do armazenamento. Precisa de internet.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => excluir.mutate() },
      ],
    );
  };

  if (!ordem) {
    return (
      <>
        <Stack.Screen options={{ title: 'Ordem de serviço' }} />
        {consulta.isLoading ? (
          <ActivityIndicator style={estilos.carregando} size="large" color={cor.realce} />
        ) : (
          <EstadoVazio titulo="OS não encontrada" texto="Ela pode ter ficado fora das 200 mais recentes." />
        )}
      </>
    );
  }

  return (
    <View style={estilos.tela}>
      <Stack.Screen
        options={{
          title: ordem.cliente,
          headerRight: () => (
            <View style={estilos.acoes}>
              <BotaoIcone icone="pencil-outline" rotulo="Editar OS" onPress={() => router.push(`/ordens/${ordem.id}/editar`)} />
              {papel === 'gestor' && <BotaoIcone icone="trash-can-outline" rotulo="Excluir OS" onPress={confirmarExclusao} />}
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <AvisoSync ordemId={ordem.id} />

        <View style={estilos.dados}>
          {ordem.cliente.length * LARGURA_LETRA_CABECALHO * fontScale > width - BOTOES_CABECALHO && (
            <Dado icone="account-outline" rotulo="Cliente" valor={ordem.cliente} />
          )}
          <Dado icone="calendar-clock-outline" rotulo="Aberta em" valor={formatarData(ordem.abertaEm)} />
          <Dado icone="account-group-outline" rotulo="Responsáveis" valor={ordem.responsaveis.join(', ')} />
          {!!ordem.observacoes && <Observacoes texto={ordem.observacoes} />}
          {papel === 'gestor' && <BotaoRelatorio ordem={ordem} onErro={setErro} />}
        </View>

        <SecaoFotos
          ordemId={ordem.id}
          secao="antes"
          fotos={fotosAntes}
          proximoPasso={fotosAntes.length === 0}
          onAbrir={(indice) => setAberta({ secao: 'antes', indice })}
          onErro={setErro}
        />
        <SecaoFotos
          ordemId={ordem.id}
          secao="depois"
          fotos={fotosDepois}
          proximoPasso={fotosAntes.length > 0 && fotosDepois.length === 0}
          onAbrir={(indice) => setAberta({ secao: 'depois', indice })}
          onErro={setErro}
        />
      </ScrollView>

      {aberta && fotosAbertas.length > 0 && (
        <VisualizadorFotos fotos={fotosAbertas} indiceInicial={aberta.indice} onFechar={() => setAberta(null)} />
      )}

      <Snackbar visible={!!erro} onDismiss={() => setErro('')} duration={5000}>
        {erro}
      </Snackbar>
    </View>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row' },
  tela: { flex: 1, backgroundColor: cor.fundo },
  carregando: { marginTop: 56 },
  dados: { backgroundColor: cor.superficie, paddingHorizontal: 16, paddingVertical: 6 },
  verTudo: { alignSelf: 'flex-start', marginLeft: 28 },
  verTudoConteudo: { height: 48 },
});
