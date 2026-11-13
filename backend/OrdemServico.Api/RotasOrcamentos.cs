using System.Globalization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using static OrdemServico.Api.Respostas;

namespace OrdemServico.Api;

// Clientes e orçamentos ficam à parte das OS e são só do gestor.
public static class RotasOrcamentos
{
    // Ordem alfabética com acento no lugar certo, o que a comparação binária do SQLite não faz.
    private static readonly StringComparer OrdemAlfabetica = StringComparer.Create(CultureInfo.GetCultureInfo("pt-BR"), ignoreCase: true);

    public static void MapOrcamentos(this WebApplication app)
    {
        var clientes = app.MapGroup("/api/clientes").RequireAuthorization(p => p.RequireRole(Papeis.Gestor));

        clientes.MapGet("", async (AppDb db) =>
            (await db.Clientes.AsNoTracking().ToListAsync()).OrderBy(c => c.Nome, OrdemAlfabetica).Select(ParaDto)).ComEtag();

        clientes.MapPost("", async (ClienteRequest req, AppDb db) =>
        {
            if (ProblemaNoCliente(req) is { } problema) return Erro(problema);
            var cliente = new Cliente { Id = Guid.NewGuid(), Nome = "", CriadoEm = DateTimeOffset.UtcNow };
            Preencher(cliente, req);
            db.Clientes.Add(cliente);
            await db.SaveChangesAsync();
            return Results.Ok(ParaDto(cliente));
        });

        clientes.MapPut("/{id:guid}", async (Guid id, ClienteRequest req, AppDb db) =>
        {
            if (ProblemaNoCliente(req) is { } problema) return Erro(problema);
            if (await db.Clientes.FindAsync(id) is not { } cliente) return NaoEncontrado("Cliente não encontrado.");
            Preencher(cliente, req);
            await db.SaveChangesAsync();
            return Results.Ok(ParaDto(cliente));
        });

        clientes.MapDelete("/{id:guid}", async (Guid id, AppDb db) =>
        {
            if (await db.Orcamentos.AnyAsync(o => o.ClienteId == id)) return Erro("Este cliente tem orçamentos. Exclua os orçamentos dele antes.");
            await db.Clientes.Where(c => c.Id == id).ExecuteDeleteAsync();
            return Results.NoContent();
        });

        var orcamentos = app.MapGroup("/api/orcamentos").RequireAuthorization(p => p.RequireRole(Papeis.Gestor));

        // Os mais recentes primeiro; "Mostrar mais" nos clientes pede um limite maior.
        orcamentos.MapGet("", async (int? limite, AppDb db) =>
            (await db.Orcamentos.AsNoTracking().Include(o => o.Cliente).OrderByDescending(o => o.Numero).Take(Listas.Limite(limite)).ToListAsync()).Select(ParaDto)).ComEtag();

        orcamentos.MapPost("", async (OrcamentoRequest req, ClaimsPrincipal quem, AppDb db) =>
        {
            if (await ProblemaNoOrcamento(req, db) is { } problema) return Erro(problema);
            // shortcut: dois orçamentos criados no mesmo instante disputam o número, e o índice único recusa um deles com erro 500; tratar se vários gestores passarem a criar ao mesmo tempo.
            var contador = await db.Contadores.FindAsync("orcamento");
            if (contador is null)
            {
                // Bancos de antes do contador começam do maior número que já existe.
                contador = new Contador { Nome = "orcamento", Valor = await db.Orcamentos.MaxAsync(o => (int?)o.Numero) ?? 0 };
                db.Contadores.Add(contador);
            }
            contador.Valor++;
            var orcamento = new Orcamento
            {
                Id = Guid.NewGuid(),
                Numero = contador.Valor,
                ClienteId = req.ClienteId!.Value,
                CriadoEm = DateTimeOffset.UtcNow,
                CriadoPor = quem.Identity?.Name,
            };
            Preencher(orcamento, req);
            db.Orcamentos.Add(orcamento);
            await db.SaveChangesAsync();
            await db.Entry(orcamento).Reference(o => o.Cliente).LoadAsync();
            return Results.Ok(ParaDto(orcamento));
        });

        orcamentos.MapPut("/{id:guid}", async (Guid id, OrcamentoRequest req, AppDb db) =>
        {
            if (await ProblemaNoOrcamento(req, db) is { } problema) return Erro(problema);
            if (await db.Orcamentos.FindAsync(id) is not { } orcamento) return OrcamentoNaoEncontrado();
            orcamento.ClienteId = req.ClienteId!.Value;
            Preencher(orcamento, req);
            await db.SaveChangesAsync();
            await db.Entry(orcamento).Reference(o => o.Cliente).LoadAsync();
            return Results.Ok(ParaDto(orcamento));
        });

        // Só a situação: marcar como enviado ou aprovado não mexe nos itens nem nas condições.
        orcamentos.MapPut("/{id:guid}/situacao", async (Guid id, SituacaoRequest req, AppDb db) =>
        {
            if (!Situacoes.Valida(req.Situacao)) return Erro("Situação inválida.");
            if (await db.Orcamentos.Include(o => o.Cliente).FirstOrDefaultAsync(o => o.Id == id) is not { } orcamento) return OrcamentoNaoEncontrado();
            orcamento.Situacao = req.Situacao!;
            await db.SaveChangesAsync();
            return Results.Ok(ParaDto(orcamento));
        });

        orcamentos.MapDelete("/{id:guid}", async (Guid id, AppDb db) =>
        {
            await db.Orcamentos.Where(o => o.Id == id).ExecuteDeleteAsync();
            return Results.NoContent();
        });

        orcamentos.MapGet("/{id:guid}/pdf", async (Guid id, AppDb db) =>
        {
            var orcamento = await db.Orcamentos.AsNoTracking().Include(o => o.Cliente).FirstOrDefaultAsync(o => o.Id == id);
            if (orcamento is null) return OrcamentoNaoEncontrado();
            return Results.File(OrcamentoPdf.Gerar(orcamento), "application/pdf", $"Orcamento-{orcamento.Numero:D4}.pdf");
        });
    }

