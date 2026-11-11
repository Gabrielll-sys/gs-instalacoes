import { StyleSheet, View } from 'react-native';
import { Button, Chip } from 'react-native-paper';
import { cor } from '../tema';

// O chip tem 42dp; somado a isto chega aos 48dp mínimos do Android.
const ALCANCE_CHIP = { top: 3, bottom: 3 };

// Filtros com contagem, abaixo da busca: o escolhido fica preenchido em marinho.
export function Filtros<T extends string>({
  opcoes,
  valor,
  aoMudar,
}: {
  opcoes: { valor: T; rotulo: string; total: string }[];
  valor: T;
  aoMudar: (valor: T) => void;
}) {
  return (
    <View style={estilos.filtros}>
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <Chip
            key={opcao.valor}
            mode="outlined"
            compact
            selected={ativo}
            showSelectedCheck={false}
            hitSlop={ALCANCE_CHIP}
            onPress={() => aoMudar(opcao.valor)}
            style={[estilos.filtro, ativo && estilos.filtroAtivo]}
            textStyle={ativo ? estilos.filtroAtivoTexto : estilos.filtroTexto}
            accessibilityState={{ selected: ativo }}
          >
            {`${opcao.rotulo} ${opcao.total}`}
          </Chip>
        );
      })}
    </View>
  );
}

// Linhas azuladas no formato da lista enquanto ela carrega; com placa só na lista de OS.
export function Esqueleto({ placa = false }: { placa?: boolean }) {
  return (
    <View accessibilityLabel="Carregando" accessible>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={estilos.esqueleto}>
          <View style={estilos.barras}>
            <View style={[estilos.barra, { width: '70%', height: 18 }]} />
            <View style={[estilos.barra, { width: '50%' }]} />
          </View>
          {placa && <View style={estilos.placa} />}
        </View>
      ))}
    </View>
  );
}

// Aparece quando a lista veio cheia: pode haver mais no servidor.
export function MostrarMais({ cheia, carregando, aoPedir }: { cheia: boolean; carregando: boolean; aoPedir: () => void }) {
  if (!cheia) return null;
  return (
    <View style={estilos.mais}>
      <Button mode="outlined" onPress={aoPedir} loading={carregando} disabled={carregando} contentStyle={estilos.botao}>
        Mostrar mais
      </Button>
    </View>
  );
}

const estilos = StyleSheet.create({
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
    backgroundColor: cor.branco,
  },
  filtro: { backgroundColor: cor.branco },
  filtroAtivo: { backgroundColor: cor.marinho, borderColor: cor.marinho },
  filtroTexto: { marginVertical: 10, fontVariant: ['tabular-nums'] },
  filtroAtivoTexto: { color: cor.branco, marginVertical: 10, fontVariant: ['tabular-nums'] },
  esqueleto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
  },
  barras: { flex: 1, gap: 8 },
  barra: { height: 12, borderRadius: 4, backgroundColor: cor.fundo },
  placa: { width: 118, height: 56, borderRadius: 9, backgroundColor: cor.fundo },
  mais: { alignItems: 'center', padding: 16 },
  botao: { height: 48 },
});
