import { useMutation } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, mensagemDoErro, type Conta } from '../../api';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { recarregarEquipe, SENHA_PADRAO, useContas } from '../../equipe';
import type { Papel } from '../../sessao';
import { cor } from '../../tema';

const ALTURA_BARRA_ANDROID = 56;
// O chip tem 42dp; somado a isto chega aos 48dp mínimos do Android.
const ALCANCE_CHIP = { top: 3, bottom: 3 };
const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: 'tecnico', rotulo: 'Técnico' },
  { valor: 'gestor', rotulo: 'Gestor' },
];

function FormConta({ conta, unicoGestor }: { conta?: Conta; unicoGestor: boolean }) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState(conta?.nome ?? '');
  const [login, setLogin] = useState('');
  const [papel, setPapel] = useState<Papel>(conta?.papel ?? 'tecnico');
  const [ativo, setAtivo] = useState(conta?.ativo ?? true);
  const [redefinir, setRedefinir] = useState(false);
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!conta) {
        await api.criarConta({ login: login.trim(), nome: nome.trim(), papel });
        return;
      }
      await api.salvarConta(conta.id, { nome: nome.trim(), papel, ativo });
      if (redefinir) await api.redefinirSenha(conta.id);
    },
    onSuccess: async () => {
      await recarregarEquipe();
      router.back();
    },
    onError: () => setSaindo(false),
  });

  const alterado =
    nome !== (conta?.nome ?? '') ||
    login !== '' ||
    papel !== (conta?.papel ?? 'tecnico') ||
    ativo !== (conta?.ativo ?? true) ||
    redefinir;

  // repeat, e não dispatch da ação: no expo-router do SDK 58, a trava ainda ligada bloquearia a mesma ação de novo.
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

  const semNome = !nome.trim();
  const semLogin = !conta && !login.trim();

  const enviar = () => {
    setTentou(true);
    if (semNome || semLogin) return;
    setSaindo(true);
    salvar.mutate();
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={insets.top + ALTURA_BARRA_ANDROID}
      style={estilos.tela}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.conteudo}>
        <View>
          <TextInput
            label="Nome"
            accessibilityLabel="Nome"
            mode="outlined"
            value={nome}
            onChangeText={setNome}
            maxLength={100}
            autoCapitalize="words"
            error={tentou && semNome}
          />
          <HelperText type={tentou && semNome ? 'error' : 'info'} visible>
            {tentou && semNome ? 'Informe o nome.' : 'Aparece no relatório e, se for técnico, no seletor de responsáveis.'}
          </HelperText>
        </View>

        {conta ? (
          <View style={estilos.leitura}>
            <Text variant="labelSmall" style={estilos.suave}>
              Usuário
            </Text>
            <Text variant="bodyLarge">{conta.login}</Text>
          </View>
        ) : (
          <View>
            <TextInput
              label="Usuário"
              accessibilityLabel="Usuário"
              mode="outlined"
              value={login}
              onChangeText={setLogin}
              maxLength={50}
              autoCapitalize="none"
              autoCorrect={false}
              error={tentou && semLogin}
            />
            <HelperText type={tentou && semLogin ? 'error' : 'info'} visible>
              Usado para entrar. Sem espaços nem acentos, como ana.souza.
            </HelperText>
          </View>
        )}

        <Text variant="labelLarge" style={estilos.rotulo}>
          Papel
        </Text>
        <View style={estilos.papeis} accessibilityRole="radiogroup" accessibilityLabel="Papel">
          {PAPEIS.map(({ valor, rotulo }) => {
            const ativoPapel = papel === valor;
            return (
              <Chip
                key={valor}
                mode="outlined"
                compact
                selected={ativoPapel}
                showSelectedCheck={false}
                hitSlop={ALCANCE_CHIP}
                onPress={() => setPapel(valor)}
                disabled={unicoGestor}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativoPapel }}
                style={ativoPapel ? estilos.chipAtivo : estilos.chip}
                textStyle={ativoPapel ? estilos.chipAtivoTexto : estilos.chipTexto}
              >
                {rotulo}
              </Chip>
            );
          })}
        </View>
        <HelperText type="info" visible style={estilos.dicaPapel}>
          {unicoGestor
            ? 'Esta é a única conta de gestor, então continua gestor e ativa. Para cadastrar um técnico, volte e toque em Nova conta.'
            : 'Só o gestor gera relatórios e gerencia a equipe.'}
        </HelperText>

        {conta && (
          <View style={estilos.ativa}>
            <View style={estilos.expande}>
              <Text variant="labelLarge">Conta ativa</Text>
              <Text variant="bodyMedium" style={estilos.suave}>
                Desativada, a pessoa perde o acesso na hora e sai do seletor de responsáveis.
              </Text>
            </View>
            <Switch value={ativo} onValueChange={setAtivo} disabled={unicoGestor} accessibilityLabel="Conta ativa" />
          </View>
        )}

        {conta ? (
          <View style={estilos.ativa}>
            <View style={estilos.expande}>
              <Text variant="labelLarge">Voltar para a senha padrão</Text>
              <Text variant="bodyMedium" style={estilos.suave}>
                Para quem esqueceu a senha. Ela vira {SENHA_PADRAO}, e a pessoa escolhe outra no próximo acesso.
              </Text>
            </View>
            <Switch value={redefinir} onValueChange={setRedefinir} accessibilityLabel="Voltar para a senha padrão" />
          </View>
        ) : (
          <Text variant="bodyMedium" style={estilos.senhaPadrao}>
            A senha inicial é {SENHA_PADRAO}. A pessoa escolhe outra no primeiro acesso.
          </Text>
        )}

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
          textColor={cor.marinho}
          onPress={enviar}
          loading={salvar.isPending}
          disabled={salvar.isPending}
          contentStyle={estilos.botao}
        >
          {conta ? 'Salvar' : 'Criar conta'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function TelaConta() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const contas = useContas();
  const conta = contas.data?.find((c) => c.id === id);
  // Sem gestor ativo, ninguém mais gerenciaria a equipe: a API recusa, e a tela já nem oferece a troca.
  const unicoGestor =
    conta?.papel === 'gestor' && conta.ativo && !contas.data?.some((c) => c.id !== conta.id && c.papel === 'gestor' && c.ativo);

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Editar conta' : 'Nova conta' }} />
      {id && !conta ? <EstadoVazio titulo="Conta não encontrada" texto="Volte e atualize a lista da equipe." /> : <FormConta conta={conta} unicoGestor={unicoGestor} />}
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.branco },
  conteudo: { padding: 16, gap: 8 },
  expande: { flex: 1 },
  suave: { color: cor.textoSuave },
  leitura: { paddingBottom: 12 },
  rotulo: { marginTop: 4 },
  papeis: { flexDirection: 'row', gap: 8 },
  dicaPapel: { paddingHorizontal: 0 },
  chip: { backgroundColor: cor.branco },
  chipAtivo: { backgroundColor: cor.marinho, borderColor: cor.marinho },
  chipTexto: { marginVertical: 10 },
  chipAtivoTexto: { color: cor.branco, marginVertical: 10 },
  ativa: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  senhaPadrao: { marginTop: 8, color: cor.textoSuave },
  erro: { color: cor.erro },
  rodape: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cor.filete,
    backgroundColor: cor.branco,
  },
  botao: { height: 52 },
});
