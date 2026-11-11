import { mdiMagnify, mdiPlus, mdiTrashCanOutline } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, mensagemDoErro, type DadosOrcamento, type Orcamento } from '../api';
import { Campo } from '../componentes/Campos';
import { Erro, EstadoVazio } from '../componentes/Estado';
import { Gaveta } from '../componentes/Gaveta';
import { Icone } from '../componentes/Icone';
import { recarregarOrcamentos, useClientes, useOrcamentos } from '../consultas';
import { useGuardaAlteracoes } from '../guardaAlteracoes';
import {
  buscarClientes,
  centavosDoItem,
  centavosDoTotal,
  formatarCentavos,
  lerNumero,
  numeroDoOrcamento,
  paraCampo,
  precoParaCampo,
  problemaNoItem,
  type ItemDigitado,
} from '../valores';
import { FormCliente } from './GavetaCliente';

const MAX_ITENS = 100;
const OPCOES_VISIVEIS = 6;

type Linha = ItemDigitado & { chave: number };
let proximaChave = 0;
const novaLinha = (item?: ItemDigitado): Linha => ({
  chave: proximaChave++,
  ...(item ?? { descricao: '', quantidade: '1', unidade: 'un', preco: '' }),
});

// Rota de Novo orçamento e de Editar orçamento.
export function GavetaFormOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: orcamentos, isLoading } = useOrcamentos();
  const orcamento = id ? orcamentos?.find((o) => o.id === id) : undefined;

  if (id && !orcamento) {
    return (
      <Gaveta titulo="Editar orçamento" aoFechar={() => navigate('/orcamentos')}>
        {isLoading ? <p className="suave carregando">Carregando…</p> : <EstadoVazio titulo="Orçamento não encontrado" texto="Volte e atualize a lista de orçamentos." />}
      </Gaveta>
    );
  }
  return <FormOrcamento key={id ?? 'novo'} orcamento={orcamento} />;
}

