import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useMemo } from 'react';
import { Alert, Linking } from 'react-native';
import { api } from './api';
import { apagarArquivo, arquivoFoto, CHAVE_ORDENS, opEmExecucao, pastaFotos, queryClient, sincronizar } from './sync/motor';
import { outbox, useOutbox } from './sync/outbox';
import { aplicarOutbox, LIMITE_FOTO_BYTES, PASSOS_COMPRESSAO, type DadosOrdem, type Secao } from './sync/regras';

export function useOrdens() {
  const consulta = useQuery({ queryKey: CHAVE_ORDENS, queryFn: api.listarOrdens });
  const ops = useOutbox();
  const ordens = useMemo(
    () => aplicarOutbox(consulta.data ?? [], ops, (arquivo) => arquivoFoto(arquivo).uri),
    [consulta.data, ops],
  );
  return { ordens, consulta };
}

export async function salvarOrdem(ordem: DadosOrdem) {
  await outbox.adicionar({ id: randomUUID(), tipo: 'salvar-ordem', ordem });
  void sincronizar();
}

// Só online: a exclusão apaga também as fotos do armazenamento, e uma OS com algo ainda na fila
// voltaria a existir quando a fila chegasse ao servidor.
export async function excluirOrdem(ordemId: string) {
  if (outbox.snapshot().some((op) => op.estado !== 'feito' && (op.tipo === 'salvar-ordem' ? op.ordem.id : op.tipo === 'enviar-foto' ? op.foto.ordemId : op.ordemId) === ordemId))
    throw new Error('Esta OS ainda tem envio na fila. Espere terminar e tente de novo.');
  await api.excluirOrdem(ordemId);
  await queryClient.invalidateQueries({ queryKey: CHAVE_ORDENS });
}

export type Origem = 'camera' | 'galeria';

// quality 1 entrega o arquivo original: a compressão é feita uma vez só, em compactar.
const OPCOES_FOTO: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
const CHAVE_ALVO_CAMERA = 'os.alvo-camera';

export class FotoGrandeDemais extends Error {
  constructor() {
    super('Esta foto passa de 4 MB e não pôde ser reduzida. Tente outra foto.');
  }
}

// O carregamento aplica a rotação do EXIF; o WebP salvo sai sem metadados, inclusive sem GPS.
async function compactar(asset: ImagePicker.ImagePickerAsset) {
  try {
    for (const { lado, qualidade } of PASSOS_COMPRESSAO) {
      const contexto = ImageManipulator.manipulate(asset.uri, { maxWidth: lado, maxHeight: lado });
      const imagem = await contexto.renderAsync();
      const { uri } = await imagem.saveAsync({ format: SaveFormat.WEBP, compress: qualidade });
      imagem.release();
      contexto.release();
      const arquivo = new File(uri);
      if ((arquivo.info().size ?? Infinity) <= LIMITE_FOTO_BYTES) return { arquivo, contentType: 'image/webp', extensao: '.webp' };
      arquivo.delete();
    }
  } catch (erro) {
    console.warn('Falha ao compactar a foto', erro);
  }
  // Foto tirada não se perde: se a compressão falhar, segue a original, desde que caiba no limite.
  const original = new File(asset.uri);
  if ((original.info().size ?? Infinity) > LIMITE_FOTO_BYTES) throw new FotoGrandeDemais();
  return { arquivo: original, contentType: asset.mimeType ?? 'image/jpeg', extensao: asset.uri.match(/\.\w+$/)?.[0] ?? '.jpg' };
}

async function enfileirar(assets: ImagePicker.ImagePickerAsset[], ordemId: string, secao: Secao) {
  const pasta = pastaFotos();
  if (!pasta.exists) pasta.create({ intermediates: true });

  for (const asset of assets) {
    const id = randomUUID();
    const { arquivo, contentType, extensao } = await compactar(asset);
    const nome = `${id}${extensao}`;
    // Copia para fora do cache, que o sistema pode limpar antes da internet voltar.
    // A cópia é assíncrona no SDK 58: sem await, o temporário seria apagado no meio dela e a foto entraria na fila sem arquivo.
    await arquivo.copy(arquivoFoto(nome));
    // O original do seletor tem vários MB e já não serve: sem isto o cache do celular só cresce.
    for (const temporario of new Set([arquivo.uri, asset.uri])) {
      try {
        new File(temporario).delete();
      } catch {
        // Sobra no cache não atrapalha; o sistema limpa depois.
      }
    }
    await outbox.adicionar({
      id: randomUUID(),
      tipo: 'enviar-foto',
      foto: { id, ordemId, secao, criadaEm: new Date().toISOString(), arquivo: nome, contentType },
    });
  }
  void sincronizar();
}

export async function adicionarFotos(ordemId: string, secao: Secao, origem: Origem) {
  if (origem === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Câmera bloqueada', 'Libere o acesso à câmera nas configurações do aparelho para tirar fotos.', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
  }

  // Anota o destino antes de abrir a câmera: o Android pode matar o app enquanto ela está aberta.
  await AsyncStorage.setItem(CHAVE_ALVO_CAMERA, JSON.stringify({ ordemId, secao }));
  const resultado =
    origem === 'camera'
      ? await ImagePicker.launchCameraAsync(OPCOES_FOTO)
      : await ImagePicker.launchImageLibraryAsync({ ...OPCOES_FOTO, allowsMultipleSelection: true, selectionLimit: 20 });
  await AsyncStorage.removeItem(CHAVE_ALVO_CAMERA);

  if (!resultado.canceled) await enfileirar(resultado.assets, ordemId, secao);
}

// Se o Android matou o app durante a câmera, a foto tirada volta por aqui na próxima abertura.
export async function recuperarFotoDaCamera() {
  const pendente = await ImagePicker.getPendingResultAsync();
  const alvo = await AsyncStorage.getItem(CHAVE_ALVO_CAMERA);
  await AsyncStorage.removeItem(CHAVE_ALVO_CAMERA);

  if (!pendente || !alvo || !('assets' in pendente) || !pendente.assets) return;
  const { ordemId, secao } = JSON.parse(alvo);
  await enfileirar(pendente.assets, ordemId, secao);
}

export async function excluirFoto(ordemId: string, fotoId: string) {
  const envio = outbox.snapshot().find((op) => op.tipo === 'enviar-foto' && op.foto.id === fotoId);

  // Ainda não foi ao servidor: basta tirar da fila. Em execução ou já feita, a exclusão entra depois dela.
  if (envio?.tipo === 'enviar-foto' && envio.estado !== 'feito' && envio.id !== opEmExecucao()) {
    await outbox.remover([envio.id]);
    apagarArquivo(envio.foto.arquivo);
    return;
  }

  await outbox.adicionar({ id: randomUUID(), tipo: 'excluir-foto', ordemId, fotoId });
  void sincronizar();
}

export async function tentarErrosDeNovo() {
  for (const op of outbox.snapshot()) {
    if (op.estado === 'erro') await outbox.marcar(op.id, { estado: 'pendente', erro: undefined });
  }
  void sincronizar();
}
