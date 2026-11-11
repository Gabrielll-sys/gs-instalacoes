import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { sessao } from '../sessao';
import { ErroApi } from '../sync/regras';
import { cor } from '../tema';

function mensagemDeErro(erro: unknown) {
  if (!(erro instanceof ErroApi)) return 'Sem conexão com o servidor. O primeiro acesso precisa de internet.';
  if (erro.status === 401) return 'Usuário ou senha incorretos. Se não lembrar, peça ao gestor para redefinir.';
  if (erro.status === 429) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  return erro.message;
}

export default function Login() {
  const insets = useSafeAreaInsets();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [tentou, setTentou] = useState(false);

  const entrar = useMutation({
    mutationFn: async () => sessao.definir(await api.login(usuario.trim(), senha)),
  });

  const enviar = () => {
    setTentou(true);
    if (usuario.trim() && senha) entrar.mutate();
  };

  const aviso = sessao.aviso();
  const erro = entrar.isError ? mensagemDeErro(entrar.error) : aviso;

  return (
    <KeyboardAvoidingView behavior="padding" style={estilos.tela}>
      <ScrollView contentContainerStyle={estilos.rolagem} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[estilos.marca, { paddingTop: insets.top + 40 }]} accessibilityRole="header" accessibilityLabel="GS Instalações">
          <Image source={require('../../assets/logo-gs-carro.png')} contentFit="contain" style={estilos.carro} />
          <Image source={require('../../assets/logo-gs-nome.png')} contentFit="contain" style={estilos.nome} />
          <Text variant="bodyMedium" style={estilos.servicos}>
            Wallbox, Padrão 220V e Manutenções
          </Text>
        </View>

        <View style={[estilos.painel, { paddingBottom: insets.bottom + 24 }]}>
          <View>
            <TextInput
              label="Usuário"
              accessibilityLabel="Usuário"
              mode="outlined"
              value={usuario}
              onChangeText={setUsuario}
              maxLength={50}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="next"
              error={tentou && !usuario.trim()}
            />
            <HelperText type="error" visible={tentou && !usuario.trim()}>
              Informe seu usuário.
            </HelperText>
          </View>

          <View>
            <TextInput
              label="Senha"
              accessibilityLabel="Senha"
              mode="outlined"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!verSenha}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={enviar}
              error={tentou && !senha}
              right={
                <TextInput.Icon
                  icon={verSenha ? 'eye-off-outline' : 'eye-outline'}
                  accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'}
                  onPress={() => setVerSenha((v) => !v)}
                />
              }
            />
            <HelperText type="error" visible={tentou && !senha}>
              Informe sua senha.
            </HelperText>
          </View>

          {!!erro && (
            <Text variant="bodyMedium" style={estilos.erro} accessibilityLiveRegion="polite">
              {erro}
            </Text>
          )}

          <Button
            mode="contained"
            buttonColor={cor.dourado}
            textColor={cor.marinho}
            onPress={enviar}
            loading={entrar.isPending}
            disabled={entrar.isPending}
            contentStyle={estilos.botao}
          >
            Entrar
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.marinho },
  rolagem: { flexGrow: 1 },
  marca: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 32, gap: 8 },
  carro: { width: '82%', aspectRatio: 322 / 147 },
  nome: { width: '100%', aspectRatio: 452 / 58, marginTop: 4 },
  servicos: { color: cor.branco, textAlign: 'center' },
  painel: {
    backgroundColor: cor.branco,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 8,
  },
  erro: { color: cor.erro, marginBottom: 8 },
  botao: { height: 52 },
});
