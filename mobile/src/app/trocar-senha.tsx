import { useMutation } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, mensagemDoErro } from '../api';
import { sessao, useSessao } from '../sessao';
import { cor } from '../tema';

const MINIMO = 8;
const ALTURA_BARRA_ANDROID = 56;

export default function TrocarSenha() {
  const insets = useSafeAreaInsets();
  const obrigatoria = useSessao()?.trocarSenha ?? false;
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [verSenhas, setVerSenhas] = useState(false);
  const [tentou, setTentou] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => {
      // Lido antes de gravar: a sessão nova já não pede a troca.
      const eraObrigatoria = sessao.get()?.trocarSenha;
      await sessao.definir(await api.trocarSenha(atual, nova));
      if (eraObrigatoria) router.replace('/');
      else router.back();
    },
  });

  const novaCurta = nova.length < MINIMO;
  const enviar = () => {
    setTentou(true);
    if (atual && !novaCurta) salvar.mutate();
  };

  const olho = (
    <TextInput.Icon
      icon={verSenhas ? 'eye-off-outline' : 'eye-outline'}
      accessibilityLabel={verSenhas ? 'Esconder senhas' : 'Mostrar senhas'}
      onPress={() => setVerSenhas((v) => !v)}
    />
  );

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={insets.top + ALTURA_BARRA_ANDROID}
      style={estilos.tela}
    >
      <Stack.Screen options={{ title: obrigatoria ? 'Escolha sua senha' : 'Trocar senha' }} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.conteudo}>
        {obrigatoria && (
          <Text variant="bodyLarge" style={estilos.aviso}>
            Você entrou com a senha padrão. Escolha uma só sua para continuar.
          </Text>
        )}

        <View>
          <TextInput
            label={obrigatoria ? 'Senha padrão' : 'Senha atual'}
            accessibilityLabel={obrigatoria ? 'Senha padrão' : 'Senha atual'}
            mode="outlined"
            value={atual}
            onChangeText={setAtual}
            secureTextEntry={!verSenhas}
            autoCapitalize="none"
            autoComplete="current-password"
            error={tentou && !atual}
            right={olho}
          />
          <HelperText type="error" visible={tentou && !atual}>
            Informe a senha que você usou para entrar.
          </HelperText>
        </View>

        <View>
          <TextInput
            label="Nova senha"
            accessibilityLabel="Nova senha"
            mode="outlined"
            value={nova}
            onChangeText={setNova}
            secureTextEntry={!verSenhas}
            autoCapitalize="none"
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={enviar}
            error={tentou && novaCurta}
          />
          <HelperText type={tentou && novaCurta ? 'error' : 'info'} visible>
            Ao menos {MINIMO} caracteres.
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
          disabled={salvar.isPending}
          contentStyle={estilos.botao}
        >
          Salvar senha
        </Button>
        {obrigatoria && (
          <Button mode="text" onPress={() => void sessao.sair()} contentStyle={estilos.botaoSair}>
            Sair
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.superficie },
  conteudo: { padding: 16, gap: 8 },
  aviso: { marginBottom: 8 },
  erro: { color: cor.erro },
  rodape: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cor.filete,
    backgroundColor: cor.superficie,
  },
  botao: { height: 52 },
  botaoSair: { height: 48 },
});
