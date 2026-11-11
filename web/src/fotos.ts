import { api, ErroApi, type Secao } from './api';
import { LIMITE_FOTO_BYTES, PASSOS_COMPRESSAO } from './regras';

export class FotoRecusada extends Error {}

const paraBlob = (canvas: HTMLCanvasElement, tipo: string, qualidade: number) =>
  new Promise<Blob>((pronto, falha) =>
    canvas.toBlob((blob) => (blob ? pronto(blob) : falha(new Error('O navegador não gerou a imagem.'))), tipo, qualidade),
  );

// Mesma compressão do app: WebP visualmente sem perda, até 4 MB. O navegador aplica a rotação do EXIF
// ao abrir a imagem, e o arquivo gerado sai sem metadados, inclusive sem GPS.
async function compactar(arquivo: File) {
  let imagem: ImageBitmap;
  try {
    imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  } catch {
    throw new FotoRecusada(`${arquivo.name}: este navegador não abre esse formato. Use JPG, PNG ou WebP.`);
  }
  try {
    for (const { lado, qualidade } of PASSOS_COMPRESSAO) {
      const escala = Math.min(1, lado / Math.max(imagem.width, imagem.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(imagem.width * escala);
      canvas.height = Math.round(imagem.height * escala);
      canvas.getContext('2d')!.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      // Navegador sem WebP no canvas devolve PNG; nesse caso vai JPEG na mesma qualidade.
      let blob = await paraBlob(canvas, 'image/webp', qualidade);
      if (blob.type !== 'image/webp') blob = await paraBlob(canvas, 'image/jpeg', qualidade);
      if (blob.size <= LIMITE_FOTO_BYTES) return blob;
    }
  } finally {
    imagem.close();
  }
  throw new FotoRecusada(`${arquivo.name}: passa de 4 MB mesmo compactada.`);
}

async function enviarUma(ordemId: string, secao: Secao, arquivo: File) {
  const blob = await compactar(arquivo);
  const fotoId = crypto.randomUUID();
  const criadaEm = new Date().toISOString();
  const { uploadUrl } = await api.urlDeUpload(ordemId, fotoId, blob.type);
  const envio = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob }).catch(() => null);
  if (!envio?.ok) throw new ErroApi(envio?.status ?? 0, 'o armazenamento não recebeu a foto.');
  await api.registrarFoto(ordemId, fotoId, { secao, contentType: blob.type, criadaEm });
}

// Só online: cada foto vai inteira (compactar, enviar ao armazenamento, registrar) antes da próxima.
// Uma que falha não para as outras: no fim, a mensagem diz quais faltaram para enviar de novo.
export async function enviarFotos(ordemId: string, secao: Secao, arquivos: File[], aoAvancar: (feitas: number) => void) {
  const falhas: string[] = [];
  for (const [indice, arquivo] of arquivos.entries()) {
    try {
      await enviarUma(ordemId, secao, arquivo);
    } catch (erro) {
      const motivo = erro instanceof FotoRecusada ? erro.message : erro instanceof ErroApi && erro.status ? `${arquivo.name}: ${erro.message}` : `${arquivo.name}: sem conexão com o servidor.`;
      falhas.push(motivo);
    }
    aoAvancar(indice + 1);
  }
  if (falhas.length)
    throw new FotoRecusada(
      `${falhas.length === arquivos.length ? 'Nenhuma foto foi enviada' : `${falhas.length} de ${arquivos.length} fotos não foram enviadas`}. ${falhas.join(' ')} Envie de novo as que faltaram.`,
    );
}
