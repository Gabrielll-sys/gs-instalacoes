import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, mensagemDoErro } from '../api';
import carro from '../assets/logo-gs-carro.png';
import { Campo } from '../componentes/Campos';
import { Erro } from '../componentes/Estado';
import { sessao, useSessao } from '../sessao';

const MINIMO = 8;

export function TrocarSenha() {
  const navigate = useNavigate();
  const obrigatoria = useSessao()?.trocarSenha ?? false;
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [ver, setVer] = useState(false);
  const [tentou, setTentou] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => sessao.definir(await api.trocarSenha(atual, nova)),
    onSuccess: () => navigate('/', { replace: true }),
  });

  const novaCurta = nova.length < MINIMO;
  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (atual && !novaCurta) salvar.mutate();
  };

  return (
    <div className="pagina-simples">
      <header className="faixa-simples">
        <img src={carro} alt="" />
        <h1>{obrigatoria ? 'Escolha sua senha' : 'Trocar senha'}</h1>
      </header>
      <form className="formulario pagina-simples-corpo" onSubmit={enviar} noValidate>
        {obrigatoria && <p>Você entrou com a senha padrão. Escolha uma só sua para continuar.</p>}
        <Campo rotulo={obrigatoria ? 'Senha padrão' : 'Senha atual'} erro={tentou && !atual ? 'Informe a senha que você usou para entrar.' : undefined}>
          {(props) => <input {...props} type={ver ? 'text' : 'password'} value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" autoFocus />}
        </Campo>
        <Campo rotulo="Nova senha" erro={tentou && novaCurta ? `Ao menos ${MINIMO} caracteres.` : undefined} dica={`Ao menos ${MINIMO} caracteres.`}>
          {(props) => <input {...props} type={ver ? 'text' : 'password'} value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" />}
        </Campo>
        <label className="marcar">
          <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
          Mostrar as senhas
        </label>
        {salvar.isError && <Erro>{mensagemDoErro(salvar.error)}</Erro>}
        <div className="linha-botoes">
          <button type="submit" className="botao botao-ouro" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar senha'}
          </button>
          {obrigatoria ? (
            <button type="button" className="botao botao-texto" onClick={() => sessao.sair()}>
              Sair
            </button>
          ) : (
            <Link to="/" className="botao botao-texto">
              Voltar
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
