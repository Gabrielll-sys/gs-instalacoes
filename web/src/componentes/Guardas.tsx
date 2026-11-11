import { useGuardaAlteracoes } from '../guardaAlteracoes';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useSessao } from '../sessao';

// Para formulários que às vezes abrem fora de uma rota própria, como o cadastro de cliente
// dentro do orçamento: o roteador só aceita uma trava por vez.
export function GuardaAlteracoes({ ativo }: { ativo: boolean }) {
  useGuardaAlteracoes(ativo);
  return null;
}

// Sem sessão, só o login. Com senha padrão, só a troca de senha.
export function Protegido() {
  const conta = useSessao();
  const { pathname } = useLocation();
  if (!conta) return <Navigate to="/login" replace />;
  if (conta.trocarSenha && pathname !== '/trocar-senha') return <Navigate to="/trocar-senha" replace />;
  return <Outlet />;
}

// O papel é conferido também na API; aqui só evita mostrar uma tela que ela recusaria.
export function SoGestor({ children }: { children: ReactNode }) {
  return useSessao()?.papel === 'gestor' ? children : <Navigate to="/" replace />;
}
