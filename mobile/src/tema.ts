import { Appearance } from 'react-native';
import { configureFonts, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const claro = {
  marinho: '#00265F',
  dourado: '#EAB827',
  branco: '#FFFFFF',
  // Papéis, para o escuro trocar só o que precisa: fundo de lista e cartão, texto e ícone que eram marinho, texto no dourado.
  superficie: '#FFFFFF',
  realce: '#00265F',
  sobreDourado: '#00265F',
  fundo: '#F1F4F8',
  texto: '#10213D',
  textoSuave: '#47566C',
  filete: '#DDE3EC',
  contorno: '#7A889C',
  atencao: '#5C4500',
  atencaoFundo: '#FFF6D9',
  envioFundo: '#E3EAF5',
  erro: '#B42318',
  erroFundo: '#FDECEA',
};

// Mesmos tons do site: fundo quase preto azulado, superfícies um tom acima, marinho mais claro nas faixas e realce azul claro.
const escuro: typeof claro = {
  ...claro,
  marinho: '#1D4689',
  superficie: '#141C2B',
  realce: '#9DBBFF',
  fundo: '#0B1220',
  texto: '#E6EBF3',
  textoSuave: '#A6B2C4',
  filete: '#26324A',
  contorno: '#5D6B82',
  atencao: '#F2D37A',
  atencaoFundo: '#3A3010',
  envioFundo: '#1C2A44',
  erro: '#FF8A80',
  erroFundo: '#3B1715',
};

// shortcut: o tema segue a configuração do aparelho na abertura do app; trocar com o app aberto só vale na próxima abertura.
// Os estilos são criados uma vez, fora dos componentes; mudar ao vivo pediria refazer todos com um contexto de tema.
export const temaEscuro = Appearance.getColorScheme() === 'dark';
export const cor = temaEscuro ? escuro : claro;

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

const base3 = temaEscuro ? MD3DarkTheme : MD3LightTheme;

export const tema = {
  ...base3,
  roundness: 3,
  colors: {
    ...base3.colors,
    primary: cor.realce,
    onPrimary: temaEscuro ? cor.fundo : cor.branco,
    primaryContainer: cor.envioFundo,
    onPrimaryContainer: cor.realce,
    secondary: cor.realce,
    secondaryContainer: cor.envioFundo,
    onSecondaryContainer: cor.realce,
    background: cor.fundo,
    surface: cor.superficie,
    onSurface: cor.texto,
    surfaceVariant: cor.fundo,
    onSurfaceVariant: cor.textoSuave,
    outline: cor.contorno,
    outlineVariant: cor.filete,
    error: cor.erro,
    errorContainer: cor.erroFundo,
    // Sem isto o menu e a snackbar herdam o lilás padrão do Material 3.
    inversePrimary: cor.dourado,
    inverseSurface: cor.marinho,
    inverseOnSurface: cor.branco,
    elevation: temaEscuro
      ? { level0: 'transparent', level1: '#182133', level2: '#1B2538', level3: '#1E293D', level4: '#202C41', level5: '#233046' }
      : { level0: 'transparent', level1: '#F8FAFC', level2: '#F4F6FA', level3: cor.fundo, level4: '#EDF1F6', level5: '#E9EEF5' },
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
