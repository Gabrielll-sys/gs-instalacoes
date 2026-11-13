import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, FAB, Text, TouchableRipple } from 'react-native-paper';
import type { Conta } from '../../api';
import { BarraGestor, useBaseDoFab } from '../../componentes/BarraGestor';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { Esqueleto } from '../../componentes/Listas';
import { useContas } from '../../equipe';
import { cor, temaFab } from '../../tema';

const PAPEIS = { gestor: 'Gestor', tecnico: 'Técnico' };

function LinhaConta({ conta }: { conta: Conta }) {
  const situacao = !conta.ativo ? 'Desativada' : conta.trocarSenha ? 'Ainda usa a senha padrão' : '';
  return (
    <TouchableRipple
      onPress={() => router.push({ pathname: '/equipe/conta', params: { id: conta.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${conta.nome}, ${PAPEIS[conta.papel]}${situacao ? `, ${situacao}` : ''}. Editar conta`}
      style={estilos.linha}
    >
      <View>
        <Text variant="titleMedium" style={!conta.ativo && estilos.suave}>
          {conta.nome}
        </Text>
        <Text variant="bodyMedium" style={estilos.suave}>
          {PAPEIS[conta.papel]}, usuário {conta.login}
        </Text>
        {!!situacao && (
          <Text variant="labelSmall" style={conta.ativo ? estilos.atencao : estilos.suave}>
            {situacao}
          </Text>
        )}
      </View>
    </TouchableRipple>
  );
}

export default function Equipe() {
  const baseDoFab = useBaseDoFab();
  const contas = useContas();
  const [puxando, setPuxando] = useState(false);

  const atualizar = async () => {
    setPuxando(true);
    await contas.refetch();
    setPuxando(false);
  };

  if (contas.isLoading)
    return (
      <View style={estilos.tela}>
        <Esqueleto />
      </View>
    );

  return (
    <View style={estilos.tela}>
      <FlatList
        data={contas.data}
        keyExtractor={(conta) => conta.id}
        renderItem={({ item }) => <LinhaConta conta={item} />}
        ListFooterComponent={
          contas.data?.length && !contas.data.some((c) => c.papel === 'tecnico') ? (
            <Text variant="bodyMedium" style={estilos.dica}>
              Nenhum técnico cadastrado ainda. Toque em Nova conta para cadastrar quem vai a campo; são eles que aparecem como responsáveis na OS.
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          <EstadoVazio titulo="Não foi possível carregar a equipe" texto="Gerenciar contas precisa de internet.">
            <Button mode="outlined" contentStyle={estilos.botaoTentar} onPress={() => void contas.refetch()}>
              Tentar de novo
            </Button>
          </EstadoVazio>
        }
        contentContainerStyle={{ paddingBottom: baseDoFab + 80 }}
        refreshControl={
          <RefreshControl refreshing={puxando} onRefresh={() => void atualizar()} colors={[cor.realce]} tintColor={cor.realce} />
        }
      />
      <FAB
        icon="plus"
        label="Nova conta"
        color={cor.sobreDourado}
        theme={temaFab}
        onPress={() => router.push('/equipe/conta')}
        style={[estilos.fab, { bottom: baseDoFab }]}
      />
      <BarraGestor />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.superficie },
  linha: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
  },
  suave: { color: cor.textoSuave },
  dica: { color: cor.textoSuave, paddingHorizontal: 16, paddingVertical: 16 },
  atencao: { color: cor.atencao },
  botaoTentar: { height: 48 },
  fab: { position: 'absolute', right: 16, backgroundColor: cor.dourado },
});
