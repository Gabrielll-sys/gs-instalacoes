using System.Globalization;
using System.Reflection;
using QuestPDF.Drawing;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace OrdemServico.Api;

// O que o relatório da OS e o orçamento compartilham: cores, fontes, logo e o par rótulo e valor.
public static class MarcaPdf
{
    public const string Marinho = "#00265F";
    public const string Branco = "#FFFFFF";
    public const string Fundo = "#F1F4F8";
    public const string Texto = "#10213D";
    public const string TextoSuave = "#47566C";
    public const string Filete = "#DDE3EC";

    public const string Regular = "Overpass-400";
    public const string Semi = "Overpass-600";
    public const string Extra = "Overpass-800";
    public const string Black = "Overpass-900";

    public const float Margem = 36;

    public static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    public static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    public static readonly byte[] LogoCarro = Recurso("logo-gs-carro.png");
    public static readonly byte[] LogoNome = Recurso("logo-gs-nome.png");

    private static readonly Lazy<bool> Registro = new(() =>
    {
        QuestPDF.Settings.License = LicenseType.Community;
        FontManager.RegisterFontWithCustomName(Regular, new MemoryStream(Recurso("Overpass_400Regular.ttf")));
        FontManager.RegisterFontWithCustomName(Semi, new MemoryStream(Recurso("Overpass_600SemiBold.ttf")));
        FontManager.RegisterFontWithCustomName(Extra, new MemoryStream(Recurso("Overpass_800ExtraBold.ttf")));
        FontManager.RegisterFontWithCustomName(Black, new MemoryStream(Recurso("Overpass_900Black.ttf")));
        return true;
    });

    // Licença e fontes, uma vez só: todo gerador de PDF chama antes de montar o documento.
    public static void Preparar() => _ = Registro.Value;

    public static void Dado(IContainer c, string rotulo, string valor) => c.Column(coluna =>
    {
        coluna.Item().Text(rotulo).FontFamily(Semi).FontSize(8.5f).FontColor(TextoSuave);
        coluna.Item().Text(valor).FontSize(10.5f);
    });

    private static byte[] Recurso(string nome)
    {
        using var origem = Assembly.GetExecutingAssembly().GetManifestResourceStream(nome)!;
        using var memoria = new MemoryStream();
        origem.CopyTo(memoria);
        return memoria.ToArray();
    }
}
