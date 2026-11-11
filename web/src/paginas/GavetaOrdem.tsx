import { mdiAccountGroupOutline, mdiCalendarClockOutline, mdiNoteTextOutline, mdiPencilOutline, mdiTrashCanOutline } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { api, mensagemDoErro } from '../api';
import { BotaoRelatorio } from '../componentes/BotaoRelatorio';
import { confirmar } from '../confirmar';
import { Dado } from '../componentes/Dado';
import { Erro, EstadoVazio } from '../componentes/Estado';
import { Gaveta } from '../componentes/Gaveta';
import { Icone } from '../componentes/Icone';
import { SecaoFotos } from '../componentes/SecaoFotos';
import { recarregarOrdens, useOrdens } from '../consultas';
import { contarFotos, formatarData } from '../regras';
import { useSessao } from '../sessao';

export function GavetaOrdem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ordens, isLoading } = useOrdens();
  const papel = useSessao()?.papel;
  const ordem = ordens?.find((o) => o.id === id);
  const fechar = () => navigate('/');

  const excluir = useMutation({
    mutationFn: () => api.excluirOrdem(id!),
    onSuccess: async () => {
      await recarregarOrdens();
      fechar();
    },
  });

  if (!ordem) {
    return (
      <Gaveta titulo="Ordem de serviço" aoFechar={fechar}>
        {isLoading ? <p className="suave carregando">Carregando…</p> : <EstadoVazio titulo="OS não encontrada" texto="Ela pode ter ficado fora das 200 mais recentes." />}
      </Gaveta>
    );
  }

  const antes = contarFotos(ordem, 'antes');
  const depois = contarFotos(ordem, 'depois');

  return (
    <Gaveta
      titulo={ordem.cliente}
      aoFechar={fechar}
      acoes={
        <>
          <Link to={`/ordens/${ordem.id}/editar`} className="botao-icone claro" aria-label="Editar OS" title="Editar OS">
            <Icone caminho={mdiPencilOutline} />
          </Link>
          {papel === 'gestor' && (
            <button
              type="button"
              className="botao-icone claro"
              aria-label="Excluir OS"
              title="Excluir OS"
              disabled={excluir.isPending}
              onClick={async () => {
                const total = antes + depois;
                const fotos = total === 1 ? 'a foto' : `as ${total} fotos`;
                if (await confirmar(`Excluir a OS de ${ordem.cliente}?`, `A OS e ${total ? fotos : 'os dados dela'} somem de vez, inclusive do armazenamento.`, 'Excluir OS'))
                  excluir.mutate();
              }}
            >
              <Icone caminho={mdiTrashCanOutline} />
            </button>
          )}
        </>
      }
    >
      <div className="bloco-branco">
        {excluir.isError && <Erro>{mensagemDoErro(excluir.error)}</Erro>}
        <dl className="dados">
          <Dado icone={mdiCalendarClockOutline} rotulo="Aberta em">
            {formatarData(ordem.abertaEm)}
          </Dado>
          <Dado icone={mdiAccountGroupOutline} rotulo="Responsáveis">
            {ordem.responsaveis.join(', ')}
          </Dado>
          {ordem.observacoes && (
            <Dado icone={mdiNoteTextOutline} rotulo="Observações">
              <span className="observacoes">{ordem.observacoes}</span>
            </Dado>
          )}
        </dl>
        {papel === 'gestor' && <BotaoRelatorio ordem={ordem} />}
      </div>
      <SecaoFotos ordem={ordem} secao="antes" proximoPasso={antes === 0} />
      <SecaoFotos ordem={ordem} secao="depois" proximoPasso={antes > 0 && depois === 0} />
    </Gaveta>
  );
}
