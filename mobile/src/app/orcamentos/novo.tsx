import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { FormOrcamento } from '../../componentes/FormOrcamento';
import { useOrcamentos } from '../../orcamentos';
import { cor } from '../../tema';
import { numeroDoOrcamento } from '../../valores';

// Duplicar abre esta tela com ?base=<id>: o novo começa com a cópia do outro, ainda sem número.
export default function NovoOrcamento() {
  const { base } = useLocalSearchParams<{ base?: string }>();
  const orcamentos = useOrcamentos();
  const modelo = base ? orcamentos.data?.find((o) => o.id === base) : undefined;

  if (base && !modelo && orcamentos.isLoading) return <ActivityIndicator style={estilos.carregando} size="large" color={cor.realce} />;
  return (
    <>
      {modelo && <Stack.Screen options={{ title: `Cópia do ${numeroDoOrcamento(modelo.numero)}` }} />}
      <FormOrcamento modelo={modelo} />
    </>
  );
}

const estilos = StyleSheet.create({ carregando: { marginTop: 56 } });
