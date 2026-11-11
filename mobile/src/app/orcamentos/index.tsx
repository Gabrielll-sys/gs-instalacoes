import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, FAB, Searchbar, Text, TouchableRipple } from 'react-native-paper';
import type { Orcamento } from '../../api';
import { BarraGestor, useBaseDoFab } from '../../componentes/BarraGestor';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { useOrcamentos } from '../../orcamentos';
import { cor, familia, temaFab } from '../../tema';
import { filtrarOrcamentos, formatarDia, formatarMoeda, numeroDoOrcamento } from '../../valores';

function LinhaOrcamento({ orcamento }: { orcamento: Orcamento }) {
  const numero = numeroDoOrcamento(orcamento.numero);
  const total = formatarMoeda(orcamento.total);
  const dia = formatarDia(orcamento.criadoEm);
  return (
    <TouchableRipple
      onPress={() => router.push(`/orcamentos/${orcamento.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Orçamento ${numero}, ${orcamento.clienteNome}, ${total}, emitido em ${dia}`}
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
        <Text style={estilos.valor}>{total}</Text>
      </View>
    </TouchableRipple>
  );
}

export default function Orcamentos() {
  const baseDoFab = useBaseDoFab();
  const orcamentos = useOrcamentos();
  const [busca, setBusca] = useState('');
  const [puxando, setPuxando] = useState(false);

  const visiveis = useMemo(() => filtrarOrcamentos(orcamentos.data ?? [], busca), [orcamentos.data, busca]);

  const atualizar = async () => {
    setPuxando(true);
    await orcamentos.refetch();
    setPuxando(false);
  };

  const vazio = () => {
    if (orcamentos.isLoading) return <ActivityIndicator style={estilos.carregando} size="large" color={cor.marinho} />;
    if (orcamentos.isError)
      return (
        <EstadoVazio titulo="Não foi possível carregar os orçamentos" texto="Clientes e orçamentos precisam de internet.">
          <Button mode="outlined" contentStyle={estilos.botaoTentar} onPress={() => void orcamentos.refetch()}>
            Tentar de novo
          </Button>
        </EstadoVazio>
      );
    if (busca) return <EstadoVazio titulo="Nenhum orçamento encontrado" texto="Busque pelo nome do cliente ou pelo número." />;
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
        ListEmptyComponent={vazio()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: baseDoFab + 80 }}
        refreshControl={
          <RefreshControl refreshing={puxando} onRefresh={() => void atualizar()} colors={[cor.marinho]} tintColor={cor.marinho} />
        }
      />
      <FAB
        icon="plus"
        label="Novo orçamento"
        color={cor.marinho}
        theme={temaFab}
        onPress={() => router.push('/orcamentos/novo')}
        style={[estilos.fab, { bottom: baseDoFab }]}
      />
      <BarraGestor />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.branco },
  faixa: { backgroundColor: cor.marinho, paddingHorizontal: 16, paddingBottom: 16 },
  busca: { backgroundColor: cor.branco, borderRadius: 28 },
  buscaTexto: { fontSize: 16 },
  carregando: { marginTop: 56 },
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
  valor: { fontFamily: familia.extra, fontSize: 17, lineHeight: 22, color: cor.marinho, fontVariant: ['tabular-nums'] },
  botaoTentar: { height: 48 },
  fab: { position: 'absolute', right: 16, backgroundColor: cor.dourado },
});
