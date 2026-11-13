import { mdiImagePlusOutline } from '@mdi/js';
import { useMutation } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { api, ErroApi, mensagemDoErro, type Foto, type Ordem, type Secao } from '../api';
import { confirmar } from '../confirmar';
import { recarregarOrdens } from '../consultas';
import { enviarFotos, FotoRecusada } from '../fotos';
import { formatarCarimbo } from '../regras';
import { Erro } from './Estado';
import { Icone } from './Icone';
import { Placa } from './Placa';
import { Visualizador } from './Visualizador';

const TEXTOS: Record<Secao, { rotulo: string; vazio: string }> = {
  antes: { rotulo: 'ANTES', vazio: 'Envie fotos do local como está, antes de começar.' },
  depois: { rotulo: 'DEPOIS', vazio: 'Envie fotos do resultado quando terminar a instalação.' },
};

export function SecaoFotos({ ordem, secao, proximoPasso }: { ordem: Ordem; secao: Secao; proximoPasso: boolean }) {
  const { rotulo, vazio } = TEXTOS[secao];
  const fotos = ordem.fotos.filter((f) => f.secao === secao);
  const entrada = useRef<HTMLInputElement>(null);
  const idTitulo = useId();
  const [aberta, setAberta] = useState<number | null>(null);
  const [progresso, setProgresso] = useState({ feitas: 0, total: 0 });
  const [arrastando, setArrastando] = useState(false);

  const enviar = useMutation({
    mutationFn: (arquivos: File[]) => {
      setProgresso({ feitas: 0, total: arquivos.length });
      return enviarFotos(ordem.id, secao, arquivos, (feitas) => setProgresso({ feitas, total: arquivos.length }));
    },
    // Mesmo com falha no meio, as que já foram ficam salvas e precisam aparecer.
    onSettled: () => recarregarOrdens(),
  });

  const excluir = useMutation({
    mutationFn: (foto: Foto) => api.excluirFoto(foto.ordemId, foto.id),
    onSuccess: async () => {
      if (fotos.length <= 1) setAberta(null);
      else setAberta((i) => (i === null ? null : Math.min(i, fotos.length - 2)));
      await recarregarOrdens();
    },
  });

  const confirmarExclusao = async (foto: Foto) => {
    if (await confirmar('Excluir esta foto?', 'Ela sai da OS e do armazenamento, e isso não pode ser desfeito.', 'Excluir foto')) excluir.mutate(foto);
  };

  const erroDoEnvio = enviar.error instanceof FotoRecusada || enviar.error instanceof ErroApi ? enviar.error.message : mensagemDoErro(enviar.error);

  return (
    <section
      className={`secao-fotos${arrastando ? ' arrastando' : ''}`}
      aria-labelledby={idTitulo}
      onDragOver={(evento) => {
        if (enviar.isPending || !evento.dataTransfer.types.includes('Files')) return;
        evento.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node)) setArrastando(false);
      }}
      onDrop={(evento) => {
        evento.preventDefault();
        setArrastando(false);
        const arquivos = [...evento.dataTransfer.files].filter((a) => a.type.startsWith('image/'));
        if (arquivos.length && !enviar.isPending) enviar.mutate(arquivos);
      }}
    >
      <h3 id={idTitulo} className="so-leitor">
        Fotos de {rotulo.toLowerCase()}
      </h3>
      <div className="secao-cabecalho">
        <Placa linhas={[{ rotulo, total: fotos.length }]} />
        {fotos.length === 0 && <p className="suave">{vazio}</p>}
      </div>

      {fotos.length > 0 && (
        <ul className="grade-fotos">
          {fotos.map((foto, indice) => (
            <li key={foto.id}>
              <button
                type="button"
                className="miniatura"
                onClick={() => setAberta(indice)}
                aria-label={`Abrir foto de ${rotulo.toLowerCase()} adicionada em ${formatarCarimbo(foto.criadaEm)}`}
              >
                <img src={foto.miniaturaUrl ?? foto.url} alt="" loading="lazy" />
                <span className="carimbo">{formatarCarimbo(foto.criadaEm)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(evento) => {
          const arquivos = [...(evento.target.files ?? [])];
          evento.target.value = '';
          if (arquivos.length) enviar.mutate(arquivos);
        }}
      />
      {/* Só a seção que precisa de foto agora leva o dourado, como no app. */}
      <button
        type="button"
        className={`botao ${proximoPasso ? 'botao-ouro' : 'botao-marinho'}`}
        disabled={enviar.isPending}
        onClick={() => entrada.current?.click()}
      >
        <Icone caminho={mdiImagePlusOutline} />
        Enviar fotos
      </button>
      <p className="suave" aria-live="polite">
        {enviar.isPending ? `Enviando ${Math.min(progresso.feitas + 1, progresso.total)} de ${progresso.total}…` : arrastando ? `Solte para enviar em ${rotulo}.` : ''}
      </p>
      {enviar.isError && <Erro>{erroDoEnvio}</Erro>}
      {excluir.isError && <Erro>{mensagemDoErro(excluir.error)}</Erro>}

      {aberta !== null && fotos.length > 0 && (
        <Visualizador fotos={fotos} rotulo={rotulo} indice={aberta} aoFechar={() => setAberta(null)} aoExcluir={(foto) => void confirmarExclusao(foto)} />
      )}
    </section>
  );
}
