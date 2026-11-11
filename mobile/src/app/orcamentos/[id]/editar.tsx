import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { EstadoVazio } from '../../../componentes/EstadoVazio';
import { FormOrcamento } from '../../../componentes/FormOrcamento';
import { useOrcamentos } from '../../../orcamentos';
import { cor } from '../../../tema';

export default function EditarOrcamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orcamentos = useOrcamentos();
  const orcamento = orcamentos.data?.find((o) => o.id === id);

  if (orcamento) return <FormOrcamento orcamento={orcamento} />;
  if (orcamentos.isLoading) return <ActivityIndicator style={estilos.carregando} size="large" color={cor.marinho} />;
  return <EstadoVazio titulo="Orçamento não encontrado" texto="Volte e atualize a lista de orçamentos." />;
}

const estilos = StyleSheet.create({ carregando: { marginTop: 56 } });
