import { mdiPlus } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { api, mensagemDoErro, type DadosOrcamento, type Orcamento } from '../api';
import { Campo } from '../componentes/Campos';
import { Erro, EstadoVazio } from '../componentes/Estado';
import { Gaveta } from '../componentes/Gaveta';
import { Icone } from '../componentes/Icone';
import { ItemOrcamento } from '../componentes/ItemOrcamento';
import { SeletorCliente } from '../componentes/SeletorCliente';
import { recarregarOrcamentos, useClientes, useOrcamentos } from '../consultas';
import { useGuardaAlteracoes } from '../guardaAlteracoes';
import {
  centavosDoTotal,
  formatarCentavos,
  lerNumero,
  linhaDoItem,
  moverItem,
  novaLinha,
  numeroDoOrcamento,
  problemaNoItem,
  UNIDADES,
  type ItemDigitado,
  type Linha,
} from '../valores';
import { FormCliente } from './GavetaCliente';

const MAX_ITENS = 100;

// Rota de Novo orçamento e de Editar orçamento. "Duplicar" abre o novo com a cópia de outro em location.state.base.
export function GavetaFormOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const base: string | undefined = useLocation().state?.base;
  const { data: orcamentos, isLoading } = useOrcamentos();
  const orcamento = id ? orcamentos?.find((o) => o.id === id) : undefined;
  const modelo = !id && base ? orcamentos?.find((o) => o.id === base) : undefined;

  if (id && !orcamento) {
    return (
      <Gaveta titulo="Editar orçamento" aoFechar={() => navigate('/orcamentos')}>
        {isLoading ? <p className="suave carregando">Carregando…</p> : <EstadoVazio titulo="Orçamento não encontrado" texto="Volte e atualize a lista de orçamentos." />}
      </Gaveta>
    );
  }
  if (base && !modelo && isLoading) return null;
  return <FormOrcamento key={id ?? `novo-${base ?? ''}`} orcamento={orcamento} modelo={modelo} />;
}

