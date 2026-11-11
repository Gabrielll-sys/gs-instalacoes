import { useMutation } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, mensagemDoErro, type Orcamento } from '../../../api';
import { queryClient } from '../../../sync/motor';
import { BotaoIcone } from '../../../componentes/BotaoIcone';
import { BotaoPdf } from '../../../componentes/BotaoRelatorio';
import { Dado } from '../../../componentes/Dado';
import { EstadoVazio } from '../../../componentes/EstadoVazio';
import { recarregarOrcamentos, useClientes, useOrcamentos } from '../../../orcamentos';
import { gerarPdfOrcamento, mensagemDoPdf } from '../../../relatorio';
import { cor, familia } from '../../../tema';
import { contatoDoTelefone, formatarDia, formatarMoeda, formatarQuantidade, numeroDoOrcamento, SITUACOES, type Situacao } from '../../../valores';

export default function TelaOrcamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const orcamentos = useOrcamentos();
  const clientes = useClientes();
  const [erro, setErro] = useState('');

  const orcamento = orcamentos.data?.find((o) => o.id === id);
  const cliente = clientes.data?.find((c) => c.id === orcamento?.clienteId);

  const excluir = useMutation({
    mutationFn: () => api.excluirOrcamento(id),
    onSuccess: async () => {
      await recarregarOrcamentos();
      router.back();
    },
    onError: (e) => setErro(mensagemDoErro(e)),
  });

  const situacao = useMutation({
    mutationFn: (valor: Situacao) => api.mudarSituacao(id, valor),
    // A resposta já traz o orçamento atualizado: entra na lista sem esperar outra busca.
    onSuccess: (salvo) => queryClient.setQueryData<Orcamento[]>(['orcamentos'], (lista) => lista?.map((o) => (o.id === salvo.id ? salvo : o))),
    onError: (e) => setErro(mensagemDoErro(e)),
  });

  if (!orcamento) {
    return orcamentos.isLoading ? (
      <ActivityIndicator style={estilos.carregando} size="large" color={cor.marinho} />
    ) : (
      <EstadoVazio titulo="Orçamento não encontrado" texto="Ele pode ter sido excluído. Volte e atualize a lista." />
    );
  }

  const numero = numeroDoOrcamento(orcamento.numero);
  const confirmarExclusao = () =>
    Alert.alert(`Excluir o orçamento ${numero}?`, 'Ele some da lista e não pode ser recuperado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => excluir.mutate() },
    ]);

  // Tudo o que o PDF imprime, cliente incluído: se algo mudar depois de gerar, o arquivo fica velho.
  const conteudo = JSON.stringify([orcamento, cliente]);
  const contato = [cliente?.telefone, cliente?.email].filter(Boolean).join(' – ');
  const links = cliente ? contatoDoTelefone(cliente.telefone) : null;
  const abrir = (url: string) => Linking.openURL(url).catch(() => setErro('Nenhum app deste aparelho abre esse link.'));
  const condicoes = [
    { icone: 'cash-multiple', rotulo: 'Forma de pagamento', valor: orcamento.pagamento },
    { icone: 'calendar-check-outline', rotulo: 'Prazo de execução', valor: orcamento.prazo },
    { icone: 'note-text-outline', rotulo: 'Observações', valor: orcamento.observacoes },
  ].filter((c) => c.valor);

  return (
    <View style={estilos.tela}>
      <Stack.Screen
        options={{
          title: `Orçamento ${numero}`,
          headerRight: () => (
            <View style={estilos.acoes}>
              <BotaoIcone
                icone="content-copy"
                rotulo="Duplicar orçamento"
                onPress={() => router.push({ pathname: '/orcamentos/novo', params: { base: orcamento.id } })}
              />
              <BotaoIcone icone="pencil-outline" rotulo="Editar orçamento" onPress={() => router.push(`/orcamentos/${orcamento.id}/editar`)} />
              <BotaoIcone icone="trash-can-outline" rotulo="Excluir orçamento" onPress={confirmarExclusao} />
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={estilos.bloco}>
          <Dado icone="account-outline" rotulo="Cliente" valor={orcamento.clienteNome + (contato ? `\n${contato}` : '')} />
          {!!cliente?.endereco && <Dado icone="map-marker-outline" rotulo="Endereço" valor={cliente.endereco} />}
          <Dado icone="calendar-outline" rotulo="Emitido em" valor={formatarDia(orcamento.criadoEm)} />
          {links && (
            <View style={estilos.contato}>
              <Button mode="outlined" icon="phone-outline" onPress={() => void abrir(links.ligar)} style={estilos.expande} contentStyle={estilos.botao}>
                Ligar
              </Button>
              <Button mode="outlined" icon="whatsapp" onPress={() => void abrir(links.whatsapp)} style={estilos.expande} contentStyle={estilos.botao}>
                WhatsApp
              </Button>
            </View>
          )}
          <Text variant="labelLarge" style={estilos.rotuloSituacao}>
            Situação
          </Text>
          <View style={estilos.situacoes} accessibilityRole="radiogroup" accessibilityLabel="Situação do orçamento">
            {SITUACOES.map(({ valor, rotulo }) => {
              const ativa = orcamento.situacao === valor;
              return (
                <Chip
                  key={valor}
                  mode="outlined"
                  compact
                  selected={ativa}
                  showSelectedCheck={false}
                  disabled={situacao.isPending}
                  onPress={() => situacao.mutate(valor)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativa }}
                  style={ativa ? estilos.chipAtivo : estilos.chip}
                  textStyle={ativa ? estilos.chipAtivoTexto : estilos.chipTexto}
                >
                  {rotulo}
                </Chip>
              );
            })}
          </View>
          <BotaoPdf
            nome="orçamento"
            conteudo={conteudo}
            gerar={() => gerarPdfOrcamento(orcamento)}
            tituloEnvio={`Orçamento ${numero} – ${orcamento.clienteNome}`}
            mensagemDoErro={(e) => mensagemDoPdf(e, 'Este orçamento foi excluído. Volte e atualize a lista.')}
            onErro={setErro}
          />
        </View>

        <View style={[estilos.bloco, estilos.itens]}>
          <Text variant="titleMedium" style={estilos.titulo} accessibilityRole="header">
            {orcamento.itens.length === 1 ? '1 item' : `${orcamento.itens.length} itens`}
          </Text>
          {orcamento.itens.map((item, i) => {
            const conta = `${formatarQuantidade(item.quantidade)} ${item.unidade} × ${formatarMoeda(item.precoUnitario)}`;
            return (
              <View
                key={i}
                style={estilos.item}
                accessible
                accessibilityLabel={`${item.descricao}: ${conta}, total ${formatarMoeda(item.total)}`}
              >
                <View style={estilos.expande}>
                  <Text variant="bodyLarge">{item.descricao}</Text>
                  <Text variant="bodyMedium" style={[estilos.suave, estilos.tabular]}>
                    {conta}
                  </Text>
                </View>
                <Text style={estilos.valorItem}>{formatarMoeda(item.total)}</Text>
              </View>
            );
          })}
          <View style={estilos.total} accessible accessibilityLabel={`Total: ${formatarMoeda(orcamento.total)}`}>
            <Text style={estilos.totalRotulo}>TOTAL</Text>
            <Text style={estilos.totalValor} numberOfLines={1} adjustsFontSizeToFit>
              {formatarMoeda(orcamento.total)}
            </Text>
          </View>
        </View>

        {condicoes.length > 0 && (
          <View style={[estilos.bloco, estilos.itens]}>
            {condicoes.map((c) => (
              <Dado key={c.rotulo} icone={c.icone} rotulo={c.rotulo} valor={c.valor} />
            ))}
          </View>
        )}
      </ScrollView>

      <Snackbar visible={!!erro} onDismiss={() => setErro('')} duration={5000}>
        {erro}
      </Snackbar>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  carregando: { marginTop: 56 },
  acoes: { flexDirection: 'row' },
  contato: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
  botao: { height: 48 },
  rotuloSituacao: { paddingTop: 10 },
  situacoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  chip: { backgroundColor: cor.branco },
  chipAtivo: { backgroundColor: cor.marinho, borderColor: cor.marinho },
  chipTexto: { marginVertical: 10 },
  chipAtivoTexto: { color: cor.branco, marginVertical: 10 },
  bloco: { backgroundColor: cor.branco, paddingHorizontal: 16, paddingVertical: 6 },
  itens: { marginTop: 8, paddingVertical: 14 },
  titulo: { color: cor.marinho, paddingBottom: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cor.filete,
  },
  expande: { flex: 1 },
  suave: { color: cor.textoSuave },
  tabular: { fontVariant: ['tabular-nums'] },
  valorItem: { fontFamily: familia.extra, fontSize: 16, lineHeight: 24, color: cor.texto, fontVariant: ['tabular-nums'] },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: cor.marinho,
  },
  totalRotulo: { flex: 1, fontFamily: familia.extra, fontSize: 13, lineHeight: 19, letterSpacing: 0.4, color: cor.branco },
  totalValor: { fontFamily: familia.black, fontSize: 22, lineHeight: 28, color: cor.branco, fontVariant: ['tabular-nums'] },
});
