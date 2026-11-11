import { createContext } from 'react';

// O <dialog> modal fica numa camada acima de tudo: o que abre por cima dele (o visualizador de fotos)
// precisa ser montado dentro dele, ou ficaria escondido e sem clique.
export const RaizDaGaveta = createContext<HTMLDialogElement | null>(null);
