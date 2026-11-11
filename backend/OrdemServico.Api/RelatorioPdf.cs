using System.Buffers.Binary;
using System.Globalization;
using System.Reflection;
using QuestPDF.Drawing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Imagem = QuestPDF.Infrastructure.Image;

namespace OrdemServico.Api;

// Primeira página com o par antes e depois; as demais fotos seguem nas próximas, sem repetir as da capa.
public static class RelatorioPdf
{
    internal const string Marinho = "#00265F";
    internal const string Branco = "#FFFFFF";
    private const string Dourado = "#EAB827";
    internal const string Fundo = "#F1F4F8";
    internal const string Texto = "#10213D";
    internal const string TextoSuave = "#47566C";
    internal const string Filete = "#DDE3EC";
    private const string Atencao = "#5C4500";
    private const string AtencaoFundo = "#FFF6D9";
    // Marinho a 82%, em ARGB, igual ao carimbo do app.
    private const string CarimboFundo = "#D100265F";

    internal const string Regular = "Overpass-400";
    internal const string Semi = "Overpass-600";
    internal const string Extra = "Overpass-800";
    internal const string Black = "Overpass-900";

    internal const float Margem = 36;
    private const float AlturaFotoCapa = 430;
    private const float AlturaFotoGrade = 305;
    // Foto em pé ao lado de foto deitada: mais baixa, para as duas terem presença parecida.
    private const float AlturaParMisto = 250;

