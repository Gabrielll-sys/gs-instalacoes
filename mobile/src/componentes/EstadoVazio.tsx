import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { cor } from '../tema';

export function EstadoVazio({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <View style={estilos.vazio}>
      <Text variant="titleLarge" style={estilos.centro}>
        {titulo}
      </Text>
      <Text variant="bodyLarge" style={[estilos.centro, estilos.texto]}>
        {texto}
      </Text>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  vazio: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 56, gap: 8 },
  centro: { textAlign: 'center' },
  texto: { color: cor.textoSuave, marginBottom: 8 },
});
