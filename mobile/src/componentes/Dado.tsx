import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { cor } from '../tema';

// Ícone marinho, rótulo pequeno e valor: o par de leitura das telas de OS e de orçamento.
export function Dado({
  icone,
  rotulo,
  valor,
  linhas,
}: {
  icone: ComponentProps<typeof Icon>['source'];
  rotulo: string;
  valor: string;
  linhas?: number;
}) {
  return (
    <View style={estilos.dado} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <View style={estilos.icone}>
        <Icon source={icone} size={22} color={cor.realce} />
      </View>
      <View style={estilos.expande}>
        <Text variant="labelSmall" style={estilos.suave}>
          {rotulo}
        </Text>
        <Text variant="bodyLarge" numberOfLines={linhas}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  dado: { flexDirection: 'row', gap: 14, paddingVertical: 10 },
  icone: { paddingTop: 2 },
  expande: { flex: 1 },
  suave: { color: cor.textoSuave },
});