function SeletorCliente({ onEscolher, onCadastrar }: { onEscolher: (id: string) => void; onCadastrar: () => void }) {
  const clientes = useClientes();
  const [busca, setBusca] = useState('');

  if (clientes.isLoading) return <p className="suave">Carregando clientes…</p>;
  if (clientes.isError)
    return (
      <div className="aviso-campo">
        <Erro>{mensagemDoErro(clientes.error)}</Erro>
        <button type="button" className="botao botao-contorno" onClick={() => void clientes.refetch()}>
          Tentar de novo
        </button>
      </div>
    );

  const todos = clientes.data ?? [];
  const encontrados = buscarClientes(todos, busca);
  const dica =
    todos.length === 0
      ? 'Nenhum cliente cadastrado ainda.'
      : encontrados.length === 0
        ? 'Nenhum cliente com essa busca.'
        : encontrados.length > OPCOES_VISIVEIS
          ? `Mais ${encontrados.length - OPCOES_VISIVEIS} na lista: refine a busca.`
          : '';

  return (
    <div className="seletor-cliente">
      {todos.length > 0 && (
        <label className="busca busca-larga">
          <Icone caminho={mdiMagnify} />
          <span className="so-leitor">Buscar cliente</span>
          <input type="search" placeholder="Buscar nome, telefone ou endereço" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      )}
      {encontrados.length > 0 && (
        <ul className="opcoes">
          {encontrados.slice(0, OPCOES_VISIVEIS).map((cliente) => (
            <li key={cliente.id}>
              <button type="button" className="opcao" onClick={() => onEscolher(cliente.id)} aria-label={`Escolher ${cliente.nome}`}>
                <strong>{cliente.nome}</strong>
                {cliente.telefone && <span>{cliente.telefone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {dica && <p className="suave">{dica}</p>}
      <button type="button" className="botao botao-texto alinha-inicio" onClick={onCadastrar}>
        <Icone caminho={mdiPlus} />
        Cadastrar cliente
      </button>
    </div>
  );
}

function FormOrcamento({ orcamento }: { orcamento?: Orcamento }) {
  const navigate = useNavigate();
  const clientes = useClientes();
  const [clienteId, setClienteId] = useState(orcamento?.clienteId ?? '');
  const [itens, setItens] = useState<Linha[]>(() =>
    orcamento
      ? orcamento.itens.map((i) =>
          novaLinha({ descricao: i.descricao, quantidade: paraCampo(i.quantidade), unidade: i.unidade, preco: precoParaCampo(i.precoUnitario) }),
        )
      : [novaLinha()],
  );
  const [pagamento, setPagamento] = useState(orcamento?.pagamento ?? '');
  const [prazo, setPrazo] = useState(orcamento?.prazo ?? '');
  const [observacoes, setObservacoes] = useState(orcamento?.observacoes ?? '');
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);

  const retrato = JSON.stringify([clienteId, itens.map((i) => [i.descricao, i.quantidade, i.unidade, i.preco]), pagamento, prazo, observacoes]);
  const [inicial] = useState(retrato);
  useGuardaAlteracoes(retrato !== inicial && !saindo);

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
  const nomeEscolhido = escolhido?.nome ?? (clienteId === orcamento?.clienteId ? orcamento.clienteNome : '');
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
      titulo={orcamento ? `Editar orçamento ${numeroDoOrcamento(orcamento.numero)}` : 'Novo orçamento'}
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
            {itens.map((item, i) => {
              const problema = tentou ? problemaNoItem(item) : null;
              const quantidade = lerNumero(item.quantidade);
              const preco = lerNumero(item.preco);
              const totalItem = quantidade !== null && preco !== null ? formatarCentavos(centavosDoItem(quantidade, preco)) : '';
              const marcar = (trecho: string) => (problema?.includes(trecho) ? ' com-erro' : '');
              return (
                <li key={item.chave} className="item-editor">
                  <div className="item-topo">
                    <span>Item {i + 1}</span>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        className="botao-icone"
                        aria-label={`Remover item ${i + 1}`}
                        title="Remover item"
                        onClick={() => setItens((lista) => lista.filter((l) => l.chave !== item.chave))}
                      >
                        <Icone caminho={mdiTrashCanOutline} />
                      </button>
                    )}
                  </div>
                  <label className={`campo${marcar('material')}`}>
                    <span className="campo-rotulo">Material</span>
                    <input value={item.descricao} onChange={(e) => mudarItem(item.chave, 'descricao', e.target.value)} maxLength={200} aria-invalid={!!marcar('material')} />
                  </label>
                  <div className="item-numeros">
                    <label className={`campo${marcar('quantidade')}`}>
                      <span className="campo-rotulo">Qtd.</span>
                      <input
                        value={item.quantidade}
                        onChange={(e) => mudarItem(item.chave, 'quantidade', e.target.value)}
                        inputMode="decimal"
                        aria-invalid={!!marcar('quantidade')}
                      />
                    </label>
                    <label className={`campo${marcar('unidade')}`}>
                      <span className="campo-rotulo">Un.</span>
                      <input value={item.unidade} onChange={(e) => mudarItem(item.chave, 'unidade', e.target.value)} maxLength={10} aria-invalid={!!marcar('unidade')} />
                    </label>
                    <label className={`campo${marcar('preço')}`}>
                      <span className="campo-rotulo">Preço unit.</span>
                      <span className="com-prefixo">
                        <span aria-hidden="true">R$</span>
                        <input value={item.preco} onChange={(e) => mudarItem(item.chave, 'preco', e.target.value)} inputMode="decimal" aria-invalid={!!marcar('preço')} />
                      </span>
                    </label>
                  </div>
                  {problema ? (
                    <p className="item-erro" role="alert">
                      {problema}
                    </p>
                  ) : (
                    <p className="item-total">{totalItem && `Total do item: ${totalItem}`}</p>
                  )}
                </li>
              );
            })}
          </ol>
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
