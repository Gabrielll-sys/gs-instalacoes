import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, mensagemDoErro, type Conta } from '../api';
import { Campo, Interruptor } from '../componentes/Campos';
import { useGuardaAlteracoes } from '../guardaAlteracoes';
import { Erro, EstadoVazio } from '../componentes/Estado';
import { Gaveta } from '../componentes/Gaveta';
import { recarregarEquipe, useContas } from '../consultas';
import type { Papel } from '../sessao';

// A mesma de Usuario.SenhaPadrao no servidor: só aparece na tela para o gestor avisar a pessoa.
const SENHA_PADRAO = '1234';
const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: 'tecnico', rotulo: 'Técnico' },
  { valor: 'gestor', rotulo: 'Gestor' },
];

// Rota de Nova conta e de Editar conta.
export function GavetaConta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: contas, isLoading } = useContas();
  const conta = id ? contas?.find((c) => c.id === id) : undefined;

  if (id && !conta) {
    return (
      <Gaveta titulo="Editar conta" aoFechar={() => navigate('/equipe')}>
        {isLoading ? <p className="suave carregando">Carregando…</p> : <EstadoVazio titulo="Conta não encontrada" texto="Volte e atualize a lista da equipe." />}
      </Gaveta>
    );
  }
  // Sem gestor ativo, ninguém mais gerenciaria a equipe: a API recusa, e a tela já nem oferece a troca.
  const unicoGestor =
    conta?.papel === 'gestor' && conta.ativo && !contas?.some((c) => c.id !== conta.id && c.papel === 'gestor' && c.ativo);
  return <FormConta key={id ?? 'nova'} conta={conta} unicoGestor={!!unicoGestor} />;
}

function FormConta({ conta, unicoGestor }: { conta?: Conta; unicoGestor: boolean }) {
  const navigate = useNavigate();
  const [nome, setNome] = useState(conta?.nome ?? '');
  const [login, setLogin] = useState('');
  const [papel, setPapel] = useState<Papel>(conta?.papel ?? 'tecnico');
  const [ativo, setAtivo] = useState(conta?.ativo ?? true);
  const [redefinir, setRedefinir] = useState(false);
  const [tentou, setTentou] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!conta) {
        await api.criarConta({ login: login.trim(), nome: nome.trim(), papel });
        return;
      }
      await api.salvarConta(conta.id, { nome: nome.trim(), papel, ativo });
      if (redefinir) await api.redefinirSenha(conta.id);
    },
    onSuccess: async () => {
      await recarregarEquipe();
      navigate('/equipe');
    },
    onError: () => setSaindo(false),
  });

  const alterado =
    nome !== (conta?.nome ?? '') || login !== '' || papel !== (conta?.papel ?? 'tecnico') || ativo !== (conta?.ativo ?? true) || redefinir;
  useGuardaAlteracoes(alterado && !saindo);

  const semNome = !nome.trim();
  const semLogin = !conta && !login.trim();
  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (semNome || semLogin) return;
    setSaindo(true);
    salvar.mutate();
  };

  return (
    <Gaveta
      titulo={conta ? 'Editar conta' : 'Nova conta'}
      aoFechar={() => navigate('/equipe')}
      rodape={
        <button type="submit" form="form-conta" className="botao botao-ouro botao-largo" disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : conta ? 'Salvar' : 'Criar conta'}
        </button>
      }
    >
      <form id="form-conta" className="formulario bloco-branco" onSubmit={enviar} noValidate>
        <Campo rotulo="Nome" erro={tentou && semNome ? 'Informe o nome.' : undefined} dica="Aparece no relatório e, se for técnico, no seletor de responsáveis.">
          {(props) => <input {...props} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} data-foco={!conta || undefined} />}
        </Campo>

        {conta ? (
          <div className="leitura">
            <span>Usuário</span>
            <strong>{conta.login}</strong>
          </div>
        ) : (
          <Campo rotulo="Usuário" erro={tentou && semLogin ? 'Informe o usuário.' : undefined} dica="Usado para entrar. Sem espaços nem acentos, como ana.souza.">
            {(props) => <input {...props} value={login} onChange={(e) => setLogin(e.target.value)} maxLength={50} autoCapitalize="none" autoComplete="off" />}
          </Campo>
        )}

        <fieldset className="campo">
          <legend>Papel</legend>
          <div className="chips" role="radiogroup" aria-label="Papel">
            {PAPEIS.map(({ valor, rotulo }) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={papel === valor}
                className={`chip${papel === valor ? ' ativo' : ''}`}
                disabled={unicoGestor}
                onClick={() => setPapel(valor)}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <p className="campo-ajuda">
            {unicoGestor
              ? 'Esta é a única conta de gestor, então continua gestor e ativa. Para cadastrar um técnico, use Nova conta.'
              : 'Só o gestor gera relatórios e gerencia a equipe.'}
          </p>
        </fieldset>

        {conta ? (
          <>
            <Interruptor
              rotulo="Conta ativa"
              descricao="Desativada, a pessoa perde o acesso na hora e sai do seletor de responsáveis."
              marcado={ativo}
              aoMudar={setAtivo}
              desabilitado={unicoGestor}
            />
            <Interruptor
              rotulo="Voltar para a senha padrão"
              descricao={`Para quem esqueceu a senha. Ela vira ${SENHA_PADRAO}, e a pessoa escolhe outra no próximo acesso.`}
              marcado={redefinir}
              aoMudar={setRedefinir}
            />
          </>
        ) : (
          <p className="suave">A senha inicial é {SENHA_PADRAO}. A pessoa escolhe outra no primeiro acesso.</p>
        )}

        {salvar.isError && <Erro>{mensagemDoErro(salvar.error)}</Erro>}
      </form>
    </Gaveta>
  );
}
