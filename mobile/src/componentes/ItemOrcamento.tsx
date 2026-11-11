import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, HelperText, IconButton, Text, TextInput } from 'react-native-paper';
import { cor } from '../tema';
import { arrumarPreco, centavosDoItem, formatarCentavos, lerNumero, problemaNoItem, UNIDADES, type ItemDigitado, type Linha } from '../valores';

// Uma linha do orçamento: material, quantidade, unidade e preço, com o total da linha ou o erro dela.
export function ItemOrcamento({
  item,
  indice,
  quantos,
  tentou,
  aoMudar,
  aoMover,
  aoRemover,
}: {
  item: Linha;
  indice: number;
  quantos: number;
  tentou: boolean;
  aoMudar: (campo: keyof ItemDigitado, valor: string) => void;
  aoMover: (para: number) => void;
  aoRemover: () => void;
}) {
  // Com o campo Un. em foco, as unidades mais usadas aparecem logo abaixo para um toque.
  const [escolhendoUnidade, setEscolhendoUnidade] = useState(false);
  const problema = tentou ? problemaNoItem(item) : null;
  const quantidade = lerNumero(item.quantidade);
  const preco = lerNumero(item.preco);
  const total = quantidade !== null && preco !== null ? formatarCentavos(centavosDoItem(quantidade, preco)) : '';
  const erro = (campo: keyof ItemDigitado) => problema?.campo === campo;
  const n = indice + 1;

  return (
    <View style={estilos.item}>
      <View style={estilos.topo}>
        <Text variant="labelLarge" style={[estilos.suave, estilos.expande]}>
          Item {n}
        </Text>
        <IconButton icon="arrow-up" iconColor={cor.textoSuave} disabled={indice === 0} onPress={() => aoMover(indice - 1)} accessibilityLabel={`Subir item ${n}`} style={estilos.acao} />
        <IconButton
          icon="arrow-down"
          iconColor={cor.textoSuave}
          disabled={indice === quantos - 1}
          onPress={() => aoMover(indice + 1)}
          accessibilityLabel={`Descer item ${n}`}
          style={estilos.acao}
        />
        {quantos > 1 && (
          <IconButton icon="trash-can-outline" iconColor={cor.textoSuave} onPress={aoRemover} accessibilityLabel={`Remover item ${n}`} style={estilos.acao} />
        )}
      </View>
      <TextInput
        label="Material"
        accessibilityLabel={`Material do item ${n}`}
        mode="outlined"
        value={item.descricao}
        onChangeText={(v) => aoMudar('descricao', v)}
        maxLength={200}
        error={erro('descricao')}
      />
      <View style={estilos.numeros}>
        <TextInput
          label="Qtd."
          accessibilityLabel={`Quantidade do item ${n}`}
          mode="outlined"
          value={item.quantidade}
          onChangeText={(v) => aoMudar('quantidade', v)}
          keyboardType="decimal-pad"
          style={estilos.quantidade}
          error={erro('quantidade')}
        />
        <TextInput
          label="Un."
          accessibilityLabel={`Unidade do item ${n}`}
          mode="outlined"
          value={item.unidade}
          onChangeText={(v) => aoMudar('unidade', v)}
          onFocus={() => setEscolhendoUnidade(true)}
          onBlur={() => setEscolhendoUnidade(false)}
          maxLength={10}
          autoCapitalize="none"
          style={estilos.unidade}
          error={erro('unidade')}
        />
        <TextInput
          label="Preço unit."
          accessibilityLabel={`Preço unitário do item ${n}`}
          mode="outlined"
          value={item.preco}
          onChangeText={(v) => aoMudar('preco', v)}
          onBlur={() => aoMudar('preco', arrumarPreco(item.preco))}
          keyboardType="decimal-pad"
          left={<TextInput.Affix text="R$" />}
          style={estilos.preco}
          error={erro('preco')}
        />
      </View>
      {escolhendoUnidade && (
        <ScrollView horizontal keyboardShouldPersistTaps="always" contentContainerStyle={estilos.unidades} accessibilityLabel="Unidades mais usadas">
          {UNIDADES.map((u) => (
            <Chip key={u} compact mode="outlined" selected={item.unidade === u} showSelectedCheck={false} onPress={() => aoMudar('unidade', u)}>
              {u}
            </Chip>
          ))}
        </ScrollView>
      )}
      {problema ? (
        <HelperText type="error" visible style={estilos.semRecuo}>
          {problema.mensagem}
        </HelperText>
      ) : (
        <Text variant="bodyMedium" style={[estilos.suave, estilos.total]}>
          {total && `Total do item: ${total}`}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  item: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cor.filete },
  topo: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  expande: { flex: 1 },
  acao: { margin: 0 },
  suave: { color: cor.textoSuave },
  numeros: { flexDirection: 'row', gap: 8 },
  quantidade: { flex: 1 },
  unidade: { width: 76 },
  preco: { flex: 1.6 },
  unidades: { gap: 8, paddingVertical: 2 },
  semRecuo: { paddingHorizontal: 0 },
  total: { textAlign: 'right', fontVariant: ['tabular-nums'], minHeight: 20 },
});
