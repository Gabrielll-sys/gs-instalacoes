using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using static OrdemServico.Api.MarcaPdf;

namespace OrdemServico.Api;

// Mesmo mundo do relatório da OS: o total aparece na faixa, de relance, e os itens vêm logo abaixo do cliente.
public static class OrcamentoPdf
{
    public static string Numero(int numero) => numero.ToString("D4");

    public static byte[] Gerar(Orcamento orcamento)
    {
        Preparar();
        var numero = Numero(orcamento.Numero);
        var cliente = orcamento.Cliente;
        var emitido = TimeZoneInfo.ConvertTime(orcamento.CriadoEm, Brasilia).ToString("dd/MM/yyyy", PtBr);

        return Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.DefaultTextStyle(x => x.FontFamily(Regular).FontSize(10).FontColor(Texto).LineHeight(1.35f));

            page.Header().Column(c =>
            {
                c.Item().ShowOnce().Element(x => Faixa(x, cliente.Nome, $"Orçamento nº {numero} – emitido em {emitido}", orcamento.Total));
                c.Item().SkipOnce().Element(x => FaixaContinuacao(x, cliente.Nome, numero));
            });

            page.Content().PaddingHorizontal(Margem).PaddingVertical(18).Column(c =>
            {
                var contato = new[]
                {
                    ("Telefone", cliente.Telefone),
                    ("E-mail", cliente.Email),
                    ("CPF ou CNPJ", cliente.Documento),
                }.Where(d => d.Item2 != "").ToList();

                if (contato.Count > 0 || cliente.Endereco != "")
                {
                    c.Item().Column(dados =>
                    {
                        dados.Spacing(9);
                        if (contato.Count > 0)
                        {
                            dados.Item().Row(row =>
                            {
                                row.Spacing(12);
                                foreach (var (rotulo, valor) in contato) row.RelativeItem().Element(x => Dado(x, rotulo, valor));
                                // Colunas vazias mantêm cada dado na mesma posição, tenha o cliente um, dois ou três.
                                for (var i = contato.Count; i < 3; i++) row.RelativeItem();
                            });
                        }
                        if (cliente.Endereco != "") dados.Item().MaxWidth(360).Element(x => Dado(x, "Endereço", cliente.Endereco));
                    });
                    c.Item().PaddingTop(16).PaddingBottom(14).LineHorizontal(0.75f).LineColor(Filete);
                }

                c.Item().Element(x => Itens(x, orcamento.Itens));
                c.Item().PaddingTop(10).ShowEntire().Element(x => Total(x, orcamento.Itens.Count, orcamento.Total));

                var condicoes = new[]
                {
                    ("Forma de pagamento", orcamento.Pagamento),
                    ("Prazo de execução", orcamento.Prazo),
                }.Where(d => d.Item2 != "").ToList();

                if (condicoes.Count > 0)
                {
                    c.Item().PaddingTop(20).EnsureSpace(60).Row(row =>
                    {
                        row.Spacing(12);
                        foreach (var (rotulo, valor) in condicoes) row.RelativeItem().Element(x => Dado(x, rotulo, valor));
                        if (condicoes.Count == 1) row.RelativeItem();
                    });
                }
                if (orcamento.Observacoes != "")
                    c.Item().PaddingTop(condicoes.Count > 0 ? 9 : 20).EnsureSpace(50).MaxWidth(360).Element(x => Dado(x, "Observações", orcamento.Observacoes));
            });

            page.Footer().PaddingHorizontal(Margem).PaddingBottom(14).BorderTop(0.75f).BorderColor(Filete).PaddingTop(6)
                .DefaultTextStyle(x => x.FontFamily(Semi).FontSize(8).FontColor(TextoSuave))
                .Row(row =>
                {
                    row.RelativeItem().Text("GS Instalações – gsinstalacoesbh.com.br – @gs_instalacoes_bh");
                    row.AutoItem().Text(t =>
                    {
                        t.Span($"Orçamento {numero} – Página ");
                        t.CurrentPageNumber();
                        t.Span(" de ");
                        t.TotalPages();
                    });
                });
        }))
        .WithMetadata(new DocumentMetadata
        {
            Title = $"Orçamento {numero}: {cliente.Nome}",
            Subject = $"Orçamento {numero}",
            Author = "GS Instalações",
            Creator = "GS Instalações",
        })
        .GeneratePdf();
    }

    public static string Moeda(decimal valor) => valor.ToString("C", PtBr);

    private static string Quantidade(decimal valor) => valor.ToString("#,##0.###", PtBr);

    private static void Faixa(IContainer c, string cliente, string subtitulo, decimal total) =>
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
                titulo.Item().PaddingTop(3).Text(subtitulo).FontFamily(Semi).FontSize(11).FontColor(Branco);
            });
            row.ConstantItem(16);
            row.AutoItem().AlignMiddle().Column(valor =>
            {
                valor.Item().AlignRight().Text("TOTAL").FontFamily(Extra).FontSize(9.5f).LetterSpacing(0.03f).FontColor(Branco);
                valor.Item().AlignRight().Text(Moeda(total)).FontFamily(Black).FontSize(20).EnableFontFeature("tnum").FontColor(Branco);
            });
        });

    private static void FaixaContinuacao(IContainer c, string cliente, string numero) =>
        c.Background(Marinho).PaddingHorizontal(Margem).PaddingVertical(8).Row(row =>
        {
            row.ConstantItem(38).AlignMiddle().Image(LogoCarro).FitWidth();
            row.ConstantItem(10);
            row.RelativeItem().AlignMiddle().Text(cliente).ClampLines(1).FontFamily(Extra).FontSize(10).FontColor(Branco);
            row.ConstantItem(10);
            row.AutoItem().AlignMiddle().Text($"Orçamento {numero}").FontFamily(Semi).FontSize(9).FontColor(Branco);
        });

    // O cabeçalho da tabela se repete em cada página.
    private static void Itens(IContainer c, List<ItemOrcamento> itens) => c.Table(t =>
    {
        t.ColumnsDefinition(colunas =>
        {
            colunas.ConstantColumn(24);
            colunas.RelativeColumn();
            colunas.ConstantColumn(60);
            colunas.ConstantColumn(40);
            colunas.ConstantColumn(82);
            colunas.ConstantColumn(88);
        });

        t.Header(cabecalho =>
        {
            Cabecalho(cabecalho.Cell(), "Nº");
            Cabecalho(cabecalho.Cell(), "MATERIAL");
            Cabecalho(cabecalho.Cell(), "QTD.", direita: true);
            Cabecalho(cabecalho.Cell(), "UN.", recuo: 10);
            Cabecalho(cabecalho.Cell(), "PREÇO UNIT.", direita: true);
            Cabecalho(cabecalho.Cell(), "TOTAL", direita: true);
            // Um filete só, de ponta a ponta: a borda de cada célula deixaria emendas nas divisas das colunas.
            cabecalho.Cell().ColumnSpan(6).LineHorizontal(1.2f).LineColor(Marinho);
        });

        foreach (var (item, i) in itens.Select((item, i) => (item, i)))
        {
            Celula(t.Cell()).Text((i + 1).ToString()).FontFamily(Semi).EnableFontFeature("tnum").FontColor(TextoSuave);
            Celula(t.Cell()).PaddingRight(10).Text(item.Descricao);
            Celula(t.Cell()).AlignRight().Text(Quantidade(item.Quantidade)).EnableFontFeature("tnum");
            Celula(t.Cell()).PaddingLeft(10).Text(item.Unidade).FontColor(TextoSuave);
            Celula(t.Cell()).AlignRight().Text(Moeda(item.PrecoUnitario)).EnableFontFeature("tnum");
            Celula(t.Cell()).AlignRight().Text(Moeda(item.Total)).FontFamily(Extra).EnableFontFeature("tnum");
            t.Cell().ColumnSpan(6).LineHorizontal(0.75f).LineColor(Filete);
        }
    });

    private static void Cabecalho(IContainer c, string texto, bool direita = false, float recuo = 0)
    {
        var celula = c.PaddingBottom(5).PaddingLeft(recuo);
        if (direita) celula = celula.AlignRight();
        celula.Text(texto).FontFamily(Extra).FontSize(8.5f).LetterSpacing(0.03f).FontColor(Marinho);
    }

    private static IContainer Celula(IContainer c) => c.PaddingVertical(6);

    private static void Total(IContainer c, int itens, decimal total) =>
        c.Background(Marinho).CornerRadius(4).PaddingVertical(9).PaddingHorizontal(12).Row(row =>
        {
            row.RelativeItem().AlignMiddle().Text(itens == 1 ? "1 item" : $"{itens} itens").FontFamily(Semi).FontSize(9).FontColor(Branco);
            row.AutoItem().AlignMiddle().Text("TOTAL").FontFamily(Extra).FontSize(9.5f).LetterSpacing(0.03f).FontColor(Branco);
            row.AutoItem().PaddingLeft(14).AlignMiddle().Text(Moeda(total)).FontFamily(Black).FontSize(15).EnableFontFeature("tnum").FontColor(Branco);
        });
}
