import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { cor, familia } from '../tema';

function Numero({ valor }: { valor: number }) {
  const [destaque] = useState(() => new Animated.Value(0));
  const anterior = useRef(valor);
  const movimentoReduzido = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduzido) => {
      movimentoReduzido.current = reduzido;
    });
  }, []);

  // Layout effect: o número já nasce dourado no primeiro quadro, sem piscar em branco antes.
  useLayoutEffect(() => {
    const primeiraFoto = anterior.current === 0 && valor > 0;
    anterior.current = valor;
    if (!primeiraFoto || movimentoReduzido.current) return;
    destaque.setValue(1);
    Animated.sequence([
      // A saída exponencial some quase toda em 90ms; sem segurar, o destaque vira um lampejo.
      Animated.delay(150),
      Animated.timing(destaque, { toValue: 0, duration: 300, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start();
  }, [destaque, valor]);

  return (
    <View>
      <Text style={estilos.numero}>{valor}</Text>
      <Animated.Text style={[estilos.numero, estilos.numeroDestaque, { opacity: destaque }]}>{valor}</Animated.Text>
    </View>
  );
}

export function Placa({
  linhas,
  style,
}: {
  linhas: { rotulo: string; total: number }[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[estilos.placa, style]}>
      <View style={estilos.filete}>
        {linhas.map(({ rotulo, total }) => (
          <View key={rotulo} style={estilos.linha}>
            <Text variant="labelMedium" style={estilos.legenda}>
              {rotulo}
            </Text>
            <View style={estilos.valor}>
              {total === 0 && <View style={estilos.losango} />}
              <Numero valor={total} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  placa: { backgroundColor: cor.marinho, borderRadius: 9, padding: 3 },
  filete: { borderWidth: 1.5, borderColor: cor.branco, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  legenda: { color: cor.branco },
  valor: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  losango: { width: 9, height: 9, backgroundColor: cor.dourado, transform: [{ rotate: '45deg' }] },
  numero: {
    fontFamily: familia.black,
    fontSize: 16,
    lineHeight: 21,
    color: cor.branco,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  numeroDestaque: { position: 'absolute', right: 0, color: cor.dourado },
});
