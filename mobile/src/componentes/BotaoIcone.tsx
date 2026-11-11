import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, TouchableRipple } from 'react-native-paper';
import { cor } from '../tema';

export function BotaoIcone({
  icone,
  rotulo,
  onPress,
}: {
  icone: ComponentProps<typeof Icon>['source'];
  rotulo: string;
  onPress: () => void;
}) {
  return (
    <TouchableRipple
      borderless
      onPress={onPress}
      rippleColor="rgba(255,255,255,0.3)"
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={estilos.botao}
    >
      <View style={estilos.centro}>
        <Icon source={icone} size={24} color={cor.branco} />
      </View>
    </TouchableRipple>
  );
}

const estilos = StyleSheet.create({
  botao: { width: 48, height: 48, borderRadius: 24 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
