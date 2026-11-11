import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, FAB, Searchbar, Text, TouchableRipple } from 'react-native-paper';
import type { Cliente } from '../../api';
import { BarraGestor, useBaseDoFab } from '../../componentes/BarraGestor';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { useClientes } from '../../orcamentos';
import { buscarClientes } from '../../valores';
import { cor, temaFab } from '../../tema';

function LinhaCliente({ cliente }: { cliente: Cliente }) {
  const detalhe = [cliente.telefone, cliente.endereco].filter(Boolean).join(' – ');
  return (
    <TouchableRipple
      onPress={() => router.push({ pathname: '/clientes/cliente', params: { id: cliente.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${cliente.nome}${detalhe ? `, ${detalhe}` : ''}. Editar cliente`}
      style={estilos.linha}
    >
      <View>
        <Text variant="titleMedium" numberOfLines={2}>
          {cliente.nome}
        </Text>
        {!!detalhe && (
          <Text variant="bodyMedium" numberOfLines={1} style={estilos.suave}>
            {detalhe}
          </Text>
        )}
      </View>
    </TouchableRipple>
  );
}

export default function Clientes() {
  const baseDoFab = useBaseDoFab();
  const clientes = useClientes();
  const [busca, setBusca] = useState('');
  const [puxando, setPuxando] = useState(false);
  const visiveis = useMemo(() => buscarClientes(clientes.data ?? [], busca), [clientes.data, busca]);

  const atualizar = async () => {
    setPuxando(true);
    await clientes.refetch();
    setPuxando(false);
  };

  const vazio = () => {
    if (clientes.isLoading) return <ActivityIndicator style={estilos.carregando} size="large" color={cor.marinho} />;
    if (clientes.isError)
      return (
        <EstadoVazio titulo="Não foi possível carregar os clientes" texto="Clientes e orçamentos precisam de internet.">
          <Button mode="outlined" contentStyle={estilos.botaoTentar} onPress={() => void clientes.refetch()}>
            Tentar de novo
          </Button>
        </EstadoVazio>
      );
    if (busca) return <EstadoVazio titulo="Nenhum cliente encontrado" texto="Confira a busca ou cadastre o cliente." />;
    return <EstadoVazio titulo="Nenhum cliente cadastrado" texto="Toque em Novo cliente para cadastrar nome, telefone e endereço." />;
  };

  return (
    <View style={estilos.tela}>
      <View style={estilos.faixa}>
        <Searchbar
          placeholder="Buscar nome, telefone ou endereço"
          accessibilityLabel="Buscar cliente"
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
        keyExtractor={(cliente) => cliente.id}
        renderItem={({ item }) => <LinhaCliente cliente={item} />}
        ListEmptyComponent={vazio()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: baseDoFab + 80 }}
        refreshControl={
          <RefreshControl refreshing={puxando} onRefresh={() => void atualizar()} colors={[cor.marinho]} tintColor={cor.marinho} />
        }
      />
      <FAB
        icon="plus"
        label="Novo cliente"
        color={cor.marinho}
        theme={temaFab}
        onPress={() => router.push('/clientes/cliente')}
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
  suave: { color: cor.textoSuave },
  botaoTentar: { height: 48 },
  fab: { position: 'absolute', right: 16, backgroundColor: cor.dourado },
});
