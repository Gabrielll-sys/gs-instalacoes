import { mdiEyeOffOutline, mdiEyeOutline } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { api, ErroApi, mensagemDoErro } from '../api';
import carro from '../assets/logo-gs-carro.png';
import nome from '../assets/logo-gs-nome.png';
import { Campo } from '../componentes/Campos';
import { Erro } from '../componentes/Estado';
import { Icone } from '../componentes/Icone';
import { sessao, useSessao } from '../sessao';

function mensagem(erro: unknown) {
  if (erro instanceof ErroApi && erro.status === 401) return 'Usuário ou senha incorretos. Se não lembrar, peça ao gestor para redefinir.';
  return mensagemDoErro(erro);
}

export function Login() {
  const conta = useSessao();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [tentou, setTentou] = useState(false);
  const entrar = useMutation({ mutationFn: async () => sessao.definir(await api.login(usuario.trim(), senha)) });

  if (conta) return <Navigate to={conta.trocarSenha ? '/trocar-senha' : '/'} replace />;

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (usuario.trim() && senha) entrar.mutate();
  };
  const erro = entrar.isError ? mensagem(entrar.error) : sessao.aviso();

  return (
    <div className="login">
      <div className="login-marca">
        <img src={carro} alt="" className="login-carro" />
        <img src={nome} alt="GS Instalações" className="login-nome" />
        <p>Wallbox, Padrão 220V e Manutenções</p>
      </div>
      <form className="login-painel formulario" onSubmit={enviar} noValidate>
        <Campo rotulo="Usuário" erro={tentou && !usuario.trim() ? 'Informe seu usuário.' : undefined}>
          {(props) => (
            <input {...props} value={usuario} onChange={(e) => setUsuario(e.target.value)} maxLength={50} autoCapitalize="none" autoComplete="username" autoFocus />
          )}
        </Campo>
        <Campo rotulo="Senha" erro={tentou && !senha ? 'Informe sua senha.' : undefined}>
          {(props) => (
            <div className="campo-com-botao">
              <input {...props} type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
              <button type="button" className="botao-icone" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}>
                <Icone caminho={verSenha ? mdiEyeOffOutline : mdiEyeOutline} />
              </button>
            </div>
          )}
        </Campo>
        {erro && <Erro>{erro}</Erro>}
        <button type="submit" className="botao botao-ouro botao-largo" disabled={entrar.isPending}>
          {entrar.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
