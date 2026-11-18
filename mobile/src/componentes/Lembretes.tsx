import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Icon, Text, TouchableRipple } from 'react-native-paper';
import { api, mensagemDoErro } from '../api';
import { recarregarLembretes, useLembretes } from '../orcamentos';
import { useSessao } from '../sessao';
import { cor } from '../tema';
import { formatarDia, numeroDoOrcamento } from '../valores';

// Orçamentos finalizados há 6 meses: aparece só para o gestor, até ele marcar que já agendou.
export function Lembretes() {
  const gestor = useSessao()?.papel === 'gestor';
  const { data: lembretes = [] } = useLembretes(gestor);
  const resolver = useMutation({ mutationFn: api.resolverLembrete, onSuccess: recarregarLembretes });
  if (!gestor || lembretes.length === 0) return null;

  return (
    <View style={estilos.caixa}>
      <View style={estilos.titulo}>
        <Icon source="calendar-alert-outline" size={20} color={cor.atencao} />
        <Text variant="titleSmall" style={estilos.tituloTexto} accessibilityRole="header">
          Agendar manutenção periódica
        </Text>
      </View>
      {lembretes.map((o) => {
        const texto = `Orçamento nº ${numeroDoOrcamento(o.numero)}, finalizado em ${formatarDia(o.finalizadoEm!)}`;
        return (
          <View key={o.id} style={estilos.linha}>
            <TouchableRipple
              onPress={() => router.push(`/orcamentos/${o.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${o.clienteNome}, ${texto}`}
              style={estilos.expande}
            >
              <View>
                <Text variant="titleSmall" numberOfLines={1}>
                  {o.clienteNome}
                </Text>
                <Text variant="bodySmall" style={estilos.suave}>
                  {texto}
                </Text>
              </View>
            </TouchableRipple>
            <Button mode="outlined" textColor={cor.realce} disabled={resolver.isPending} onPress={() => resolver.mutate(o.id)}>
              Já agendei
            </Button>
          </View>
        );
      })}
      {resolver.isError && <HelperText type="error">{mensagemDoErro(resolver.error)}</HelperText>}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: cor.atencaoFundo },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tituloTexto: { color: cor.atencao, fontWeight: '800' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 },
  expande: { flex: 1 },
  suave: { color: cor.textoSuave },
});
