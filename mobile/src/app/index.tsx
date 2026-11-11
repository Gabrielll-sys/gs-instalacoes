import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Chip, FAB, Menu, Searchbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvisoSync } from '../componentes/AvisoSync';
import { BarraGestor, useBaseDoFab } from '../componentes/BarraGestor';
import { BotaoIcone } from '../componentes/BotaoIcone';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { LinhaOrdem } from '../componentes/LinhaOrdem';
import { useEquipe } from '../equipe';
import { useOrdens } from '../ordens';
import { sessao, useSessao } from '../sessao';
import { sincronizar } from '../sync/motor';
import { outbox } from '../sync/outbox';
import { filtrarOrdens, LIMITE_ORDENS, type Filtro } from '../sync/regras';
import { cor, temaFab } from '../tema';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'andamento', rotulo: 'Abertas' },
  { valor: 'concluidas', rotulo: 'Concluídas' },
];

// O chip tem 42dp; somado a isto chega aos 48dp mínimos do Android.
const ALCANCE_CHIP = { top: 3, bottom: 3 };

function MenuConta() {
  const [aberto, setAberto] = useState(false);
  const conta = useSessao();

  const irPara = (rota: '/trocar-senha') => {
    setAberto(false);
    router.push(rota);
  };

  const sair = () => {
    setAberto(false);
    const naFila = outbox.snapshot().filter((op) => op.estado !== 'feito').length;
    Alert.alert(
      'Sair da conta?',
      naFila > 0
        ? `${naFila === 1 ? '1 item continua' : `${naFila} itens continuam`} na fila e será enviado quando alguém entrar de novo.`
        : undefined,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: () => void sessao.sair() },
      ],
    );
  };

  return (
    <Menu
      visible={aberto}
      onDismiss={() => setAberto(false)}
      anchor={<BotaoIcone icone="account-circle-outline" rotulo="Conta" onPress={() => setAberto(true)} />}
    >
      <Text variant="titleMedium" style={estilos.nomeConta}>
        {conta?.nome}
      </Text>
      <Menu.Item title="Trocar senha" leadingIcon="lock-outline" onPress={() => irPara('/trocar-senha')} />
      <Menu.Item title="Sair" leadingIcon="logout" onPress={sair} />
    </Menu>
  );
}

function LinhaEsqueleto() {
  return (
    <View style={estilos.esqueleto}>
      <View style={estilos.expande}>
        <View style={[estilos.barra, { width: '70%', height: 18 }]} />
        <View style={[estilos.barra, { width: '50%' }]} />
        <View style={[estilos.barra, { width: '35%' }]} />
      </View>
      <View style={estilos.placaEsqueleto} />
    </View>
  );
}

