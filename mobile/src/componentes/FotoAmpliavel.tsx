import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import {
  ampliar,
  ENQUADRO_INICIAL,
  ESCALA_TOQUE_DUPLO,
  limitarEnquadro,
  tamanhoContido,
  type Enquadro,
  type Ponto,
  type Tamanho,
} from './zoom';

export function FotoAmpliavel({
  url,
  id,
  rotulo,
  tela,
  onTravarDeslize,
}: {
  url: string;
  id: string;
  rotulo: string;
  tela: Tamanho;
  onTravarDeslize: (travar: boolean) => void;
}) {
  const [escala] = useState(() => new Animated.Value(1));
  const [x] = useState(() => new Animated.Value(0));
  const [y] = useState(() => new Animated.Value(0));
  const [ampliada, setAmpliada] = useState(false);
  const atual = useRef(ENQUADRO_INICIAL);
  const inicio = useRef(ENQUADRO_INICIAL);
  const focoInicial = useRef<Ponto>({ x: 0, y: 0 });
  const imagem = useRef(tela);

  const aplicar = (enquadro: Enquadro) => {
    atual.current = enquadro;
    escala.setValue(enquadro.escala);
    x.setValue(enquadro.x);
    y.setValue(enquadro.y);
    const maior = enquadro.escala > 1;
    setAmpliada(maior);
    onTravarDeslize(maior);
  };

  // O gesto informa o ponto a partir do canto da tela; as regras contam a partir do centro.
  const aPartirDoCentro = (e: Ponto): Ponto => ({ x: e.x - tela.largura / 2, y: e.y - tela.altura / 2 });

  const pinca = usePinchGesture({
    runOnJS: true,
    // Trava antes de a pinça ativar: dois dedos andando para o lado também pareceriam um deslize.
    onTouchesDown: (e) => {
      if (e.numberOfTouches > 1) onTravarDeslize(true);
    },
    onActivate: (e) => {
      inicio.current = atual.current;
      focoInicial.current = aPartirDoCentro({ x: e.focalX, y: e.focalY });
    },
    onUpdate: (e) => {
      const foco = aPartirDoCentro({ x: e.focalX, y: e.focalY });
      aplicar(ampliar(inicio.current, focoInicial.current, foco, e.scale, imagem.current, tela));
    },
    onFinalize: () => onTravarDeslize(atual.current.escala > 1),
  });

  // Em tamanho normal, arrastar com um dedo continua trocando de foto.
  const arrasto = usePanGesture({
    runOnJS: true,
    enabled: ampliada,
    maxPointers: 1,
    onActivate: () => {
      inicio.current = atual.current;
    },
    onUpdate: (e) => {
      const { escala: s, x: x0, y: y0 } = inicio.current;
      aplicar(limitarEnquadro({ escala: s, x: x0 + e.translationX, y: y0 + e.translationY }, imagem.current, tela));
    },
  });

  // Dá para ampliar com uma mão só, sem depender de dois dedos.
  const toqueDuplo = useTapGesture({
    runOnJS: true,
    numberOfTaps: 2,
    // Sem limite, dois arrastes rápidos contariam como toque duplo e desfariam o zoom.
    maxDistance: 24,
    onActivate: (e) => {
      const foco = aPartirDoCentro({ x: e.x, y: e.y });
      aplicar(
        atual.current.escala > 1
          ? ENQUADRO_INICIAL
          : ampliar(ENQUADRO_INICIAL, foco, foco, ESCALA_TOQUE_DUPLO, imagem.current, tela),
      );
    },
  });

  const gestos = useSimultaneousGestures(pinca, arrasto, toqueDuplo);

  return (
    <GestureDetector gesture={gestos}>
      {/* A View fixa recebe os gestos: medir na foto transformada faria o foco andar junto com ela. */}
      <View style={{ width: tela.largura, height: tela.altura, overflow: 'hidden' }}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: x }, { translateY: y }, { scale: escala }] }}>
          <Image
            source={{ uri: url }}
            recyclingKey={id}
            contentFit="contain"
            accessibilityLabel={rotulo}
            onLoad={(e) => {
              imagem.current = tamanhoContido({ largura: e.source.width, altura: e.source.height }, tela);
            }}
            style={{ width: tela.largura, height: tela.altura }}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
