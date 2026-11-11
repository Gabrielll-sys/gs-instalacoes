import { mdiTrashCanOutline } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, mensagemDoErro, type Cliente, type DadosCliente } from '../api';
import { Campo } from '../componentes/Campos';
import { Erro, EstadoVazio } from '../componentes/Estado';
import { Gaveta } from '../componentes/Gaveta';
import { GuardaAlteracoes } from '../componentes/Guardas';
import { Icone } from '../componentes/Icone';
import { confirmar, DESCARTAR } from '../confirmar';
import { recarregarClientes, useClientes } from '../consultas';

const VAZIO: DadosCliente = { nome: '', telefone: '', email: '', documento: '', endereco: '' };
const CAMPOS = Object.keys(VAZIO) as (keyof DadosCliente)[];
const copiar = (origem: DadosCliente, mudar = (v: string) => v) =>
  Object.fromEntries(CAMPOS.map((k) => [k, mudar(origem[k])])) as DadosCliente;

// Rota de Novo cliente e de Editar cliente.
export function GavetaCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: clientes, isLoading } = useClientes();
  const cliente = id ? clientes?.find((c) => c.id === id) : undefined;
  const voltar = () => navigate('/clientes');

  if (id && !cliente) {
    return (
      <Gaveta titulo="Editar cliente" aoFechar={voltar}>
        {isLoading ? <p className="suave carregando">Carregando…</p> : <EstadoVazio titulo="Cliente não encontrado" texto="Volte e atualize a lista de clientes." />}
      </Gaveta>
    );
  }
  return <FormCliente key={id ?? 'novo'} cliente={cliente} aoFechar={voltar} aoSalvar={voltar} naRota />;
}

// Também abre por cima do formulário de orçamento, sem rota própria: ali o cliente criado já volta escolhido.
export function FormCliente({
  cliente,
  aoFechar,
  aoSalvar,
  naRota = false,
}: {
  cliente?: Cliente;
  aoFechar: () => void;
  aoSalvar: (cliente: Cliente) => void;
  naRota?: boolean;
}) {
  const inicial = cliente ?? VAZIO;
  const [dados, setDados] = useState(() => copiar(inicial));
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const limpo = copiar(dados, (v) => v.trim());
  const alterado = CAMPOS.some((k) => dados[k] !== inicial[k]);

  const salvar = useMutation({
    mutationFn: () => (cliente ? api.salvarCliente(cliente.id, limpo) : api.criarCliente(limpo)),
    onSuccess: async (salvo) => {
      await recarregarClientes();
      aoSalvar(salvo);
    },
    onError: () => setSaindo(false),
  });

  const excluir = useMutation({
    mutationFn: () => api.excluirCliente(cliente!.id),
    onSuccess: async () => {
      await recarregarClientes();
      aoFechar();
    },
    onError: () => setSaindo(false),
  });

  const semNome = !limpo.nome;
  const emailInvalido = !!limpo.email && !limpo.email.includes('@');

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (semNome || emailInvalido) return;
    setSaindo(true);
    salvar.mutate();
  };

  // Na rota, quem pergunta antes de descartar é a trava do roteador; por cima do orçamento, é aqui.
  const fechar = async () => {
    if (naRota || !alterado || (await confirmar(...DESCARTAR))) aoFechar();
  };

  const confirmarExclusao = async () => {
    if (!(await confirmar(`Excluir ${cliente!.nome}?`, 'O cadastro some da lista. Cliente com orçamento não pode ser excluído.', 'Excluir cliente'))) return;
    setSaindo(true);
    excluir.mutate();
  };

  const campo = (nome: keyof DadosCliente) => ({
    value: dados[nome],
    onChange: (e: { target: { value: string } }) => setDados((d) => ({ ...d, [nome]: e.target.value })),
  });

  return (
    <Gaveta
      titulo={cliente ? 'Editar cliente' : 'Novo cliente'}
      aoFechar={() => void fechar()}
      acoes={
        cliente && (
          <button type="button" className="botao-icone claro" aria-label="Excluir cliente" title="Excluir cliente" onClick={() => void confirmarExclusao()} disabled={excluir.isPending}>
            <Icone caminho={mdiTrashCanOutline} />
          </button>
        )
      }
      rodape={
        <button type="submit" form="form-cliente" className="botao botao-ouro botao-largo" disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : cliente ? 'Salvar' : 'Cadastrar cliente'}
        </button>
      }
    >
      {naRota && <GuardaAlteracoes ativo={alterado && !saindo} />}
      <form id="form-cliente" className="formulario bloco-branco" onSubmit={enviar} noValidate>
        <Campo rotulo="Nome" erro={tentou && semNome ? 'Informe o nome do cliente.' : undefined} dica="Pessoa ou empresa, como vai aparecer no orçamento.">
          {(props) => <input {...props} {...campo('nome')} maxLength={200} data-foco={!cliente || undefined} autoComplete="off" />}
        </Campo>
        <Campo rotulo="Telefone">{(props) => <input {...props} {...campo('telefone')} type="tel" maxLength={30} autoComplete="off" />}</Campo>
        <Campo rotulo="E-mail" erro={tentou && emailInvalido ? 'Confira o e-mail.' : undefined}>
          {(props) => <input {...props} {...campo('email')} type="email" maxLength={200} autoComplete="off" />}
        </Campo>
        <Campo rotulo="CPF ou CNPJ">{(props) => <input {...props} {...campo('documento')} maxLength={20} autoComplete="off" />}</Campo>
        <Campo rotulo="Endereço" dica="Rua, número, complemento, bairro, cidade e CEP, do jeito que deve sair no orçamento.">
          {(props) => <textarea {...props} {...campo('endereco')} maxLength={500} rows={3} />}
        </Campo>

        {salvar.isError && <Erro>{mensagemDoErro(salvar.error)}</Erro>}
        {excluir.isError && <Erro>{mensagemDoErro(excluir.error)}</Erro>}
      </form>
    </Gaveta>
  );
}
