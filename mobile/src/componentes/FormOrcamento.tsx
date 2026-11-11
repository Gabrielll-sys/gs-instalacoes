import { useMutation } from '@tanstack/react-query';
import { router, useFocusEffect, usePreventRemove } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, mensagemDoErro, type DadosOrcamento, type Orcamento } from '../api';
import { recarregarOrcamentos, useClientes, usarClienteCriado } from '../orcamentos';
import { cor, familia } from '../tema';
import {
  buscarClientes,
  centavosDoItem,
  centavosDoTotal,
  formatarCentavos,
  lerNumero,
  paraCampo,
  precoParaCampo,
  problemaNoItem,
  type ItemDigitado,
} from '../valores';

const ALTURA_BARRA_ANDROID = 56;
const MAX_ITENS = 100;
const OPCOES_VISIVEIS = 5;

type Linha = ItemDigitado & { chave: number };
let proximaChave = 0;
const novaLinha = (item?: ItemDigitado): Linha => ({
  chave: proximaChave++,
  ...(item ?? { descricao: '', quantidade: '1', unidade: 'un', preco: '' }),
});

function SeletorCliente({ onEscolher }: { onEscolher: (id: string) => void }) {
  const clientes = useClientes();
  const [busca, setBusca] = useState('');

  if (clientes.isLoading) return <ActivityIndicator style={estilos.carregando} color={cor.marinho} />;
  if (clientes.isError)
    return (
      <View style={estilos.aviso}>
        <Text variant="bodyMedium" style={estilos.suave}>
          Não foi possível carregar os clientes. Confira a internet.
        </Text>
        <Button mode="outlined" onPress={() => void clientes.refetch()} contentStyle={estilos.botaoMedio}>
          Tentar de novo
        </Button>
      </View>
    );

  const todos = clientes.data ?? [];
  const encontrados = buscarClientes(todos, busca);
  return (
    <View>
      {todos.length > 0 && (
        <TextInput
          label="Buscar cliente"
          accessibilityLabel="Buscar cliente"
          mode="outlined"
          value={busca}
          onChangeText={setBusca}
          left={<TextInput.Icon icon="magnify" />}
        />
      )}
      <View accessibilityRole="list">
        {encontrados.slice(0, OPCOES_VISIVEIS).map((cliente) => (
          <TouchableRipple
            key={cliente.id}
            onPress={() => onEscolher(cliente.id)}
            accessibilityRole="button"
            accessibilityLabel={`Escolher ${cliente.nome}`}
            style={estilos.opcao}
          >
            <View>
              <Text variant="bodyLarge">{cliente.nome}</Text>
              {!!cliente.telefone && (
                <Text variant="bodyMedium" style={estilos.suave}>
                  {cliente.telefone}
                </Text>
              )}
            </View>
          </TouchableRipple>
        ))}
      </View>
      <Text variant="bodyMedium" style={[estilos.suave, estilos.dicaBusca]}>
        {todos.length === 0
          ? 'Nenhum cliente cadastrado ainda.'
          : encontrados.length === 0
            ? 'Nenhum cliente com essa busca.'
            : encontrados.length > OPCOES_VISIVEIS
              ? `Mais ${encontrados.length - OPCOES_VISIVEIS} na lista: refine a busca.`
              : ''}
      </Text>
      <Button mode="text" icon="plus" onPress={() => router.push({ pathname: '/clientes/cliente', params: { escolher: '1' } })} style={estilos.alinhaInicio} contentStyle={estilos.botaoMedio}>
        Cadastrar cliente
      </Button>
    </View>
  );
}