export default function Lista() {
  const insets = useSafeAreaInsets();
  const baseDoFab = useBaseDoFab();
  const { ordens, consulta } = useOrdens();
  // Busca logo aqui para o seletor de responsáveis já estar guardado quando o técnico abrir uma OS sem internet.
  useEquipe();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [puxando, setPuxando] = useState(false);

  const visiveis = useMemo(() => filtrarOrdens(ordens, busca, filtro), [busca, filtro, ordens]);
  // O panorama que o dono quer ver sem abrir nenhuma OS; segue a busca para os números baterem com a lista.
  const contagens = useMemo(
    () => ({
      todas: filtrarOrdens(ordens, busca, 'todas').length,
      andamento: filtrarOrdens(ordens, busca, 'andamento').length,
      concluidas: filtrarOrdens(ordens, busca, 'concluidas').length,
    }),
    [busca, ordens],
  );

  const atualizar = async () => {
    setPuxando(true);
    void sincronizar();
    await consulta.refetch();
    setPuxando(false);
  };

  const vazio = () => {
    if (consulta.isLoading) {
      return (
        <>
          <LinhaEsqueleto />
          <LinhaEsqueleto />
          <LinhaEsqueleto />
          <LinhaEsqueleto />
        </>
      );
    }
    if (ordens.length > 0) {
      return <EstadoVazio titulo="Nenhuma OS encontrada" texto="Tente outro nome ou mude o filtro." />;
    }
    if (consulta.isError) {
      return (
        <EstadoVazio titulo="Não foi possível carregar as OS" texto="Confira a conexão e tente de novo.">
          <Button mode="outlined" contentStyle={estilos.botaoTentar} onPress={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </EstadoVazio>
      );
    }
    if (consulta.fetchStatus === 'paused') {
      return (
        <EstadoVazio
          titulo="Sem internet e sem OS guardadas"
          texto="Você pode abrir uma OS nova mesmo assim. Ela será enviada quando a conexão voltar."
        />
      );
    }
    return <EstadoVazio titulo="Nenhuma OS aberta ainda" texto="Ao chegar no cliente, toque em Nova OS." />;
  };

  return (
    <View style={estilos.tela}>
      <StatusBar style="light" />

      <View style={[estilos.cabecalho, { paddingTop: insets.top + 12 }]}>
        <View style={estilos.topo}>
          <Text variant="displaySmall" style={estilos.titulo} accessibilityRole="header">
            Ordens de serviço
          </Text>
          <MenuConta />
        </View>
        <Searchbar
          placeholder="Buscar cliente ou responsável"
          accessibilityLabel="Buscar cliente ou responsável"
          clearAccessibilityLabel="Limpar busca"
          value={busca}
          onChangeText={setBusca}
          style={estilos.busca}
          inputStyle={estilos.buscaTexto}
          elevation={0}
        />
      </View>

      <View style={estilos.filtros}>
        {FILTROS.map(({ valor, rotulo }) => {
          const ativo = filtro === valor;
          return (
            <Chip
              key={valor}
              mode="outlined"
              compact
              selected={ativo}
              showSelectedCheck={false}
              hitSlop={ALCANCE_CHIP}
              onPress={() => setFiltro(valor)}
              style={[estilos.filtro, ativo && estilos.filtroAtivo]}
              textStyle={ativo ? estilos.filtroAtivoTexto : estilos.filtroTexto}
              accessibilityState={{ selected: ativo }}
            >
              {`${rotulo} ${contagens[valor]}${ordens.length >= LIMITE_ORDENS ? '+' : ''}`}
            </Chip>
          );
        })}
      </View>

      <AvisoSync />

      <FlatList
        data={visiveis}
        keyExtractor={(ordem) => ordem.id}
        renderItem={({ item }) => <LinhaOrdem ordem={item} />}
        ListEmptyComponent={vazio}
        contentContainerStyle={{ paddingBottom: baseDoFab + 80 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={puxando} onRefresh={() => void atualizar()} colors={[cor.marinho]} tintColor={cor.marinho} />
        }
        style={estilos.lista}
      />

      <FAB
        icon="plus"
        label="Nova OS"
        color={cor.marinho}
        theme={temaFab}
        onPress={() => router.push('/ordens/nova')}
        style={[estilos.fab, { bottom: baseDoFab }]}
      />
      <BarraGestor />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.branco },
  cabecalho: { backgroundColor: cor.marinho, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titulo: { flex: 1, color: cor.branco },
  nomeConta: { paddingHorizontal: 16, paddingVertical: 10 },
  botaoTentar: { height: 48 },
  busca: { backgroundColor: cor.branco, borderRadius: 28 },
  buscaTexto: { fontSize: 16 },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
  },
  filtro: { backgroundColor: cor.branco },
  filtroAtivo: { backgroundColor: cor.marinho, borderColor: cor.marinho },
  filtroTexto: { marginVertical: 10, fontVariant: ['tabular-nums'] },
  filtroAtivoTexto: { color: cor.branco, marginVertical: 10, fontVariant: ['tabular-nums'] },
  lista: { flex: 1 },
  fab: { position: 'absolute', right: 16, backgroundColor: cor.dourado },
  expande: { flex: 1, gap: 8 },
  esqueleto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
  },
  barra: { height: 12, borderRadius: 4, backgroundColor: cor.fundo },
  placaEsqueleto: { width: 118, height: 56, borderRadius: 9, backgroundColor: cor.fundo },
});
