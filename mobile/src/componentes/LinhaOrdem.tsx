import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import { contarFotos, descreverFila, formatarData, type Ordem } from '../sync/regras';
import { cor } from '../tema';
import { Placa } from './Placa';

export const LinhaOrdem = memo(function LinhaOrdem({ ordem }: { ordem: Ordem }) {
  const antes = contarFotos(ordem, 'antes');
  const depois = contarFotos(ordem, 'depois');
  const data = formatarData(ordem.abertaEm);
  const responsaveis = ordem.responsaveis.join(', ');
  const naFila = descreverFila(ordem.fotosNaFila ?? 0, ordem.alteracoesNaFila ?? 0);

  return (
    <TouchableRipple
      onPress={() => router.push(`/ordens/${ordem.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${ordem.cliente}, aberta em ${data}, responsáveis ${responsaveis}, ${antes} fotos de antes e ${depois} de depois${naFila ? `, na fila de envio: ${naFila}` : ''}`}
      style={estilos.toque}
    >
      <View style={estilos.linha}>
        <View style={estilos.info}>
          <Text variant="titleMedium" numberOfLines={2}>
            {ordem.cliente}
          </Text>
          <Text variant="bodyMedium" style={estilos.suave}>
            {data}
          </Text>
          <Text variant="bodyMedium" style={estilos.suave} numberOfLines={1}>
            {responsaveis}
          </Text>
          {!!naFila && (
            <View style={estilos.fila}>
              <Icon source="cloud-upload-outline" size={16} color={cor.atencao} />
              <Text variant="labelSmall" style={estilos.filaTexto}>
                {naFila} na fila
              </Text>
            </View>
          )}
        </View>
        <Placa
          style={estilos.placa}
          linhas={[
            { rotulo: 'ANTES', total: antes },
            { rotulo: 'DEPOIS', total: depois },
          ]}
        />
      </View>
    </TouchableRipple>
  );
});

const estilos = StyleSheet.create({
  toque: { backgroundColor: cor.superficie, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cor.filete },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  info: { flex: 1, minWidth: 0 },
  suave: { color: cor.textoSuave },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  filaTexto: { color: cor.atencao },
  placa: { minWidth: 118 },
});
