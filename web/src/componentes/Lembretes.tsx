import { mdiCalendarAlertOutline } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, mensagemDoErro } from '../api';
import { recarregarLembretes, useLembretes } from '../consultas';
import { useSessao } from '../sessao';
import { formatarDia, numeroDoOrcamento } from '../valores';
import { Erro } from './Estado';
import { Icone } from './Icone';

// Orçamentos finalizados há 6 meses: aparece só para o gestor, até ele marcar que já agendou.
export function Lembretes() {
  const gestor = useSessao()?.papel === 'gestor';
  const { data: lembretes = [] } = useLembretes(gestor);
  const resolver = useMutation({ mutationFn: api.resolverLembrete, onSuccess: recarregarLembretes });
  if (!gestor || lembretes.length === 0) return null;

  return (
    <section className="lembretes" aria-labelledby="titulo-lembretes">
      <h2 id="titulo-lembretes">
        <Icone caminho={mdiCalendarAlertOutline} />
        Agendar manutenção periódica
      </h2>
      <ul>
        {lembretes.map((o) => (
          <li key={o.id}>
            <Link to={`/orcamentos/${o.id}`}>
              <strong>{o.clienteNome}</strong>
              <span>
                Orçamento nº {numeroDoOrcamento(o.numero)}, finalizado em {formatarDia(o.finalizadoEm!)}
              </span>
            </Link>
            <button type="button" className="botao botao-contorno" disabled={resolver.isPending} onClick={() => resolver.mutate(o.id)}>
              Já agendei
            </button>
          </li>
        ))}
      </ul>
      {resolver.isError && <Erro>{mensagemDoErro(resolver.error)}</Erro>}
    </section>
  );
}
