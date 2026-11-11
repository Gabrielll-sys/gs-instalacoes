import { router, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessao } from '../sessao';
import { cor } from '../tema';

const AREAS = [
  { rota: '/', rotulo: 'Ordens', icone: 'clipboard-text-outline' },
  { rota: '/orcamentos', rotulo: 'Orçamentos', icone: 'calculator-variant-outline' },
  { rota: '/clientes', rotulo: 'Clientes', icone: 'card-account-details-outline' },
  { rota: '/equipe', rotulo: 'Equipe', icone: 'account-group-outline' },
] as const;

const ALTURA = 64;

// Onde o FAB fica: acima da barra para o gestor, acima da borda do aparelho para o técnico.
export function useBaseDoFab() {
  const insets = useSafeAreaInsets();
  return (useSessao()?.papel === 'gestor' ? ALTURA : 0) + insets.bottom + 16;
}

// Barra de navegação do Material 3, só para o gestor: o técnico tem uma área só e não precisa dela.
// A pilha fica com no máximo duas telas: a lista de OS e a área aberta.
export function BarraGestor() {
  const insets = useSafeAreaInsets();
  const caminho = usePathname();
  if (useSessao()?.papel !== 'gestor') return null;

  const ir = (rota: (typeof AREAS)[number]['rota']) => {
    if (rota === caminho) return;
    if (rota === '/') router.dismissTo('/');
    else if (caminho === '/') router.push(rota);
    else router.replace(rota);
  };

  return (
    <View style={[estilos.barra, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {AREAS.map(({ rota, rotulo, icone }) => {
        const ativa = rota === caminho;
        return (
          <TouchableRipple
            key={rota}
            onPress={() => ir(rota)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            accessibilityLabel={rotulo}
            style={estilos.item}
          >
            <View style={estilos.centro}>
              <View style={[estilos.indicador, ativa && estilos.indicadorAtivo]}>
                <Icon source={icone} size={24} color={ativa ? cor.marinho : cor.textoSuave} />
              </View>
              <Text variant="labelMedium" style={ativa ? estilos.rotuloAtivo : estilos.rotulo}>
                {rotulo}
              </Text>
            </View>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: cor.branco,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cor.filete,
  },
  item: { flex: 1, height: ALTURA, justifyContent: 'center' },
  centro: { alignItems: 'center', gap: 2 },
  indicador: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  indicadorAtivo: { backgroundColor: cor.envioFundo },
  rotulo: { color: cor.textoSuave },
  rotuloAtivo: { color: cor.marinho },
});