export function FormOrcamento({ orcamento }: { orcamento?: Orcamento }) {
  const insets = useSafeAreaInsets();
  const clientes = useClientes();
  const [clienteId, setClienteId] = useState(orcamento?.clienteId ?? '');
  const [itens, setItens] = useState<Linha[]>(() =>
    orcamento
      ? orcamento.itens.map((i) =>
          novaLinha({ descricao: i.descricao, quantidade: paraCampo(i.quantidade), unidade: i.unidade, preco: precoParaCampo(i.precoUnitario) }),
        )
      : [novaLinha()],
  );
  const [pagamento, setPagamento] = useState(orcamento?.pagamento ?? '');
  const [prazo, setPrazo] = useState(orcamento?.prazo ?? '');
  const [observacoes, setObservacoes] = useState(orcamento?.observacoes ?? '');
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const criado = usarClienteCriado();
      if (criado) setClienteId(criado);
    }, []),
  );

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

  usePreventRemove(retrato !== inicial && !saindo, ({ repeat }) => {
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
  const nomeEscolhido = escolhido?.nome ?? (clienteId === orcamento?.clienteId ? orcamento.clienteNome : '');
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
          <SeletorCliente onEscolher={setClienteId} />
        )}
        {tentou && !clienteId && (
          <HelperText type="error" visible style={estilos.semRecuo}>
            Escolha o cliente.
          </HelperText>
        )}

        <Text variant="titleMedium" style={[estilos.secao, estilos.secaoSeguinte]} accessibilityRole="header">
          Itens
        </Text>
        {itens.map((item, i) => {
          const problema = tentou ? problemaNoItem(item) : null;
          const quantidade = lerNumero(item.quantidade);
          const preco = lerNumero(item.preco);
          const totalItem = quantidade !== null && preco !== null ? formatarCentavos(centavosDoItem(quantidade, preco)) : '';
          return (
            <View key={item.chave} style={estilos.item}>
              <View style={estilos.itemTopo}>
                <Text variant="labelLarge" style={estilos.suave}>
                  Item {i + 1}
                </Text>
                {itens.length > 1 && (
                  <IconButton
                    icon="trash-can-outline"
                    iconColor={cor.textoSuave}
                    onPress={() => setItens((lista) => lista.filter((l) => l.chave !== item.chave))}
                    accessibilityLabel={`Remover item ${i + 1}`}
                    style={estilos.remover}
                  />
                )}
              </View>
              <TextInput
                label="Material"
                accessibilityLabel={`Material do item ${i + 1}`}
                mode="outlined"
                value={item.descricao}
                onChangeText={(v) => mudarItem(item.chave, 'descricao', v)}
                maxLength={200}
                error={!!problema && !item.descricao.trim()}
              />
              <View style={estilos.numeros}>
                <TextInput
                  label="Qtd."
                  accessibilityLabel={`Quantidade do item ${i + 1}`}
                  mode="outlined"
                  value={item.quantidade}
                  onChangeText={(v) => mudarItem(item.chave, 'quantidade', v)}
                  keyboardType="decimal-pad"
                  style={estilos.quantidade}
                  error={!!problema && problema.includes('quantidade')}
                />
                <TextInput
                  label="Un."
                  accessibilityLabel={`Unidade do item ${i + 1}`}
                  mode="outlined"
                  value={item.unidade}
                  onChangeText={(v) => mudarItem(item.chave, 'unidade', v)}
                  maxLength={10}
                  autoCapitalize="none"
                  style={estilos.unidade}
                  error={!!problema && problema.includes('unidade')}
                />
                <TextInput
                  label="Preço unit."
                  accessibilityLabel={`Preço unitário do item ${i + 1}`}
                  mode="outlined"
                  value={item.preco}
                  onChangeText={(v) => mudarItem(item.chave, 'preco', v)}
                  keyboardType="decimal-pad"
                  left={<TextInput.Affix text="R$" />}
                  style={estilos.preco}
                  error={!!problema && problema.includes('preço')}
                />
              </View>
              {problema ? (
                <HelperText type="error" visible style={estilos.semRecuo}>
                  {problema}
                </HelperText>
              ) : (
                <Text variant="bodyMedium" style={[estilos.suave, estilos.totalItem]}>
                  {totalItem && `Total do item: ${totalItem}`}
                </Text>
              )}
            </View>
          );
        })}
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
          textColor={cor.marinho}
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
  tela: { flex: 1, backgroundColor: cor.branco },
  conteudo: { padding: 16, gap: 8, paddingBottom: 32 },
  carregando: { marginVertical: 16 },
  secao: { color: cor.marinho },
  secaoSeguinte: { marginTop: 20 },
  expande: { flex: 1 },
  suave: { color: cor.textoSuave },
  semRecuo: { paddingHorizontal: 0 },
  aviso: { gap: 8, alignItems: 'flex-start' },
  alinhaInicio: { alignSelf: 'flex-start' },
  botaoMedio: { height: 48 },
  opcao: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
  },
  dicaBusca: { marginTop: 8 },
  escolhido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 14,
    borderRadius: 3,
    backgroundColor: cor.fundo,
  },
  item: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cor.filete },
  itemTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  remover: { margin: 0 },
  numeros: { flexDirection: 'row', gap: 8 },
  quantidade: { flex: 1 },
  unidade: { width: 76 },
  preco: { flex: 1.6 },
  totalItem: { textAlign: 'right', fontVariant: ['tabular-nums'], minHeight: 20 },
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
    backgroundColor: cor.branco,
  },
  totalValor: { fontFamily: familia.black, fontSize: 22, lineHeight: 28, color: cor.marinho, fontVariant: ['tabular-nums'] },
  botao: { height: 52, paddingHorizontal: 8 },
});
