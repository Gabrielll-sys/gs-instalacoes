import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams, usePathname, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, mensagemDoErro, type DadosOrcamento, type Orcamento } from '../api';
import { recarregarOrcamentos, useClientes } from '../orcamentos';
import { cor, familia } from '../tema';
import { centavosDoTotal, formatarCentavos, lerNumero, linhaDoItem, moverItem, novaLinha, problemaNoItem, type ItemDigitado, type Linha } from '../valores';
import { ItemOrcamento } from './ItemOrcamento';
import { SeletorCliente } from './SeletorCliente';

const ALTURA_BARRA_ANDROID = 56;
const MAX_ITENS = 100;

// `modelo` preenche um orçamento novo a partir de outro (Duplicar); `orcamento` edita o próprio.
export function FormOrcamento({ orcamento, modelo }: { orcamento?: Orcamento; modelo?: Orcamento }) {
  const insets = useSafeAreaInsets();
  const caminho = usePathname();
  const clientes = useClientes();
  const origem = orcamento ?? modelo;
  const [clienteId, setClienteId] = useState(origem?.clienteId ?? '');
  const [itens, setItens] = useState<Linha[]>(() => (origem ? origem.itens.map(linhaDoItem) : [novaLinha()]));
  const [pagamento, setPagamento] = useState(origem?.pagamento ?? '');
  const [prazo, setPrazo] = useState(origem?.prazo ?? '');
  const [observacoes, setObservacoes] = useState(origem?.observacoes ?? '');
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);

  // O cadastro de cliente aberto daqui volta com o id do cliente novo nos parâmetros desta tela.
  // Ajustado durante a renderização, quando o parâmetro muda, para não pintar a tela sem o cliente antes.
  const { clienteNovo } = useLocalSearchParams<{ clienteNovo?: string }>();
  const [clienteNovoVisto, setClienteNovoVisto] = useState(clienteNovo);
  if (clienteNovo && clienteNovo !== clienteNovoVisto) {
    setClienteNovoVisto(clienteNovo);
    setClienteId(clienteNovo);
  }

  const retrato = JSON.stringify([clienteId, itens.map((i) => [i.descricao, i.quantidade, i.unidade, i.preco]), pagamento, prazo, observacoes]);
  const [inicial] = useState(retrato);

  const dados = (): DadosOrcamento => ({
    clienteId,
    itens: itens.map((i) => ({
      descricao: i.descricao.trim(),
      quantidade: lerNumero(i.quantidade)!,
      unidade: i.unidade.trim(),
      precoUnitario: lerNumero(i.preco)!,
    })),
    pagamento: pagamento.trim(),
    prazo: prazo.trim(),
    observacoes: observacoes.trim(),
  });

  const salvar = useMutation({
    mutationFn: () => (orcamento ? api.salvarOrcamento(orcamento.id, dados()) : api.criarOrcamento(dados())),
    onSuccess: async (salvo) => {
      await recarregarOrcamentos();
      // Depois de criar, a tela do orçamento é onde se gera o PDF.
      if (orcamento) router.back();
      else router.replace(`/orcamentos/${salvo.id}`);
    },
    onError: () => setSaindo(false),
  });

  // A cópia ainda não existe no servidor: sair dela sem salvar também pergunta.
  usePreventRemove((retrato !== inicial || !!modelo) && !saindo, ({ repeat }) => {
    Alert.alert('Descartar o que foi preenchido?', 'As alterações desta tela ainda não foram salvas.', [
      { text: 'Continuar editando', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          setSaindo(true);
          repeat();
        },
      },
    ]);
  });

  const mudarItem = (chave: number, campo: keyof ItemDigitado, valor: string) =>
    setItens((lista) => lista.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)));

  const escolhido = clientes.data?.find((c) => c.id === clienteId);
  // Antes de a lista chegar, o nome que veio com o orçamento basta para mostrar quem é.
  const nomeEscolhido = escolhido?.nome ?? (clienteId === origem?.clienteId ? origem.clienteNome : '');
  const temProblema = !clienteId || itens.some((i) => problemaNoItem(i));

  const enviar = () => {
    setTentou(true);
    if (temProblema) return;
    setSaindo(true);
    salvar.mutate();
  };

  const total = formatarCentavos(centavosDoTotal(itens));

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={insets.top + ALTURA_BARRA_ANDROID} style={estilos.tela}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.conteudo}>
        <Text variant="titleMedium" style={estilos.secao} accessibilityRole="header">
          Cliente
        </Text>
        {clienteId ? (
          <View style={estilos.escolhido}>
            <View style={estilos.expande}>
              <Text variant="bodyLarge">{nomeEscolhido}</Text>
              {!!escolhido?.telefone && (
                <Text variant="bodyMedium" style={estilos.suave}>
                  {escolhido.telefone}
                </Text>
              )}
            </View>
            <Button mode="text" onPress={() => setClienteId('')} contentStyle={estilos.botaoMedio} accessibilityLabel={`Trocar o cliente ${nomeEscolhido}`}>
              Trocar
            </Button>
          </View>
        ) : (
          <SeletorCliente onEscolher={setClienteId} voltarPara={caminho} />
        )}
        {tentou && !clienteId && (
          <HelperText type="error" visible style={estilos.semRecuo}>
            Escolha o cliente.
          </HelperText>
        )}

        <Text variant="titleMedium" style={[estilos.secao, estilos.secaoSeguinte]} accessibilityRole="header">
          Itens
        </Text>
        {itens.map((item, i) => (
          <ItemOrcamento
            key={item.chave}
            item={item}
            indice={i}
            quantos={itens.length}
            tentou={tentou}
            aoMudar={(campo, valor) => mudarItem(item.chave, campo, valor)}
            aoMover={(para) => setItens((lista) => moverItem(lista, i, para))}
            aoRemover={() => setItens((lista) => lista.filter((l) => l.chave !== item.chave))}
          />
        ))}
        {itens.length < MAX_ITENS && (
          <Button
            mode="outlined"
            icon="plus"
            onPress={() => setItens((lista) => [...lista, novaLinha()])}
            contentStyle={estilos.botaoMedio}
            style={estilos.adicionar}
          >
            Adicionar item
          </Button>
        )}

        <Text variant="titleMedium" style={[estilos.secao, estilos.secaoSeguinte]} accessibilityRole="header">
          Condições
        </Text>
        <TextInput
          label="Forma de pagamento"
          accessibilityLabel="Forma de pagamento"
          mode="outlined"
          value={pagamento}
          onChangeText={setPagamento}
          placeholder="Ex.: PIX à vista ou cartão em até 3x"
          maxLength={500}
          multiline
        />
        <TextInput
          label="Prazo de execução"
          accessibilityLabel="Prazo de execução"
          mode="outlined"
          value={prazo}
          onChangeText={setPrazo}
          placeholder="Ex.: até 5 dias úteis após a aprovação"
          maxLength={500}
          multiline
        />
        <TextInput
          label="Observações"
          accessibilityLabel="Observações"
          mode="outlined"
          value={observacoes}
          onChangeText={setObservacoes}
          maxLength={5000}
          multiline
          style={estilos.observacoes}
        />

        {tentou && temProblema && (
          <Text variant="bodyMedium" style={estilos.erro} accessibilityLiveRegion="polite">
            Confira os campos marcados em vermelho.
          </Text>
        )}
        {salvar.isError && (
          <Text variant="bodyMedium" style={estilos.erro} accessibilityLiveRegion="polite">
            {mensagemDoErro(salvar.error)}
          </Text>
        )}
      </ScrollView>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + 12 }]}>
        <View style={estilos.expande} accessible accessibilityLabel={`Total: ${total}`}>
          <Text variant="labelSmall" style={estilos.suave}>
            Total
          </Text>
          <Text style={estilos.totalValor} numberOfLines={1} adjustsFontSizeToFit>
            {total}
          </Text>
        </View>
        <Button
          mode="contained"
          buttonColor={cor.dourado}
          textColor={cor.sobreDourado}
          onPress={enviar}
          loading={salvar.isPending}
          disabled={salvar.isPending}
          contentStyle={estilos.botao}
        >
          {orcamento ? 'Salvar' : 'Criar orçamento'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.superficie },
  conteudo: { padding: 16, gap: 8, paddingBottom: 32 },
  secao: { color: cor.realce },
  secaoSeguinte: { marginTop: 20 },
  expande: { flex: 1 },
  suave: { color: cor.textoSuave },
  semRecuo: { paddingHorizontal: 0 },
  botaoMedio: { height: 48 },
  escolhido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 14,
    borderRadius: 3,
    backgroundColor: cor.fundo,
  },
  adicionar: { marginTop: 4 },
  observacoes: { minHeight: 96 },
  erro: { color: cor.erro },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cor.filete,
    backgroundColor: cor.superficie,
  },
  totalValor: { fontFamily: familia.black, fontSize: 22, lineHeight: 28, color: cor.realce, fontVariant: ['tabular-nums'] },
  botao: { height: 52, paddingHorizontal: 8 },
});