    private static readonly string Losango =
        $"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9"><path d="M4.5 0 9 4.5 4.5 9 0 4.5Z" fill="{Dourado}"/></svg>""";

    internal static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    internal static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    internal static readonly byte[] LogoCarro = Recurso("logo-gs-carro.png");
    internal static readonly byte[] LogoNome = Recurso("logo-gs-nome.png");

    private sealed record FotoDoRelatorio(Foto Foto, string Numero, Imagem? Imagem, bool? EmPe);

    static RelatorioPdf()
    {
        QuestPDF.Settings.License = LicenseType.Community;
        FontManager.RegisterFontWithCustomName(Regular, new MemoryStream(Recurso("Overpass_400Regular.ttf")));
        FontManager.RegisterFontWithCustomName(Semi, new MemoryStream(Recurso("Overpass_600SemiBold.ttf")));
        FontManager.RegisterFontWithCustomName(Extra, new MemoryStream(Recurso("Overpass_800ExtraBold.ttf")));
        FontManager.RegisterFontWithCustomName(Black, new MemoryStream(Recurso("Overpass_900Black.ttf")));
    }

    public static string Codigo(Guid id) => id.ToString("N")[..8].ToUpperInvariant();

    public static byte[] Gerar(Ordem ordem, IReadOnlyDictionary<Guid, byte[]?> arquivos, string emitidoPor, DateTimeOffset agora)
    {
        List<FotoDoRelatorio> Secao(string secao, string prefixo) => ordem.Fotos
            .Where(f => f.Secao == secao)
            .OrderBy(f => f.CriadaEm)
            .Select((f, i) =>
            {
                var dados = arquivos.GetValueOrDefault(f.Id);
                return new FotoDoRelatorio(f, $"{prefixo}{i + 1}", Decodificar(dados), EstaEmPe(dados));
            })
            .ToList();

        var antes = Secao(Fotos.Antes, "A");
        var depois = Secao(Fotos.Depois, "D");
        var codigo = Codigo(ordem.Id);
        var semImagem = antes.Concat(depois).Count(f => f.Imagem is null);
        var nasProximas = Math.Max(antes.Count - 1, 0) + Math.Max(depois.Count - 1, 0);

        return Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.DefaultTextStyle(x => x.FontFamily(Regular).FontSize(10).FontColor(Texto).LineHeight(1.35f));

            page.Header().Column(c =>
            {
                c.Item().ShowOnce().Element(x => FaixaCapa(x, ordem.Cliente, codigo, antes.Count, depois.Count));
                c.Item().SkipOnce().Element(x => FaixaContinuacao(x, ordem.Cliente, codigo));
            });

            page.Content().PaddingHorizontal(Margem).PaddingVertical(16).Column(c =>
            {
                c.Item().PaddingBottom(4).Row(row =>
                {
                    row.Spacing(12);
                    row.RelativeItem().Element(x => RotuloDaCapa(x, "ANTES"));
                    row.RelativeItem().Element(x => RotuloDaCapa(x, "DEPOIS"));
                });
                c.Item().Element(x => ParDeFotos(x, antes.FirstOrDefault(), depois.FirstOrDefault(), AlturaFotoCapa, "Sem fotos de ANTES", "Sem fotos de DEPOIS"));

                if (nasProximas > 0)
                    c.Item().PaddingTop(10).Text(nasProximas == 1 ? "Mais 1 foto na página seguinte." : $"Mais {nasProximas} fotos nas páginas seguintes.").FontFamily(Extra).FontColor(Marinho);

                // Junto das fotos que explica: depois dos dados, poderia sobrar sozinha numa página.
                c.Item().PaddingTop(4).Text("Horários de Brasília. A data sobre cada foto é quando ela foi adicionada à OS.").FontSize(8.5f).FontColor(TextoSuave);

                if (semImagem > 0)
                {
                    c.Item().PaddingTop(10).Background(AtencaoFundo).CornerRadius(4).Padding(8)
                        .Text(semImagem == 1
                            ? "1 foto registrada não pôde ser incluída neste PDF."
                            : $"{semImagem} fotos registradas não puderam ser incluídas neste PDF.")
                        .FontFamily(Semi).FontColor(Atencao);
                }

                // Filete à parte: como borda dos dados, ele se repetiria no topo da página seguinte.
                c.Item().PaddingTop(14).PaddingBottom(12).LineHorizontal(0.75f).LineColor(Filete);
                c.Item().Element(x => Dados(x, ordem, antes.Count, depois.Count, emitidoPor, agora));

                Grade(c, "ANTES", antes);
                Grade(c, "DEPOIS", depois);
            });

            page.Footer().PaddingHorizontal(Margem).PaddingBottom(14).BorderTop(0.75f).BorderColor(Filete).PaddingTop(6)
                .DefaultTextStyle(x => x.FontFamily(Semi).FontSize(8).FontColor(TextoSuave))
                .Row(row =>
                {
                    row.RelativeItem().Text("GS Instalações – gsinstalacoesbh.com.br – @gs_instalacoes_bh");
                    row.AutoItem().Text(t =>
                    {
                        t.Span($"OS {codigo} – Página ");
                        t.CurrentPageNumber();
                        t.Span(" de ");
                        t.TotalPages();
                    });
                });
        }))
        .WithMetadata(new DocumentMetadata
        {
            Title = $"Relatório de serviço: {ordem.Cliente}",
            Subject = $"OS {codigo}",
            Author = "GS Instalações",
            Creator = "GS Instalações",
        })
        .GeneratePdf();
    }

    private static void FaixaCapa(IContainer c, string cliente, string codigo, int antes, int depois) =>
        c.Background(Marinho).PaddingHorizontal(Margem).PaddingVertical(20).Row(row =>
        {
            row.ConstantItem(104).AlignMiddle().Column(logo =>
            {
                logo.Spacing(5);
                logo.Item().Image(LogoCarro).FitWidth();
                logo.Item().Image(LogoNome).FitWidth();
            });
            row.ConstantItem(20);
            row.RelativeItem().AlignMiddle().Column(titulo =>
            {
                titulo.Item().Text(cliente).FontFamily(Black).FontSize(22).LineHeight(1.15f).FontColor(Branco);
                titulo.Item().PaddingTop(3).Text($"Relatório de serviço – OS {codigo}").FontFamily(Semi).FontSize(11).FontColor(Branco);
            });
            row.ConstantItem(16);
            row.ConstantItem(96).AlignMiddle().Element(x => Placa(x, ("ANTES", antes), ("DEPOIS", depois)));
        });

    private static void FaixaContinuacao(IContainer c, string cliente, string codigo) =>
        c.Background(Marinho).PaddingHorizontal(Margem).PaddingVertical(8).Row(row =>
        {
            row.ConstantItem(38).AlignMiddle().Image(LogoCarro).FitWidth();
            row.ConstantItem(10);
            row.RelativeItem().AlignMiddle().Text(cliente).ClampLines(1).FontFamily(Extra).FontSize(10).FontColor(Branco);
            row.ConstantItem(10);
            row.AutoItem().AlignMiddle().Text($"OS {codigo}").FontFamily(Semi).FontSize(9).FontColor(Branco);
        });

    // A assinatura do sistema: filete branco interno, e só contagem de fotos dentro.
    private static void Placa(IContainer c, params (string Rotulo, int Total)[] linhas) =>
        c.Background(Marinho).CornerRadius(8).Padding(2.5f).Border(1.2f).BorderColor(Branco).CornerRadius(6)
            .PaddingVertical(3).PaddingHorizontal(7).Column(coluna =>
            {
                foreach (var (rotulo, total) in linhas)
                {
                    coluna.Item().Row(row =>
                    {
                        row.RelativeItem().AlignMiddle().Text(rotulo).FontFamily(Extra).FontSize(9.5f).LetterSpacing(0.03f).FontColor(Branco);
                        // O losango só significa "falta foto".
                        if (total == 0) row.AutoItem().AlignMiddle().PaddingRight(4).Width(7).Height(7).Svg(Losango);
                        row.AutoItem().PaddingLeft(6).AlignMiddle().Text(total.ToString()).FontFamily(Black).FontSize(12).EnableFontFeature("tnum").FontColor(Branco);
                    });
                }
            });

    private static void RotuloDaCapa(IContainer c, string rotulo) =>
        c.Text(rotulo).FontFamily(Black).FontSize(14).LetterSpacing(0.03f).FontColor(Marinho);

    // Duas células iguais: cada foto fica centrada na sua, e as legendas caem na mesma linha.
    private static void ParDeFotos(IContainer c, FotoDoRelatorio? a, FotoDoRelatorio? b, float altura, string? semA = null, string? semB = null)
    {
        if (a?.EmPe is { } aEmPe && b?.EmPe is { } bEmPe && aEmPe != bEmPe) altura = AlturaParMisto;

        c.Column(coluna =>
        {
            coluna.Item().Row(row =>
            {
                row.Spacing(12);
                row.RelativeItem().Element(x => FotoInteira(x, a, altura, semA));
                row.RelativeItem().Element(x => FotoInteira(x, b, altura, semB));
            });
            coluna.Item().PaddingTop(4).Row(row =>
            {
                row.Spacing(12);
                row.RelativeItem().Element(x => Legenda(x, a));
                row.RelativeItem().Element(x => Legenda(x, b));
            });
        });
    }

    private static void FotoInteira(IContainer c, FotoDoRelatorio? item, float altura, string? semFoto)
    {
        if (item is null)
        {
            if (semFoto is not null)
                c.MinHeight(altura * 0.5f).Background(Fundo).AlignCenter().AlignMiddle().Text(semFoto).FontFamily(Semi).FontColor(TextoSuave);
            return;
        }

        var data = FormatarData(item.Foto.CriadaEm);
        if (item.Imagem is { } imagem)
        {
            // Inteira, sem corte: é prova. O carimbo acompanha o canto da foto, não o da célula.
            c.AlignCenter().AlignMiddle().MaxHeight(altura).Layers(camadas =>
            {
                camadas.PrimaryLayer().Image(imagem).FitArea();
                camadas.Layer().AlignBottom().AlignLeft().Padding(4).Background(CarimboFundo).CornerRadius(3).PaddingHorizontal(5).PaddingVertical(1.5f)
                    .Text(data).FontFamily(Extra).FontSize(9.5f).EnableFontFeature("tnum").FontColor(Dourado);
            });
            return;
        }

        c.MinHeight(altura * 0.5f).Background(Fundo).Padding(12).AlignCenter().AlignMiddle().Column(aviso =>
        {
            aviso.Item().AlignCenter().Text("Esta foto não pôde ser incluída no PDF.").FontFamily(Semi);
            aviso.Item().AlignCenter().Text($"Adicionada em {data}").FontColor(TextoSuave);
        });
    }

    private static void Legenda(IContainer c, FotoDoRelatorio? item)
    {
        if (item is null) return;
        c.Text(t =>
        {
            t.Span(item.Numero).FontFamily(Extra).FontColor(Marinho);
            if (item.Foto.EnviadaPor is { } autor) t.Span($" – adicionada por {autor}").FontColor(TextoSuave);
        });
    }

    private static void Dados(IContainer c, Ordem ordem, int antes, int depois, string emitidoPor, DateTimeOffset agora) => c.Column(coluna =>
    {
        coluna.Spacing(9);
        coluna.Item().Row(row =>
        {
            row.Spacing(12);
            row.RelativeItem().Element(x => Dado(x, "Aberta em", FormatarData(ordem.AbertaEm) + (ordem.AbertaPor is { } autor ? $", por {autor}" : "")));
            row.RelativeItem().Element(x => Dado(x, "Responsáveis", string.Join(", ", ordem.Responsaveis)));
        });
        coluna.Item().Row(row =>
        {
            row.Spacing(12);
            row.RelativeItem().Element(x => Dado(x, "Situação", Situacao(antes, depois)));
            row.RelativeItem().Element(x => Dado(x, "Relatório emitido em", $"{FormatarData(agora)}, por {emitidoPor}"));
        });
        // Por último porque pode continuar na página seguinte; a largura limitada mantém a linha fácil de ler.
        if (ordem.Observacoes != "") coluna.Item().EnsureSpace(50).MaxWidth(360).Element(x => Dado(x, "Observações", ordem.Observacoes));
    });

    internal static void Dado(IContainer c, string rotulo, string valor) => c.Column(coluna =>
    {
        coluna.Item().Text(rotulo).FontFamily(Semi).FontSize(8.5f).FontColor(TextoSuave);
        coluna.Item().Text(valor).FontSize(10.5f);
    });

    private static void Grade(ColumnDescriptor c, string rotulo, List<FotoDoRelatorio> fotos)
    {
        var resto = fotos.Skip(1).ToList();
        if (resto.Count == 0) return;

        c.Item().PageBreak();
        c.Item().Decoration(secao =>
        {
            secao.Before().PaddingBottom(10).Row(row =>
            {
                row.ConstantItem(96).Element(x => Placa(x, (rotulo, fotos.Count)));
                // Repetido em toda página da seção: só vale texto que continue verdadeiro em todas.
                row.RelativeItem().PaddingLeft(10).AlignMiddle().Text($"{fotos[0].Numero} está na primeira página").FontFamily(Semi).FontColor(TextoSuave);
            });
            secao.Content().Column(linhas =>
            {
                foreach (var par in resto.Chunk(2))
                    linhas.Item().PaddingBottom(12).ShowEntire().Element(x => ParDeFotos(x, par[0], par.ElementAtOrDefault(1), AlturaFotoGrade));
            });
        });
    }

    private static string Situacao(int antes, int depois) => (antes > 0, depois > 0) switch
    {
        (true, true) => "Concluída",
        (true, false) => "Em aberto: falta foto de DEPOIS",
        (false, true) => "Em aberto: falta foto de ANTES",
        _ => "Em aberto: ainda sem fotos",
    };

    private static string FormatarData(DateTimeOffset data) =>
        TimeZoneInfo.ConvertTime(data, Brasilia).ToString("dd/MM/yyyy 'às' HH:mm", PtBr);

    // Arquivo ausente ou em formato que o gerador não abre (HEIC) vira aviso na página, sem derrubar o relatório inteiro.
    private static Imagem? Decodificar(byte[]? dados)
    {
        if (dados is null) return null;
        try
        {
            return Imagem.FromBinaryData(dados);
        }
        catch (Exception)
        {
            return null;
        }
    }

    // O QuestPDF não expõe o tamanho da imagem, e o cabeçalho do arquivo basta para saber a orientação.
    // shortcut: ignora a orientação gravada no EXIF dos JPEG antigos; errar só muda a altura do par, nunca corta a foto.
    public static bool? EstaEmPe(byte[]? d)
    {
        if (d is null || d.Length < 24) return null;
        if (d[0] == 0x89 && d[1] == 'P')
            return BinaryPrimitives.ReadInt32BigEndian(d.AsSpan(20)) > BinaryPrimitives.ReadInt32BigEndian(d.AsSpan(16));

        // WebP, o formato que o app envia: o tamanho fica no começo do bloco VP8, VP8L ou VP8X.
        if (d.Length >= 30 && d.AsSpan(0, 4).SequenceEqual("RIFF"u8) && d.AsSpan(8, 4).SequenceEqual("WEBP"u8))
        {
            var bloco = d.AsSpan(12, 4);
            if (bloco.SequenceEqual("VP8 "u8))
                return (BinaryPrimitives.ReadUInt16LittleEndian(d.AsSpan(28)) & 0x3FFF) > (BinaryPrimitives.ReadUInt16LittleEndian(d.AsSpan(26)) & 0x3FFF);
            if (bloco.SequenceEqual("VP8L"u8))
            {
                var bits = BinaryPrimitives.ReadUInt32LittleEndian(d.AsSpan(21));
                return ((bits >> 14) & 0x3FFF) > (bits & 0x3FFF);
            }
            if (bloco.SequenceEqual("VP8X"u8))
                return (d[27] | d[28] << 8 | d[29] << 16) > (d[24] | d[25] << 8 | d[26] << 16);
            return null;
        }
        if (d[0] != 0xFF || d[1] != 0xD8) return null;

        // No JPEG, percorre os blocos até o que traz as dimensões, deixando de fora os marcadores que não trazem.
        for (var i = 2; i + 9 < d.Length && d[i] == 0xFF; i += 2 + BinaryPrimitives.ReadUInt16BigEndian(d.AsSpan(i + 2)))
        {
            if (d[i + 1] is >= 0xC0 and <= 0xCF and not (0xC4 or 0xC8 or 0xCC))
                return BinaryPrimitives.ReadUInt16BigEndian(d.AsSpan(i + 5)) > BinaryPrimitives.ReadUInt16BigEndian(d.AsSpan(i + 7));
        }
        return null;
    }

    private static byte[] Recurso(string nome)
    {
        using var origem = Assembly.GetExecutingAssembly().GetManifestResourceStream(nome)!;
        using var memoria = new MemoryStream();
        origem.CopyTo(memoria);
        return memoria.ToArray();
    }
}
