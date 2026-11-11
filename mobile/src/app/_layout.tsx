import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { recuperarFotoDaCamera } from '../ordens';
import { sessao, useSessao } from '../sessao';
import { iniciarMotor, queryClient, UM_MES_MS } from '../sync/motor';
import { outbox } from '../sync/outbox';
import { cor, familia, tema } from '../tema';

const persister = createAsyncStoragePersister({ storage: AsyncStorage });

// Carrega a fila antes de qualquer tela: gravar antes de ler apagaria o que estava salvo.
const inicio = Promise.all([sessao.carregar(), outbox.carregar()])
  .then(recuperarFotoDaCamera)
  .catch((erro) => console.warn('Falha ao iniciar', erro))
  .then(iniciarMotor);

export default function Layout() {
  const [pronto, setPronto] = useState(false);
  const [fontes, erroFontes] = useFonts({
    [familia.regular]: require('@expo-google-fonts/overpass/400Regular/Overpass_400Regular.ttf'),
    [familia.semi]: require('@expo-google-fonts/overpass/600SemiBold/Overpass_600SemiBold.ttf'),
    [familia.extra]: require('@expo-google-fonts/overpass/800ExtraBold/Overpass_800ExtraBold.ttf'),
    [familia.black]: require('@expo-google-fonts/overpass/900Black/Overpass_900Black.ttf'),
  });
  const conta = useSessao();
  const logado = conta !== null;
  // Com senha provisória, só a tela de troca abre. A fila continua enviando por trás.
  const liberado = logado && !conta.trocarSenha;

  useEffect(() => {
    void inicio.finally(() => setPronto(true));
  }, []);

  // Mesmo fundo, imagem e tamanho da splash nativa: a troca de uma para a outra não aparece.
  if (!pronto || (!fontes && !erroFontes)) {
    return (
      <View style={estilos.carregando} accessible accessibilityLabel="GS Instalações, carregando">
        <StatusBar style="light" />
        <Image source={require('../../assets/splash-icon.png')} style={estilos.logo} />
      </View>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: UM_MES_MS,
        // O padrão só guarda status 'success': um refetch sem rede apagaria a lista salva justo em campo.
        // Consultas marcadas como só online, como clientes e orçamentos, não ficam gravadas no aparelho.
        dehydrateOptions: { shouldDehydrateQuery: (consulta) => consulta.state.data !== undefined && consulta.meta?.soOnline !== true },
      }}
    >
      <PaperProvider theme={tema}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: cor.marinho },
            headerTintColor: cor.branco,
            headerTitleStyle: { fontFamily: familia.extra, fontSize: 20 },
            headerShadowVisible: false,
            statusBarStyle: 'light',
            contentStyle: { backgroundColor: cor.fundo },
          }}
        >
          <Stack.Protected guard={liberado}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="ordens/nova" options={{ title: 'Nova OS' }} />
            <Stack.Screen name="ordens/[id]/index" options={{ title: 'Ordem de serviço' }} />
            <Stack.Screen name="ordens/[id]/editar" options={{ title: 'Editar OS' }} />
          </Stack.Protected>
          <Stack.Protected guard={liberado && conta.papel === 'gestor'}>
            <Stack.Screen name="equipe/index" options={{ title: 'Equipe' }} />
            <Stack.Screen name="equipe/conta" options={{ title: 'Conta' }} />
            <Stack.Screen name="orcamentos/index" options={{ title: 'Orçamentos' }} />
            <Stack.Screen name="orcamentos/novo" options={{ title: 'Novo orçamento' }} />
            <Stack.Screen name="orcamentos/[id]/index" options={{ title: 'Orçamento' }} />
            <Stack.Screen name="orcamentos/[id]/editar" options={{ title: 'Editar orçamento' }} />
            <Stack.Screen name="clientes/index" options={{ title: 'Clientes' }} />
            <Stack.Screen name="clientes/cliente" options={{ title: 'Cliente' }} />
          </Stack.Protected>
          <Stack.Protected guard={logado}>
            <Stack.Screen name="trocar-senha" options={{ title: 'Trocar senha' }} />
          </Stack.Protected>
          <Stack.Protected guard={!logado}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </PaperProvider>
    </PersistQueryClientProvider>
  );
}

// 288dp é a área do ícone da splash do Android 12+, para a qual a imagem foi composta.
const estilos = StyleSheet.create({
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cor.marinho },
  logo: { width: 288, height: 288 },
});
