// Regras puras do zoom, sem imports nativos para poderem rodar em `node --test`.

export type Tamanho = { largura: number; altura: number };
export type Ponto = { x: number; y: number };
// x e y são o deslocamento do centro da foto em relação ao centro da tela.
export type Enquadro = Ponto & { escala: number };

export const ENQUADRO_INICIAL: Enquadro = { escala: 1, x: 0, y: 0 };
export const ESCALA_TOQUE_DUPLO = 2.5;
const ESCALA_MAXIMA = 5;

// O + 0 transforma -0 em 0: sem folga, o limite inferior é -0.
const limitarValor = (valor: number, minimo: number, maximo: number) => Math.min(Math.max(valor, minimo), maximo) + 0;

// A foto aparece inteira na tela, então sobra faixa preta em um dos lados.
export function tamanhoContido(imagem: Tamanho, tela: Tamanho): Tamanho {
  const fator = Math.min(tela.largura / imagem.largura, tela.altura / imagem.altura);
  return { largura: imagem.largura * fator, altura: imagem.altura * fator };
}

// Impede arrastar a foto para fora: o deslocamento só existe onde ela passa da tela.
export function limitarEnquadro(enquadro: Enquadro, imagem: Tamanho, tela: Tamanho): Enquadro {
  const maxX = Math.max(0, (imagem.largura * enquadro.escala - tela.largura) / 2);
  const maxY = Math.max(0, (imagem.altura * enquadro.escala - tela.altura) / 2);
  return {
    escala: enquadro.escala,
    x: limitarValor(enquadro.x, -maxX, maxX),
    y: limitarValor(enquadro.y, -maxY, maxY),
  };
}

// Mantém sob os dedos o ponto da foto que estava lá quando a pinça começou.
export function ampliar(
  inicio: Enquadro,
  focoInicial: Ponto,
  focoAtual: Ponto,
  fator: number,
  imagem: Tamanho,
  tela: Tamanho,
): Enquadro {
  const escala = limitarValor(inicio.escala * fator, 1, ESCALA_MAXIMA);
  return limitarEnquadro(
    {
      escala,
      x: focoAtual.x - ((focoInicial.x - inicio.x) / inicio.escala) * escala,
      y: focoAtual.y - ((focoInicial.y - inicio.y) / inicio.escala) * escala,
    },
    imagem,
    tela,
  );
}
