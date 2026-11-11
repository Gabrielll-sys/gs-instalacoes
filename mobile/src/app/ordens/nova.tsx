import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { FormOrdem } from '../../componentes/FormOrdem';
import { useSessao } from '../../sessao';
import type { DadosOrdem } from '../../sync/regras';

export default function NovaOrdem() {
  const conta = useSessao();
  // A abertura é a hora em que o técnico abriu a OS, a mesma que aparece no formulário.
  const [inicial] = useState<DadosOrdem>(() => ({
    id: randomUUID(),
    cliente: '',
    // O técnico abre a OS para si mesmo; o gestor normalmente abre para a equipe e escolhe quem vai.
    responsaveis: conta?.papel === 'tecnico' ? [conta.nome] : [],
    observacoes: '',
    abertaEm: new Date().toISOString(),
  }));

  // replace: voltar da OS criada leva à lista, não a um formulário já salvo.
  return <FormOrdem inicial={inicial} rotuloSalvar="Abrir OS" onSalvo={() => router.replace(`/ordens/${inicial.id}`)} />;
}
