import { useMutation } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, usePreventRemove, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Snackbar, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, mensagemDoErro, type Cliente, type DadosCliente } from '../../api';
import { BotaoIcone } from '../../componentes/BotaoIcone';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { recarregarClientes, useClientes } from '../../orcamentos';
import { mascararDocumento, mascararTelefone } from '../../valores';
import { cor } from '../../tema';

const ALTURA_BARRA_ANDROID = 56;
const VAZIO: DadosCliente = { nome: '', telefone: '', email: '', documento: '', endereco: '' };
const CAMPOS = Object.keys(VAZIO) as (keyof DadosCliente)[];
const copiar = (origem: DadosCliente, mudar = (v: string) => v) =>
  Object.fromEntries(CAMPOS.map((k) => [k, mudar(origem[k])])) as DadosCliente;

function FormCliente({ cliente, voltarPara }: { cliente?: Cliente; voltarPara?: string }) {
  const insets = useSafeAreaInsets();
  const inicial = cliente ?? VAZIO;
  const [dados, setDados] = useState(() => copiar(inicial));
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState('');

  const campo = (nome: keyof DadosCliente) => ({ value: dados[nome], onChangeText: (valor: string) => setDados((d) => ({ ...d, [nome]: valor })) });
  const limpo = copiar(dados, (v) => v.trim());

  const salvar = useMutation({
    mutationFn: () => (cliente ? api.salvarCliente(cliente.id, limpo) : api.criarCliente(limpo)),
    onSuccess: async (salvo) => {
      await recarregarClientes();
      // Aberto de um orçamento: volta para ele já com o cliente novo escolhido.
      if (!cliente && voltarPara) router.dismissTo(`${voltarPara}?clienteNovo=${salvo.id}` as Href);
      else router.back();
    },
    onError: () => setSaindo(false),
  });

  const excluir = useMutation({
    mutationFn: () => api.excluirCliente(cliente!.id),
    onSuccess: async () => {
      await recarregarClientes();
      router.back();
    },
    onError: (e) => {
      setSaindo(false);
      setErro(mensagemDoErro(e));
    },
  });

  const alterado = CAMPOS.some((k) => dados[k] !== inicial[k]);

  usePreventRemove(alterado && !saindo, ({ repeat }) => {
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

  const semNome = !limpo.nome;
  const emailInvalido = !!limpo.email && !limpo.email.includes('@');

  const enviar = () => {
    setTentou(true);
    if (semNome || emailInvalido) return;
    setSaindo(true);
    salvar.mutate();
  };

  const confirmarExclusao = () =>
    Alert.alert(`Excluir ${cliente!.nome}?`, 'O cadastro some da lista. Cliente com orçamento não pode ser excluído.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          setSaindo(true);
          excluir.mutate();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={insets.top + ALTURA_BARRA_ANDROID} style={estilos.tela}>
      {cliente && (
        <Stack.Screen options={{ headerRight: () => <BotaoIcone icone="trash-can-outline" rotulo="Excluir cliente" onPress={confirmarExclusao} /> }} />
      )}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.conteudo}>
        <View>
          <TextInput
            label="Nome"
            accessibilityLabel="Nome"
            mode="outlined"
            {...campo('nome')}
            maxLength={200}
            autoCapitalize="words"
            error={tentou && semNome}
          />
          <HelperText type={tentou && semNome ? 'error' : 'info'} visible>
            {tentou && semNome ? 'Informe o nome do cliente.' : 'Pessoa ou empresa, como vai aparecer no orçamento.'}
          </HelperText>
        </View>

        <TextInput
          label="Telefone"
          accessibilityLabel="Telefone"
          mode="outlined"
          {...campo('telefone')}
          onBlur={() => setDados((d) => ({ ...d, telefone: mascararTelefone(d.telefone) }))}
          maxLength={30}
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        <View>
          <TextInput
            label="E-mail"
            accessibilityLabel="E-mail"
            mode="outlined"
            {...campo('email')}
            maxLength={200}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            error={tentou && emailInvalido}
          />
          {tentou && emailInvalido && (
            <HelperText type="error" visible>
              Confira o e-mail.
            </HelperText>
          )}
        </View>

        <TextInput label="CPF ou CNPJ" accessibilityLabel="CPF ou CNPJ" mode="outlined" {...campo('documento')}
          onBlur={() => setDados((d) => ({ ...d, documento: mascararDocumento(d.documento) }))}
          maxLength={20}
        />

        <View>
          <TextInput
            label="Endereço"
            accessibilityLabel="Endereço"
            mode="outlined"
            {...campo('endereco')}
            maxLength={500}
            multiline
            style={estilos.endereco}
          />
          <HelperText type="info" visible>
            Rua, número, complemento, bairro, cidade e CEP, do jeito que deve sair no orçamento.
          </HelperText>
        </View>

        {salvar.isError && (
          <Text variant="bodyMedium" style={estilos.erro} accessibilityLiveRegion="polite">
            {mensagemDoErro(salvar.error)}
          </Text>
        )}
      </ScrollView>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          mode="contained"
          buttonColor={cor.dourado}
          textColor={cor.sobreDourado}
          onPress={enviar}
          loading={salvar.isPending}
          disabled={salvar.isPending || excluir.isPending}
          contentStyle={estilos.botao}
        >
          {cliente ? 'Salvar' : 'Cadastrar cliente'}
        </Button>
      </View>

      <Snackbar visible={!!erro} onDismiss={() => setErro('')} duration={5000}>
        {erro}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

export default function TelaCliente() {
  const { id, voltarPara } = useLocalSearchParams<{ id?: string; voltarPara?: string }>();
  const clientes = useClientes();
  const cliente = clientes.data?.find((c) => c.id === id);

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Editar cliente' : 'Novo cliente' }} />
      {id && !cliente ? (
        <EstadoVazio titulo="Cliente não encontrado" texto="Volte e atualize a lista de clientes." />
      ) : (
        <FormCliente cliente={cliente} voltarPara={voltarPara} />
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.superficie },
  conteudo: { padding: 16, gap: 8 },
  endereco: { minHeight: 96 },
  erro: { color: cor.erro },
  rodape: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cor.filete,
    backgroundColor: cor.superficie,
  },
  botao: { height: 52 },
});
