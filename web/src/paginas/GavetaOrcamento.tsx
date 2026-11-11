import {
  mdiAccountOutline,
  mdiCalendarCheckOutline,
  mdiCalendarOutline,
  mdiCashMultiple,
  mdiContentCopy,
  mdiPhoneOutline,
  mdiWhatsapp,
  mdiMapMarkerOutline,
  mdiNoteTextOutline,
  mdiPencilOutline,
  mdiTrashCanOutline,
} from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { api, mensagemDoErro } from '../api';
import { BotaoPdf } from '../componentes/BotaoRelatorio';
import { Dado } from '../componentes/Dado';
import { Erro, EstadoVazio } from '../componentes/Estado';
import { Gaveta } from '../componentes/Gaveta';
import { Icone } from '../componentes/Icone';
import { confirmar } from '../confirmar';
import { queryClient, recarregarOrcamentos, useClientes, useOrcamentos } from '../consultas';
import type { Orcamento } from '../tipos';
import { contatoDoTelefone, formatarDia, formatarMoeda, formatarQuantidade, numeroDoOrcamento, SITUACOES, type Situacao } from '../valores';

export function GavetaOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: orcamentos, isLoading } = useOrcamentos();
  const { data: clientes } = useClientes();
  const orcamento = orcamentos?.find((o) => o.id === id);
  const cliente = clientes?.find((c) => c.id === orcamento?.clienteId);
  const fechar = () => navigate('/orcamentos');

  const excluir = useMutation({
    mutationFn: () => api.excluirOrcamento(id!),
    onSuccess: async () => {
      await recarregarOrcamentos();
      fechar();
    },
  });

  const situacao = useMutation({
    mutationFn: (valor: Situacao) => api.mudarSituacao(id!, valor),
    // A resposta já traz o orçamento atualizado: entra na lista sem esperar outra busca.
    onSuccess: (salvo) => queryClient.setQueryData<Orcamento[]>(['orcamentos'], (lista) => lista?.map((o) => (o.id === salvo.id ? salvo : o))),
  });

  if (!orcamento) {
    return (
      <Gaveta titulo="Orçamento" aoFechar={fechar}>
        {isLoading ? (
          <p className="suave carregando">Carregando…</p>
        ) : (
          <EstadoVazio titulo="Orçamento não encontrado" texto="Ele pode ter sido excluído. Volte e atualize a lista." />
        )}
      </Gaveta>
    );
  }

  const numero = numeroDoOrcamento(orcamento.numero);
  const contato = [cliente?.telefone, cliente?.email].filter(Boolean).join(' – ');
  const links = cliente ? contatoDoTelefone(cliente.telefone) : null;
  // Tudo o que o PDF imprime, cliente incluído: se algo mudar depois de gerar, o arquivo fica velho.
  const conteudo = JSON.stringify([orcamento, cliente]);
  const condicoes = [
    { icone: mdiCashMultiple, rotulo: 'Forma de pagamento', valor: orcamento.pagamento },
    { icone: mdiCalendarCheckOutline, rotulo: 'Prazo de execução', valor: orcamento.prazo },
    { icone: mdiNoteTextOutline, rotulo: 'Observações', valor: orcamento.observacoes },
  ].filter((c) => c.valor);

  const confirmarExclusao = async () => {
    if (await confirmar(`Excluir o orçamento ${numero}?`, 'Ele some da lista e não pode ser recuperado.', 'Excluir orçamento')) excluir.mutate();
  };

  return (
    <Gaveta
      titulo={`Orçamento ${numero}`}
      aoFechar={fechar}
      acoes={
        <>
          <Link to="/orcamentos/novo" state={{ base: orcamento.id }} className="botao-icone claro" aria-label="Duplicar orçamento" title="Duplicar orçamento">
            <Icone caminho={mdiContentCopy} />
          </Link>
          <Link to={`/orcamentos/${orcamento.id}/editar`} className="botao-icone claro" aria-label="Editar orçamento" title="Editar orçamento">
            <Icone caminho={mdiPencilOutline} />
          </Link>
          <button type="button" className="botao-icone claro" aria-label="Excluir orçamento" title="Excluir orçamento" onClick={() => void confirmarExclusao()} disabled={excluir.isPending}>
            <Icone caminho={mdiTrashCanOutline} />
          </button>
        </>
      }
    >
      <div className="bloco-branco">
        <dl className="dados">
          <Dado icone={mdiAccountOutline} rotulo="Cliente">
            {orcamento.clienteNome}
            {contato && <span className="dado-extra">{contato}</span>}
          </Dado>
          {cliente?.endereco && (
            <Dado icone={mdiMapMarkerOutline} rotulo="Endereço">
              <span className="observacoes">{cliente.endereco}</span>
            </Dado>
          )}
          <Dado icone={mdiCalendarOutline} rotulo="Emitido em">
            {formatarDia(orcamento.criadoEm)}
          </Dado>
        </dl>
        {links && (
          <div className="linha-botoes contato">
            <a className="botao botao-contorno" href={links.ligar}>
              <Icone caminho={mdiPhoneOutline} />
              Ligar
            </a>
            <a className="botao botao-contorno" href={links.whatsapp} target="_blank" rel="noopener">
              <Icone caminho={mdiWhatsapp} />
              WhatsApp
            </a>
          </div>
        )}
        <fieldset className="campo situacao-campo">
          <legend>Situação</legend>
          <div className="chips" role="radiogroup" aria-label="Situação do orçamento">
            {SITUACOES.map(({ valor, rotulo }) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={orcamento.situacao === valor}
                className={`chip${orcamento.situacao === valor ? ' ativo' : ''}`}
                disabled={situacao.isPending}
                onClick={() => situacao.mutate(valor)}
              >
                {rotulo}
              </button>
            ))}
          </div>
          {situacao.isError && <Erro>{mensagemDoErro(situacao.error)}</Erro>}
        </fieldset>
        <BotaoPdf nome="orçamento" conteudo={conteudo} gerar={() => api.gerarPdfOrcamento(orcamento.id)} />
        {excluir.isError && <Erro>{mensagemDoErro(excluir.error)}</Erro>}
      </div>

      <section className="bloco-branco" aria-labelledby="titulo-itens">
        <h3 id="titulo-itens" className="titulo-secao">
          {orcamento.itens.length === 1 ? '1 item' : `${orcamento.itens.length} itens`}
        </h3>
        <ul className="itens-lista">
          {orcamento.itens.map((item, i) => (
            <li key={i}>
              <div>
                <span>{item.descricao}</span>
                <span className="numero">
                  {formatarQuantidade(item.quantidade)} {item.unidade} × {formatarMoeda(item.precoUnitario)}
                </span>
              </div>
              <strong>{formatarMoeda(item.total)}</strong>
            </li>
          ))}
        </ul>
        <p className="faixa-total">
          <span>TOTAL</span>
          <strong>{formatarMoeda(orcamento.total)}</strong>
        </p>
      </section>

      {condicoes.length > 0 && (
        <div className="bloco-branco">
          <dl className="dados">
            {condicoes.map((c) => (
              <Dado key={c.rotulo} icone={c.icone} rotulo={c.rotulo}>
                <span className="observacoes">{c.valor}</span>
              </Dado>
            ))}
          </dl>
        </div>
      )}
    </Gaveta>
  );
}
