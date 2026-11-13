import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';
import { tentarErrosDeNovo } from '../ordens';
import { useSemResposta } from '../sync/motor';
import { useOutbox } from '../sync/outbox';
import { descreverFila, ordemDaOp, type Op } from '../sync/regras';
import { cor } from '../tema';

function Faixa({ fundo, cor: tom, icone, texto }: { fundo: string; cor: string; icone: ReactNode; texto: string }) {
  return (
    <View style={[estilos.faixa, { backgroundColor: fundo }]} accessibilityLiveRegion="polite">
      {icone}
      <Text variant="labelLarge" style={[estilos.texto, { color: tom }]}>
        {texto}
      </Text>
    </View>
  );
}

function resumo(ops: Op[], estado: Op['estado']) {
  const doEstado = ops.filter((op) => op.estado === estado);
  const fotos = doEstado.filter((op) => op.tipo === 'enviar-foto').length;
  return descreverFila(fotos, doEstado.length - fotos);
}

// Com ordemId, conta só a fila dessa OS, para o número bater com os selos que estão na tela.
export function AvisoSync({ ordemId }: { ordemId?: string }) {
  const online = useSyncExternalStore(
    (ouvinte) => onlineManager.subscribe(ouvinte),
    () => onlineManager.isOnline(),
  );
  const semResposta = useSemResposta();
  const todas = useOutbox();
  const ops = ordemId ? todas.filter((op) => ordemDaOp(op) === ordemId) : todas;
  const pendentes = resumo(ops, 'pendente');
  const erros = resumo(ops, 'erro');

  if (erros) {
    const texto = `Não enviado: ${erros}.`;
    return (
      <TouchableRipple
        onPress={() => void tentarErrosDeNovo()}
        accessibilityRole="button"
        accessibilityLabel={`${texto} Tentar de novo`}
        style={[estilos.faixa, { backgroundColor: cor.erroFundo }]}
      >
        <View style={estilos.linha}>
          <Icon source="alert-circle-outline" size={20} color={cor.erro} />
          <Text variant="labelLarge" style={[estilos.texto, { color: cor.erro }]}>
            {texto}
          </Text>
          <Text variant="labelLarge" style={[estilos.acao, { color: cor.erro }]}>
            Tentar de novo
          </Text>
        </View>
      </TouchableRipple>
    );
  }

  if (!online) {
    return (
      <Faixa
        fundo={cor.atencaoFundo}
        cor={cor.atencao}
        icone={<Icon source="wifi-off" size={20} color={cor.atencao} />}
        texto={
          pendentes
            ? `Sem internet. Aguardando envio: ${pendentes}.`
            : 'Sem internet. Pode continuar: tudo fica guardado no aparelho.'
        }
      />
    );
  }

  if (pendentes && semResposta) {
    return (
      <Faixa
        fundo={cor.atencaoFundo}
        cor={cor.atencao}
        icone={<Icon source="cloud-alert-outline" size={20} color={cor.atencao} />}
        texto={`Servidor sem resposta. Nova tentativa em breve: ${pendentes}.`}
      />
    );
  }

  if (pendentes) {
    return (
      <Faixa
        fundo={cor.envioFundo}
        cor={cor.marinho}
        icone={<ActivityIndicator size={18} color={cor.realce} />}
        texto={`Enviando ${pendentes}…`}
      />
    );
  }

  return null;
}

const estilos = StyleSheet.create({
  faixa: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, minHeight: 48 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  texto: { flex: 1 },
  acao: { textDecorationLine: 'underline' },
});