    private static IResult OrcamentoNaoEncontrado() => NaoEncontrado("Orçamento não encontrado.");

    private static ClienteDto ParaDto(Cliente c) => new(c.Id, c.Nome, c.Telefone, c.Email, c.Documento, c.Endereco);

    private static OrcamentoDto ParaDto(Orcamento o) => new(
        o.Id, o.Numero, o.ClienteId, o.Cliente.Nome, o.CriadoEm,
        o.Itens.Select(i => new ItemDto(i.Descricao, i.Quantidade, i.Unidade, i.PrecoUnitario, i.Total)).ToList(),
        o.Total, o.Pagamento, o.Prazo, o.Observacoes, o.Situacao);

    private static string? ProblemaNoCliente(ClienteRequest r) =>
        Limpo(r.Nome) is "" or { Length: > 200 } ? "Informe o nome do cliente (até 200 caracteres)."
        : Limpo(r.Telefone).Length > 30 ? "O telefone pode ter até 30 caracteres."
        : Limpo(r.Email) is { Length: > 0 } email && (email.Length > 200 || !email.Contains('@')) ? "Confira o e-mail."
        : Limpo(r.Documento).Length > 20 ? "O CPF ou CNPJ pode ter até 20 caracteres."
        : Limpo(r.Endereco).Length > 500 ? "O endereço pode ter até 500 caracteres."
        : null;

    private static void Preencher(Cliente c, ClienteRequest r)
    {
        c.Nome = Limpo(r.Nome);
        c.Telefone = Limpo(r.Telefone);
        c.Email = Limpo(r.Email);
        c.Documento = Limpo(r.Documento);
        c.Endereco = Limpo(r.Endereco);
    }

    private static async Task<string?> ProblemaNoOrcamento(OrcamentoRequest r, AppDb db)
    {
        if (r.ClienteId is not { } clienteId || !await db.Clientes.AnyAsync(c => c.Id == clienteId)) return "Escolha o cliente.";
        var itens = r.Itens ?? [];
        if (itens.Count is 0 or > 100) return "Inclua de 1 a 100 itens.";
        for (var i = 0; i < itens.Count; i++)
        {
            var item = itens[i];
            var linha = $"Item {i + 1}: ";
            if (Limpo(item?.Descricao) is "" or { Length: > 200 }) return linha + "informe o material (até 200 caracteres).";
            if (Limpo(item!.Unidade) is "" or { Length: > 10 }) return linha + "informe a unidade (até 10 caracteres).";
            if (item.Quantidade is not { } q || q <= 0 || q > 1_000_000 || q != Math.Round(q, 3))
                return linha + "a quantidade precisa ser maior que zero, com até 3 casas decimais.";
            if (item.PrecoUnitario is not { } p || p < 0 || p > 10_000_000 || p != Math.Round(p, 2))
                return linha + "o preço unitário precisa ser zero ou mais, com até 2 casas decimais.";
        }
        if (Limpo(r.Pagamento).Length > 500) return "A forma de pagamento pode ter até 500 caracteres.";
        if (Limpo(r.Prazo).Length > 500) return "O prazo de execução pode ter até 500 caracteres.";
        if (Limpo(r.Observacoes).Length > 5000) return "Observações podem ter até 5000 caracteres.";
        return null;
    }

    private static void Preencher(Orcamento o, OrcamentoRequest r)
    {
        o.Itens = r.Itens!.Select(i => new ItemOrcamento
        {
            Descricao = Limpo(i!.Descricao),
            Quantidade = i.Quantidade!.Value,
            Unidade = Limpo(i.Unidade),
            PrecoUnitario = i.PrecoUnitario!.Value,
        }).ToList();
        o.Pagamento = Limpo(r.Pagamento);
        o.Prazo = Limpo(r.Prazo);
        o.Observacoes = Limpo(r.Observacoes);
    }
}
