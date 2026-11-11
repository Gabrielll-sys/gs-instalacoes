import { router, useLocalSearchParams } from 'expo-router';
import { EstadoVazio } from '../../../componentes/EstadoVazio';
import { FormOrdem } from '../../../componentes/FormOrdem';
import { useOrdens } from '../../../ordens';

export default function EditarOrdem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ordens } = useOrdens();
  const ordem = ordens.find((o) => o.id === id);

  if (!ordem) return <EstadoVazio titulo="OS não encontrada" texto="Volte para a lista e abra de novo." />;

  const { cliente, responsaveis, observacoes, abertaEm } = ordem;
  return (
    <FormOrdem
      inicial={{ id: ordem.id, cliente, responsaveis, observacoes, abertaEm }}
      rotuloSalvar="Salvar alterações"
      onSalvo={() => router.back()}
    />
  );
}