// `modelo` preenche um orçamento novo a partir de outro; `orcamento` edita o próprio.
function FormOrcamento({ orcamento, modelo }: { orcamento?: Orcamento; modelo?: Orcamento }) {
  const navigate = useNavigate();
  const clientes = useClientes();
  const origem = orcamento ?? modelo;
  const [clienteId, setClienteId] = useState(origem?.clienteId ?? '');
  const [itens, setItens] = useState<Linha[]>(() => (origem ? origem.itens.map(linhaDoItem) : [novaLinha()]));
  const [pagamento, setPagamento] = useState(origem?.pagamento ?? '');
  const [prazo, setPrazo] = useState(origem?.prazo ?? '');
  const [observacoes, setObservacoes] = useState(origem?.observacoes ?? '');
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);

  const retrato = JSON.stringify([clienteId, itens.map((i) => [i.descricao, i.quantidade, i.unidade, i.preco]), pagamento, prazo, observacoes]);
  const [inicial] = useState(retrato);
  // A cópia ainda não existe no servidor: sair dela sem salvar também pergunta.
  useGuardaAlteracoes((retrato !== inicial || !!modelo) && !saindo);

  const dados = (): DadosOrcamento => ({
    clienteId,
    itens: itens.map((i) => ({
      descricao: i.descricao.trim(),
      quantidade: lerNumero(i.quantidade)!,
      unidade: i.unidade.trim(),
      precoUnitario: lerNumero(i.preco)!,
    })),
    pagamento: pagamento.trim(),
    prazo: prazo.trim(),
    observacoes: observacoes.trim(),
  });

  const salvar = useMutation({
    mutationFn: () => (orcamento ? api.salvarOrcamento(orcamento.id, dados()) : api.criarOrcamento(dados())),
    onSuccess: async (salvo) => {
      await recarregarOrcamentos();
      // Depois de salvar, a gaveta do orçamento é onde se gera o PDF.
      navigate(`/orcamentos/${salvo.id}`);
    },
    onError: () => setSaindo(false),
  });

  const mudarItem = (chave: number, campo: keyof ItemDigitado, valor: string) =>
    setItens((lista) => lista.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)));

  const escolhido = clientes.data?.find((c) => c.id === clienteId);
  // Antes de a lista chegar, o nome que veio com o orçamento basta para mostrar quem é.
  const nomeEscolhido = escolhido?.nome ?? (clienteId === origem?.clienteId ? origem.clienteNome : '');
  const temProblema = !clienteId || itens.some((i) => problemaNoItem(i));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (temProblema) return;
    setSaindo(true);
    salvar.mutate();
  };

  const fechar = () => navigate(orcamento ? `/orcamentos/${orcamento.id}` : '/orcamentos');
  const total = formatarCentavos(centavosDoTotal(itens));

  return (
    <Gaveta
      titulo={
        orcamento
          ? `Editar orçamento ${numeroDoOrcamento(orcamento.numero)}`
          : modelo
            ? `Cópia do orçamento ${numeroDoOrcamento(modelo.numero)}`
            : 'Novo orçamento'
      }
      aoFechar={fechar}
      rodape={
        <div className="rodape-total">
          <div>
            <span>Total</span>
            <strong aria-live="polite">{total}</strong>
          </div>
          <button type="submit" form="form-orcamento" className="botao botao-ouro" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : orcamento ? 'Salvar' : 'Criar orçamento'}
          </button>
        </div>
      }
    >
      <form id="form-orcamento" className="secoes-form" onSubmit={enviar} noValidate>
        <section className="bloco-branco formulario" aria-labelledby="titulo-cliente">
          <h3 id="titulo-cliente" className="titulo-secao">
            Cliente
          </h3>
          {clienteId ? (
            <div className="cliente-escolhido">
              <div>
                <strong>{nomeEscolhido}</strong>
                {escolhido?.telefone && <span>{escolhido.telefone}</span>}
              </div>
              <button type="button" className="botao botao-texto" onClick={() => setClienteId('')} aria-label={`Trocar o cliente ${nomeEscolhido}`}>
                Trocar
              </button>
            </div>
          ) : (
            <SeletorCliente onEscolher={setClienteId} onCadastrar={() => setCadastrando(true)} />
          )}
          {tentou && !clienteId && <p className="erro-texto">Escolha o cliente.</p>}
        </section>

        <section className="bloco-branco formulario" aria-labelledby="titulo-itens-form">
          <h3 id="titulo-itens-form" className="titulo-secao">
            Itens
          </h3>
          <ol className="itens-editor">
            {itens.map((item, i) => (
              <ItemOrcamento
                key={item.chave}
                item={item}
                indice={i}
                quantos={itens.length}
                tentou={tentou}
                aoMudar={(campo, valor) => mudarItem(item.chave, campo, valor)}
                aoMover={(para) => setItens((lista) => moverItem(lista, i, para))}
                aoRemover={() => setItens((lista) => lista.filter((l) => l.chave !== item.chave))}
              />
            ))}
          </ol>
          <datalist id="unidades-comuns">
            {UNIDADES.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          {itens.length < MAX_ITENS && (
            <button type="button" className="botao botao-contorno alinha-inicio" onClick={() => setItens((lista) => [...lista, novaLinha()])}>
              <Icone caminho={mdiPlus} />
              Adicionar item
            </button>
          )}
        </section>

        <section className="bloco-branco formulario" aria-labelledby="titulo-condicoes">
          <h3 id="titulo-condicoes" className="titulo-secao">
            Condições
          </h3>
          <Campo rotulo="Forma de pagamento">
            {(props) => <textarea {...props} value={pagamento} onChange={(e) => setPagamento(e.target.value)} placeholder="Ex.: PIX à vista ou cartão em até 3x" maxLength={500} rows={2} />}
          </Campo>
          <Campo rotulo="Prazo de execução">
            {(props) => <input {...props} value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="Ex.: até 5 dias úteis após a aprovação" maxLength={500} />}
          </Campo>
          <Campo rotulo="Observações">
            {(props) => <textarea {...props} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={5000} rows={3} />}
          </Campo>
          {tentou && temProblema && <Erro>Confira os campos marcados em vermelho.</Erro>}
          {salvar.isError && <Erro>{mensagemDoErro(salvar.error)}</Erro>}
        </section>
      </form>

      {/* Fora do <form>: o envio do cadastro não pode disparar o do orçamento. */}
      {cadastrando && (
        <FormCliente
          aoFechar={() => setCadastrando(false)}
          aoSalvar={(cliente) => {
            setClienteId(cliente.id);
            setCadastrando(false);
          }}
        />
      )}
    </Gaveta>
  );
}
