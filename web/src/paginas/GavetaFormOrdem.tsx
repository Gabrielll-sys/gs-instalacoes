import { mdiCalendarClockOutline, mdiCheck, mdiPlus } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, mensagemDoErro, type DadosOrdem } from '../api';
import { Campo } from '../componentes/Campos';
import { useGuardaAlteracoes } from '../guardaAlteracoes';
import { Erro, EstadoVazio } from '../componentes/Estado';
import { Gaveta } from '../componentes/Gaveta';
import { Icone } from '../componentes/Icone';
import { recarregarOrdens, useClientes, useEquipe, useOrdens } from '../consultas';
import { formatarData } from '../regras';
import { useSessao } from '../sessao';

const MAX_RESPONSAVEIS = 20;

// Rota de Nova OS e de Editar OS.
export function GavetaFormOrdem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ordens, isLoading } = useOrdens();
  const existente = id ? ordens?.find((o) => o.id === id) : undefined;

  if (id && !existente) {
    return (
      <Gaveta titulo="Editar OS" aoFechar={() => navigate('/')}>
        {isLoading ? <p className="suave carregando">Carregando…</p> : <EstadoVazio titulo="OS não encontrada" texto="Volte para a lista e tente de novo." />}
      </Gaveta>
    );
  }
  return <FormOrdem key={id ?? 'nova'} existente={existente} />;
}

function FormOrdem({ existente }: { existente?: DadosOrdem }) {
  const navigate = useNavigate();
  const conta = useSessao()!;
  // O gestor escolhe entre os clientes cadastrados; o nome continua livre para quem não está no cadastro.
  const clientes = useClientes(conta.papel === 'gestor');
  const equipe = useEquipe();
  // O técnico abre a OS para si mesmo; o gestor normalmente abre para a equipe e escolhe quem vai.
  const [inicial] = useState<DadosOrdem>(
    () =>
      existente ?? {
        id: crypto.randomUUID(),
        cliente: '',
        responsaveis: conta.papel === 'tecnico' ? [conta.nome] : [],
        observacoes: '',
        abertaEm: new Date().toISOString(),
      },
  );
  const [cliente, setCliente] = useState(inicial.cliente);
  const [responsaveis, setResponsaveis] = useState(inicial.responsaveis);
  const [observacoes, setObservacoes] = useState(inicial.observacoes);
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const salvar = useMutation({
    mutationFn: (dados: DadosOrdem) => api.salvarOrdem(dados),
    onSuccess: async () => {
      await recarregarOrdens();
      navigate(`/ordens/${inicial.id}`);
    },
    onError: () => setSaindo(false),
  });

  const alterado =
    cliente !== inicial.cliente || observacoes !== inicial.observacoes || responsaveis.join() !== inicial.responsaveis.join();
  useGuardaAlteracoes(alterado && !saindo);

  // Soma quem já está na OS: conta desativada ou renomeada não pode sumir ao editar uma OS antiga.
  const pessoas = useMemo(
    () => [...new Set([...(equipe.data ?? []), ...inicial.responsaveis])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [equipe.data, inicial.responsaveis],
  );

  const alternar = (pessoa: string) =>
    setResponsaveis((atual) =>
      atual.includes(pessoa) ? atual.filter((r) => r !== pessoa) : atual.length >= MAX_RESPONSAVEIS ? atual : [...atual, pessoa],
    );

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (!cliente.trim() || responsaveis.length === 0) return;
    setSaindo(true);
    salvar.mutate({ ...inicial, cliente: cliente.trim(), responsaveis, observacoes: observacoes.trim() });
  };

  return (
    <Gaveta
      titulo={existente ? 'Editar OS' : 'Nova OS'}
      aoFechar={() => navigate(existente ? `/ordens/${inicial.id}` : '/')}
      rodape={
        <button type="submit" form="form-ordem" className="botao botao-ouro botao-largo" disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : existente ? 'Salvar alterações' : 'Abrir OS'}
        </button>
      }
    >
      <form id="form-ordem" className="formulario bloco-branco" onSubmit={enviar} noValidate>
        <div className="abertura">
          <Icone caminho={mdiCalendarClockOutline} />
          <div>
            <strong>Aberta em {formatarData(inicial.abertaEm)}</strong>
            <span>Registrada automaticamente</span>
          </div>
        </div>

        <Campo rotulo="Nome do cliente" erro={tentou && !cliente.trim() ? 'Informe o nome do cliente.' : undefined}>
          {(props) => (
            <input {...props} value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={200} data-foco={!existente || undefined} list="clientes-cadastrados" autoComplete="off" />
          )}
        </Campo>
        <datalist id="clientes-cadastrados">
          {clientes.data?.map((c) => <option key={c.id} value={c.nome} />)}
        </datalist>

        <fieldset className="campo">
          <legend>Responsáveis</legend>
          <div className="chips">
            {pessoas.map((pessoa) => {
              const marcada = responsaveis.includes(pessoa);
              return (
                <button key={pessoa} type="button" className={`chip${marcada ? ' marcado' : ''}`} aria-pressed={marcada} onClick={() => alternar(pessoa)}>
                  <Icone caminho={marcada ? mdiCheck : mdiPlus} tamanho={18} />
                  {pessoa}
                </button>
              );
            })}
          </div>
          {!equipe.data && !equipe.isLoading && <p className="campo-ajuda">Não foi possível carregar a equipe. Confira a conexão.</p>}
          {equipe.data?.length === 0 && pessoas.length === 0 && (
            <p className="campo-ajuda">Nenhum técnico cadastrado. O gestor cadastra em Equipe.</p>
          )}
          {responsaveis.length >= MAX_RESPONSAVEIS && (
            <p className="campo-ajuda">Limite de {MAX_RESPONSAVEIS} responsáveis por OS. Desmarque alguém para trocar.</p>
          )}
          {tentou && responsaveis.length === 0 && (
            <p className="campo-ajuda erro-texto" role="alert">
              Escolha ao menos um responsável.
            </p>
          )}
        </fieldset>

        <Campo rotulo="Observações">
          {(props) => <textarea {...props} rows={5} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={5000} />}
        </Campo>

        {salvar.isError && <Erro>{mensagemDoErro(salvar.error)}</Erro>}
      </form>
    </Gaveta>
  );
}
