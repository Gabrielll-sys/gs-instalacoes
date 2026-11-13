import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, FAB, Searchbar, Text, TouchableRipple } from 'react-native-paper';
import type { Orcamento } from '../../api';
import { BarraGestor, useBaseDoFab } from '../../componentes/BarraGestor';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { Esqueleto, Filtros, MostrarMais } from '../../componentes/Listas';
import { Selo } from '../../componentes/Selo';
import { useBuscaCompleta } from '../../buscaCompleta';
import { mostrarMais, useOrcamentos } from '../../orcamentos';
import { cor, familia, temaFab } from '../../tema';
import { filtrarOrcamentos, formatarDia, formatarMoeda, numeroDoOrcamento, rotuloDaSituacao, SITUACOES, type Situacao } from '../../valores';

function LinhaOrcamento({ orcamento }: { orcamento: Orcamento }) {
  const numero = numeroDoOrcamento(orcamento.numero);
  const total = formatarMoeda(orcamento.total);
  const dia = formatarDia(orcamento.criadoEm);
  return (
    <TouchableRipple
      onPress={() => router.push(`/orcamentos/${orcamento.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Orçamento ${numero}, ${orcamento.clienteNome}, ${total}, ${rotuloDaSituacao(orcamento.situacao)}, emitido em ${dia}`}
      style={estilos.linha}
    >
      <View style={estilos.linhaConteudo}>
        <View style={estilos.expande}>
          <Text variant="titleMedium" numberOfLines={2}>
            {orcamento.clienteNome}
          </Text>
          <Text variant="bodyMedium" style={[estilos.suave, estilos.tabular]}>
            Nº {numero} – {dia}
          </Text>
        </View>
        <View style={estilos.direita}>
          <Text style={estilos.valor}>{total}</Text>
          <Selo situacao={orcamento.situacao} />
        </View>
      </View>
    </TouchableRipple>
  );
}

export default function Orcamentos() {
  const baseDoFab = useBaseDoFab();
  const orcamentos = useOrcamentos();
  const [busca, setBusca] = useState('');
  const [puxando, setPuxando] = useState(false);

  const [situacao, setSituacao] = useState<Situacao | 'todas'>('todas');
  const carregados = useMemo(() => orcamentos.data ?? [], [orcamentos.data]);
  const { itens: lista, cheia, buscando } = useBuscaCompleta('orcamentos', carregados, busca);
  const visiveis = useMemo(() => filtrarOrcamentos(lista, busca, situacao), [lista, busca, situacao]);
  // Contagens seguem a busca, como nas OS, para baterem com a lista.
  const filtros = [{ valor: 'todas' as const, rotulo: 'Todos' }, ...SITUACOES].map((f) => ({
    ...f,
    total: `${filtrarOrcamentos(lista, busca, f.valor).length}${cheia ? '+' : ''}`,
  }));

  const atualizar = async () => {
    setPuxando(true);
    await orcamentos.refetch();
    setPuxando(false);
  };

  const vazio = () => {
    if (orcamentos.isLoading) return <Esqueleto />;
    if (orcamentos.isError)
      return (
        <EstadoVazio titulo="Não foi possível carregar os orçamentos" texto="Clientes e orçamentos precisam de internet.">
          <Button mode="outlined" contentStyle={estilos.botaoTentar} onPress={() => void orcamentos.refetch()}>
            Tentar de novo
          </Button>
        </EstadoVazio>
      );
    if (busca || situacao !== 'todas')
      return <EstadoVazio titulo="Nenhum orçamento encontrado" texto="Busque pelo nome do cliente ou pelo número, ou mude o filtro." />;
    return <EstadoVazio titulo="Nenhum orçamento ainda" texto="Toque em Novo orçamento para montar o primeiro." />;
  };

  return (
    <View style={estilos.tela}>
      <View style={estilos.faixa}>
        <Searchbar
          placeholder="Buscar cliente ou número"
          accessibilityLabel="Buscar orçamento"
          clearAccessibilityLabel="Limpar busca"
          value={busca}
          onChangeText={setBusca}
          style={estilos.busca}
          inputStyle={estilos.buscaTexto}
          elevation={0}
        />
      </View>
      <FlatList
        data={visiveis}
        keyExtractor={(orcamento) => orcamento.id}
        renderItem={({ item }) => <LinhaOrcamento orcamento={item} />}
        ListHeaderComponent={
          <>
            <Filtros opcoes={filtros} valor={situacao} aoMudar={setSituacao} />
            {buscando && (
              <Text variant="bodyMedium" style={estilos.buscando} accessibilityLiveRegion="polite">
                Buscando em todos os orçamentos…
              </Text>
            )}
          </>
        }
        ListEmptyComponent={vazio()}
        ListFooterComponent={
          orcamentos.isLoading ? undefined : <MostrarMais cheia={cheia} carregando={orcamentos.isFetching} aoPedir={() => void mostrarMais('orcamentos')} />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: baseDoFab + 80 }}
        refreshControl={
          <RefreshControl refreshing={puxando} onRefresh={() => void atualizar()} colors={[cor.realce]} tintColor={cor.realce} />
        }
      />
      <FAB
        icon="plus"
        label="Novo orçamento"
        color={cor.sobreDourado}
        theme={temaFab}
        onPress={() => router.push('/orcamentos/novo')}
        style={[estilos.fab, { bottom: baseDoFab }]}
      />
      <BarraGestor />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.superficie },
  faixa: { backgroundColor: cor.marinho, paddingHorizontal: 16, paddingBottom: 16 },
  busca: { backgroundColor: cor.superficie, borderRadius: 28 },
  buscaTexto: { fontSize: 16 },
  linha: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
  },
  linhaConteudo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expande: { flex: 1 },
  suave: { color: cor.textoSuave },
  tabular: { fontVariant: ['tabular-nums'] },
  buscando: { color: cor.textoSuave, paddingHorizontal: 16, paddingVertical: 8 },
  direita: { alignItems: 'flex-end', gap: 4 },
  valor: { fontFamily: familia.extra, fontSize: 17, lineHeight: 22, color: cor.realce, fontVariant: ['tabular-nums'] },
  botaoTentar: { height: 48 },
  fab: { position: 'absolute', right: 16, backgroundColor: cor.dourado },
});
