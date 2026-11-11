import '@fontsource/overpass/400.css';
import '@fontsource/overpass/600.css';
import '@fontsource/overpass/800.css';
import '@fontsource/overpass/900.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { Casca } from './componentes/Casca';
import { Protegido, SoGestor } from './componentes/Guardas';
import { queryClient } from './consultas';
// Em ordem: cada arquivo pode sobrepor o anterior, e o responsivo vem por último.
import './estilos/base.css';
import './estilos/casca.css';
import './estilos/gaveta.css';
import './estilos/formularios.css';
import './estilos/orcamentos.css';
import './estilos/responsivo.css';
import { Clientes } from './paginas/Clientes';
import { Equipe } from './paginas/Equipe';
import { GavetaCliente } from './paginas/GavetaCliente';
import { GavetaConta } from './paginas/GavetaConta';
import { GavetaFormOrdem } from './paginas/GavetaFormOrdem';
import { GavetaFormOrcamento } from './paginas/GavetaFormOrcamento';
import { GavetaOrcamento } from './paginas/GavetaOrcamento';
import { GavetaOrdem } from './paginas/GavetaOrdem';
import { ListaOrdens } from './paginas/ListaOrdens';
import { Login } from './paginas/Login';
import { Orcamentos } from './paginas/Orcamentos';
import { TrocarSenha } from './paginas/TrocarSenha';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <Protegido />,
    children: [
      { path: '/trocar-senha', element: <TrocarSenha /> },
      {
        element: <Casca />,
        children: [
          {
            path: '/',
            element: <ListaOrdens />,
            children: [
              { path: 'ordens/nova', element: <GavetaFormOrdem /> },
              { path: 'ordens/:id', element: <GavetaOrdem /> },
              { path: 'ordens/:id/editar', element: <GavetaFormOrdem /> },
            ],
          },
          {
            path: '/equipe',
            element: (
              <SoGestor>
                <Equipe />
              </SoGestor>
            ),
            children: [
              { path: 'nova', element: <GavetaConta /> },
              { path: ':id', element: <GavetaConta /> },
            ],
          },
          {
            path: '/orcamentos',
            element: (
              <SoGestor>
                <Orcamentos />
              </SoGestor>
            ),
            children: [
              { path: 'novo', element: <GavetaFormOrcamento /> },
              { path: ':id', element: <GavetaOrcamento /> },
              { path: ':id/editar', element: <GavetaFormOrcamento /> },
            ],
          },
          {
            path: '/clientes',
            element: (
              <SoGestor>
                <Clientes />
              </SoGestor>
            ),
            children: [
              { path: 'novo', element: <GavetaCliente /> },
              { path: ':id', element: <GavetaCliente /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
