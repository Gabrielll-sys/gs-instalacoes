import { mdiTrashCanOutline } from '@mdi/js';
import { useContext, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/plugins/captions.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import type { Foto } from '../api';
import { formatarData } from '../regras';
import { RaizDaGaveta } from './raizDaGaveta';
import { Icone } from './Icone';

// Tela cheia: setas e teclado trocam de foto dentro da seção; roda, pinça ou toque duplo ampliam até 5x.
export function Visualizador({
  fotos,
  rotulo,
  indice,
  aoFechar,
  aoExcluir,
}: {
  fotos: Foto[];
  rotulo: string;
  indice: number;
  aoFechar: () => void;
  aoExcluir: (foto: Foto) => void;
}) {
  const raiz = useContext(RaizDaGaveta);
  const [atual, setAtual] = useState(indice);

  return (
    <Lightbox
      open
      close={aoFechar}
      index={indice}
      portal={{ root: raiz }}
      plugins={[Zoom, Captions]}
      zoom={{ maxZoomPixelRatio: 5, scrollToZoom: true }}
      captions={{ descriptionTextAlign: 'start' }}
      carousel={{ finite: true }}
      on={{ view: ({ index }) => setAtual(index) }}
      slides={fotos.map((foto, i) => ({
        src: foto.url,
        alt: `Foto ${i + 1} de ${fotos.length} de ${rotulo.toLowerCase()}`,
        title: `${rotulo} ${i + 1} de ${fotos.length}`,
        description: `Adicionada em ${formatarData(foto.criadaEm)}`,
      }))}
      toolbar={{
        buttons: [
          <button key="excluir" type="button" className="yarl__button" aria-label="Excluir foto" title="Excluir foto" onClick={() => aoExcluir(fotos[atual])}>
            <Icone caminho={mdiTrashCanOutline} tamanho={26} />
          </button>,
          'close',
        ],
      }}
      labels={{
        Previous: 'Foto anterior',
        Next: 'Próxima foto',
        Close: 'Fechar',
        Lightbox: 'Fotos em tela cheia',
        'Photo gallery': 'Fotos',
        '{index} of {total}': '{index} de {total}',
        'Zoom in': 'Ampliar',
        'Zoom out': 'Reduzir',
      }}
      className="visualizador"
    />
  );
}
