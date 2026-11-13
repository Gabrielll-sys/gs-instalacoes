import { useMutation } from '@tanstack/react-query';
import { usePreventRemove } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Icon, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEquipe } from '../equipe';
import { useClientes } from '../orcamentos';
import { useSessao } from '../sessao';
import { salvarOrdem } from '../ordens';
import { formatarData, type DadosOrdem } from '../sync/regras';
import { cor } from '../tema';
import { buscarClientes } from '../valores';

const MAX_RESPONSAVEIS = 20;
const ALTURA_BARRA_ANDROID = 56;
// O chip tem 42dp; somado a isto chega aos 48dp mínimos do Android.
const ALCANCE_CHIP = { top: 3, bottom: 3 };

export function FormOrdem({
  inicial,
  rotuloSalvar,
  onSalvo,
}: {
  inicial: DadosOrdem;
  rotuloSalvar: string;
  onSalvo: () => void;
}) {
  const insets = useSafeAreaInsets();
  const equipe = useEquipe();
  const [cliente, setCliente] = useState(inicial.cliente);
  // O gestor escolhe entre os clientes cadastrados; o nome continua livre, inclusive sem internet.
  const clientes = useClientes(useSessao()?.papel === 'gestor');
  const sugestoes =
    cliente.trim().length < 2
      ? []
      : buscarClientes(clientes.data ?? [], cliente)
          .filter((c) => c.nome !== cliente.trim())
          .slice(0, 3);
  const [responsaveis, setResponsaveis] = useState(inicial.responsaveis);
  const [observacoes, setObservacoes] = useState(inicial.observacoes);
  const [tentou, setTentou] = useState(false);

  // Ligado no toque: salvar no aparelho é tão rápido que a trava abaixo ainda valeria quando a tela fosse trocada.
  const [saindo, setSaindo] = useState(false);
  const salvar = useMutation({ mutationFn: salvarOrdem, onSuccess: onSalvo, onError: () => setSaindo(false) });

  const alterado =
    cliente !== inicial.cliente ||
    observacoes !== inicial.observacoes ||
    responsaveis.join() !== inicial.responsaveis.join();

  // O Back do Android descartaria em silêncio o que foi digitado no cliente.
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

  // Soma quem já está na OS: conta desativada ou renomeada não pode sumir ao editar uma OS antiga.
  const pessoas = useMemo(
    () => [...new Set([...(equipe.data ?? []), ...inicial.responsaveis])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [equipe.data, inicial.responsaveis],
  );

  const alternar = (pessoa: string) =>
    setResponsaveis((atual) =>
      atual.includes(pessoa)
        ? atual.filter((r) => r !== pessoa)
        : atual.length >= MAX_RESPONSAVEIS
          ? atual
          : [...atual, pessoa],
    );

  const enviar = () => {
    setTentou(true);
    if (!cliente.trim() || responsaveis.length === 0) return;
    setSaindo(true);
    salvar.mutate({ ...inicial, cliente: cliente.trim(), responsaveis, observacoes: observacoes.trim() });
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={insets.top + ALTURA_BARRA_ANDROID}
      style={estilos.tela}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.conteudo}>
        <View style={estilos.abertura}>
          <Icon source="calendar-clock-outline" size={22} color={cor.realce} />
          <View style={estilos.expande}>
            <Text variant="labelLarge">Aberta em {formatarData(inicial.abertaEm)}</Text>
            <Text variant="bodyMedium" style={estilos.suave}>
              Registrada automaticamente
            </Text>
          </View>
        </View>

        <View>
          <TextInput
            label="Nome do cliente"
            accessibilityLabel="Nome do cliente"
            mode="outlined"
            value={cliente}
            onChangeText={setCliente}
            maxLength={200}
            autoCapitalize="words"
            error={tentou && !cliente.trim()}
          />
          {sugestoes.map((c) => (
            <TouchableRipple
              key={c.id}
              onPress={() => setCliente(c.nome)}
              accessibilityRole="button"
              accessibilityLabel={`Usar o cliente cadastrado ${c.nome}`}
              style={estilos.sugestao}
            >
              <View style={estilos.sugestaoLinha}>
                <Icon source="card-account-details-outline" size={20} color={cor.realce} />
                <Text variant="bodyLarge" style={estilos.expande} numberOfLines={1}>
                  {c.nome}
                </Text>
              </View>
            </TouchableRipple>
          ))}
          <HelperText type="error" visible={tentou && !cliente.trim()}>
            Informe o nome do cliente.
          </HelperText>
        </View>

        <View>
          <Text variant="labelLarge" style={estilos.rotulo}>
            Responsáveis
          </Text>
          <View style={estilos.chips}>
            {pessoas.map((pessoa) => {
              const marcada = responsaveis.includes(pessoa);
              return (
                <Chip
                  key={pessoa}
                  mode="outlined"
                  icon={() => <Icon source={marcada ? 'check' : 'plus'} size={18} color={marcada ? cor.branco : cor.realce} />}
                  style={marcada ? estilos.chipSelecionado : estilos.chip}
                  textStyle={marcada ? estilos.chipSelecionadoTexto : estilos.chipTexto}
                  hitSlop={ALCANCE_CHIP}
                  onPress={() => alternar(pessoa)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcada }}
                  accessibilityLabel={pessoa}
                >
                  {pessoa}
                </Chip>
              );
            })}
          </View>
          {/* Sem a lista guardada, quem abre a OS ainda consegue registrar a si mesmo. */}
          {!equipe.data && !equipe.isLoading && (
            <HelperText type="info">A lista da equipe aparece quando houver internet.</HelperText>
          )}
          {tentou && responsaveis.length === 0 && <HelperText type="error">Escolha ao menos um responsável.</HelperText>}
          {responsaveis.length >= MAX_RESPONSAVEIS && (
            <HelperText type="info">Limite de {MAX_RESPONSAVEIS} responsáveis por OS. Desmarque alguém para trocar.</HelperText>
          )}
        </View>

        <TextInput
          label="Observações"
          accessibilityLabel="Observações"
          mode="outlined"
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
          maxLength={5000}
          style={estilos.observacoes}
        />
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
          {rotuloSalvar}
        </Button>
        {salvar.isError && (
          <HelperText type="error">Não foi possível guardar no aparelho. Tente de novo.</HelperText>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  sugestao: { minHeight: 48, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cor.filete },
  sugestaoLinha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  tela: { flex: 1, backgroundColor: cor.superficie },
  conteudo: { padding: 16, gap: 8 },
  abertura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: cor.fundo,
  },
  expande: { flex: 1 },
  suave: { color: cor.textoSuave },
  rotulo: { marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: cor.superficie },
  chipTexto: { marginVertical: 10 },
  chipSelecionado: { backgroundColor: cor.marinho, borderColor: cor.marinho },
  chipSelecionadoTexto: { color: cor.branco, marginVertical: 10 },
  observacoes: { minHeight: 120, marginTop: 12 },
  rodape: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cor.filete,
    backgroundColor: cor.superficie,
  },
  botao: { height: 52 },
});
