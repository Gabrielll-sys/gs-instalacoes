import { configureFonts, MD3LightTheme } from 'react-native-paper';

export const cor = {
  marinho: '#00265F',
  dourado: '#EAB827',
  branco: '#FFFFFF',
  fundo: '#F1F4F8',
  texto: '#10213D',
  textoSuave: '#47566C',
  filete: '#DDE3EC',
  atencao: '#5C4500',
  atencaoFundo: '#FFF6D9',
  envioFundo: '#E3EAF5',
  erro: '#B42318',
  erroFundo: '#FDECEA',
};

export const familia = {
  regular: 'Overpass_400Regular',
  semi: 'Overpass_600SemiBold',
  extra: 'Overpass_800ExtraBold',
  black: 'Overpass_900Black',
};

const base = configureFonts({ config: { fontFamily: familia.regular } });
// fontWeight 'normal' porque o peso já vem do arquivo da fonte; outro valor engrossaria de novo no Android.
const estilo = (fontFamily: string, fontSize: number, lineHeight: number, letterSpacing = 0) => ({
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight: 'normal' as const,
});

export const temaFab = { fonts: { labelLarge: estilo(familia.extra, 17, 22) } };

export const tema = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: cor.marinho,
    onPrimary: cor.branco,
    primaryContainer: cor.envioFundo,
    onPrimaryContainer: cor.marinho,
    secondary: cor.marinho,
    secondaryContainer: cor.envioFundo,
    onSecondaryContainer: cor.marinho,
    background: cor.fundo,
    surface: cor.branco,
    onSurface: cor.texto,
    surfaceVariant: cor.fundo,
    onSurfaceVariant: cor.textoSuave,
    outline: '#7A889C',
    outlineVariant: cor.filete,
    error: cor.erro,
    errorContainer: cor.erroFundo,
    // Sem isto o menu e a snackbar herdam o lilás padrão do Material 3.
    inversePrimary: cor.dourado,
    inverseSurface: cor.marinho,
    inverseOnSurface: cor.branco,
    elevation: {
      level0: 'transparent',
      level1: '#F8FAFC',
      level2: '#F4F6FA',
      level3: cor.fundo,
      level4: '#EDF1F6',
      level5: '#E9EEF5',
    },
  },
  fonts: {
    ...base,
    displaySmall: estilo(familia.black, 30, 34, -0.3),
    titleLarge: estilo(familia.extra, 20, 26),
    titleMedium: estilo(familia.extra, 18, 23),
    bodyLarge: estilo(familia.regular, 16, 24),
    bodyMedium: estilo(familia.regular, 14, 20),
    bodySmall: estilo(familia.regular, 14, 20),
    labelLarge: estilo(familia.semi, 15, 20),
    labelMedium: estilo(familia.extra, 13, 19, 0.4),
    labelSmall: estilo(familia.semi, 13, 18),
  },
};
