import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { useClientes } from '../orcamentos';
import { cor } from '../tema';
import { buscarClientes } from '../valores';

const OPCOES_VISIVEIS = 5;

// `voltarPara` é a tela do formulário: o cadastro volta para ela com o cliente novo já escolhido.
export function SeletorCliente({ onEscolher, voltarPara }: { onEscolher: (id: string) => void; voltarPara: string }) {
  const clientes = useClientes();
  const [busca, setBusca] = useState('');

  if (clientes.isLoading) return <ActivityIndicator style={estilos.carregando} color={cor.realce} />;
  if (clientes.isError)
    return (
      <View style={estilos.aviso}>
        <Text variant="bodyMedium" style={estilos.suave}>
          Não foi possível carregar os clientes. Confira a internet.
        </Text>
        <Button mode="outlined" onPress={() => void clientes.refetch()} contentStyle={estilos.botaoMedio}>
          Tentar de novo
        </Button>
      </View>
    );

  const todos = clientes.data ?? [];
  const encontrados = buscarClientes(todos, busca);
  return (
    <View>
      {todos.length > 0 && (
        <TextInput
          label="Buscar cliente"
          accessibilityLabel="Buscar cliente"
          mode="outlined"
          value={busca}
          onChangeText={setBusca}
          left={<TextInput.Icon icon="magnify" />}
        />
      )}
      <View accessibilityRole="list">
        {encontrados.slice(0, OPCOES_VISIVEIS).map((cliente) => (
          <TouchableRipple
            key={cliente.id}
            onPress={() => onEscolher(cliente.id)}
            accessibilityRole="button"
            accessibilityLabel={`Escolher ${cliente.nome}`}
            style={estilos.opcao}
          >
            <View>
              <Text variant="bodyLarge">{cliente.nome}</Text>
              {!!cliente.telefone && (
                <Text variant="bodyMedium" style={estilos.suave}>
                  {cliente.telefone}
                </Text>
              )}
            </View>
          </TouchableRipple>
        ))}
      </View>
      <Text variant="bodyMedium" style={[estilos.suave, estilos.dica]}>
        {todos.length === 0
          ? 'Nenhum cliente cadastrado ainda.'
          : encontrados.length === 0
            ? 'Nenhum cliente com essa busca.'
            : encontrados.length > OPCOES_VISIVEIS
              ? `Mais ${encontrados.length - OPCOES_VISIVEIS} na lista: refine a busca.`
              : ''}
      </Text>
      <Button
        mode="text"
        icon="plus"
        onPress={() => router.push({ pathname: '/clientes/cliente', params: { voltarPara } })}
        style={estilos.alinhaInicio}
        contentStyle={estilos.botaoMedio}
      >
        Cadastrar cliente
      </Button>
    </View>
  );
}

const estilos = StyleSheet.create({
  carregando: { marginVertical: 16 },
  suave: { color: cor.textoSuave },
  aviso: { gap: 8, alignItems: 'flex-start' },
  alinhaInicio: { alignSelf: 'flex-start' },
  botaoMedio: { height: 48 },
  opcao: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
  },
  dica: { marginTop: 8 },
});
