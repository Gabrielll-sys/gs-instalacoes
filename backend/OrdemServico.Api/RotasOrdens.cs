using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using static OrdemServico.Api.Respostas;

namespace OrdemServico.Api;

// OS, fotos e relatório em PDF.
public static class RotasOrdens
{
    public static void MapOrdens(this WebApplication app)
    {
        var ordens = app.MapGroup("/api/ordens").RequireAuthorization();

        // As mais recentes primeiro; "Mostrar mais" nos clientes pede um limite maior.
        ordens.MapGet("", async (int? limite, AppDb db, IR2Storage r2) =>
        {
            var lista = await db.Ordens.AsNoTracking()
                .Include(o => o.Fotos.OrderBy(f => f.CriadaEm))
                .OrderByDescending(o => o.AbertaEm)
                .Take(Listas.Limite(limite))
                .ToListAsync();

            return lista.Select(o => new OrdemDto(
                o.Id, o.Cliente, o.Responsaveis, o.Observacoes, o.AbertaEm,
                o.Fotos.Select(f => new FotoDto(f.Id, f.OrdemId, f.Secao, r2.UrlPublica(f.Chave), f.CriadaEm)).ToList()));
        });

        // PUT com id gerado no aparelho: a mesma OS pode ser reenviada pela fila offline sem duplicar.
        ordens.MapPut("/{id:guid}", async (Guid id, OrdemRequest req, ClaimsPrincipal quem, AppDb db) =>
        {
            var cliente = Limpo(req.Cliente);
            var responsaveis = (req.Responsaveis ?? []).Select(Limpo).Where(r => r != "").Distinct().ToList();
            var observacoes = Limpo(req.Observacoes);

            if (cliente is "" or { Length: > 200 }) return Erro("Informe o nome do cliente (até 200 caracteres).");
            if (responsaveis.Count is 0 or > 20 || responsaveis.Any(r => r.Length > 100)) return Erro("Informe de 1 a 20 responsáveis.");
            if (observacoes.Length > 5000) return Erro("Observações podem ter até 5000 caracteres.");

            var ordem = await db.Ordens.FindAsync(id);
            if (ordem is null)
            {
                ordem = new Ordem { Id = id, Cliente = cliente, AbertaEm = NaoFuturo(req.AbertaEm), AbertaPor = quem.Identity?.Name };
                db.Ordens.Add(ordem);
            }
            ordem.Cliente = cliente;
            ordem.Responsaveis = responsaveis;
            ordem.Observacoes = observacoes;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // O papel é conferido aqui: esconder o botão no app não impediria a chamada.
        ordens.MapGet("/{id:guid}/relatorio", async (Guid id, ClaimsPrincipal quem, AppDb db, IR2Storage r2, CancellationToken ct) =>
        {
            var ordem = await db.Ordens.AsNoTracking().Include(o => o.Fotos).FirstOrDefaultAsync(o => o.Id == id, ct);
            if (ordem is null) return OsNaoEncontrada();

            // Poucas por vez e já reduzidas: 30 fotos de 4 MB não ficam inteiras na memória ao mesmo tempo.
            using var vagas = new SemaphoreSlim(3);
            var arquivos = await Task.WhenAll(ordem.Fotos.Select(async f =>
            {
                await vagas.WaitAsync(ct);
                try
                {
                    return (f.Id, Dados: RelatorioPdf.Reduzir(await r2.LerAsync(f.Chave, ct)));
                }
                finally
                {
                    vagas.Release();
                }
            }));
            var pdf = RelatorioPdf.Gerar(ordem, arquivos.ToDictionary(a => a.Id, a => a.Dados), quem.Identity!.Name!, DateTimeOffset.UtcNow);
            return Results.File(pdf, "application/pdf", $"Relatorio-OS-{RelatorioPdf.Codigo(ordem.Id)}.pdf");
        }).RequireAuthorization(p => p.RequireRole(Papeis.Gestor));

        // shortcut: sem registro da exclusão, um aparelho que ainda tenha alteração da OS na fila a recria vazia; guardar a exclusão se isso acontecer.
        ordens.MapDelete("/{id:guid}", async (Guid id, AppDb db, IR2Storage r2) =>
        {
            var ordem = await db.Ordens.Include(o => o.Fotos).FirstOrDefaultAsync(o => o.Id == id);
            if (ordem is null) return Results.NoContent();
            // Fotos do R2 antes do banco: se falhar no meio, a OS continua e a nova tentativa termina sem deixar arquivo órfão.
            foreach (var foto in ordem.Fotos) await r2.ExcluirAsync(foto.Chave);
            db.Ordens.Remove(ordem);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole(Papeis.Gestor));

        var fotos = ordens.MapGroup("/{ordemId:guid}/fotos/{fotoId:guid}");

        fotos.MapPost("/upload-url", async (Guid ordemId, Guid fotoId, UploadRequest req, AppDb db, IR2Storage r2) =>
        {
            if (Fotos.Chave(ordemId, fotoId, req.ContentType) is not { } chave) return Erro("Formato de imagem não permitido.");
            if (!await db.Ordens.AnyAsync(o => o.Id == ordemId)) return OsNaoEncontrada();
            return Results.Ok(new { uploadUrl = r2.GerarUrlUpload(chave, req.ContentType!) });
        });

        // PUT idempotente: a resposta anterior pode ter se perdido depois do cadastro.
        fotos.MapPut("", async (Guid ordemId, Guid fotoId, FotoRequest req, ClaimsPrincipal quem, AppDb db, IR2Storage r2, CancellationToken ct) =>
        {
            if (req.Secao is not (Fotos.Antes or Fotos.Depois)) return Erro("Seção inválida.");
            if (Fotos.Chave(ordemId, fotoId, req.ContentType) is not { } chave) return Erro("Formato de imagem não permitido.");
            if (!await db.Ordens.AnyAsync(o => o.Id == ordemId)) return OsNaoEncontrada();

            if (!await db.Fotos.AnyAsync(f => f.Id == fotoId))
            {
                // Conferido aqui porque a URL assinada não limita o tamanho do que é enviado ao R2.
                var tamanho = await r2.TamanhoAsync(chave, ct);
                if (tamanho is null) return Erro("A foto não chegou ao armazenamento. Toque em Tentar de novo.");
                if (tamanho > Fotos.TamanhoMaximo)
                {
                    await r2.ExcluirAsync(chave);
                    return Erro("A foto passa de 4 MB e foi recusada.");
                }

                db.Fotos.Add(new Foto
                {
                    Id = fotoId,
                    OrdemId = ordemId,
                    Secao = req.Secao,
                    Chave = chave,
                    CriadaEm = NaoFuturo(req.CriadaEm),
                    EnviadaPor = quem.Identity?.Name,
                });
                await db.SaveChangesAsync();
            }
            return Results.NoContent();
        });

        fotos.MapDelete("", async (Guid ordemId, Guid fotoId, AppDb db, IR2Storage r2) =>
        {
            var foto = await db.Fotos.FirstOrDefaultAsync(f => f.Id == fotoId && f.OrdemId == ordemId);
            if (foto is null) return Results.NoContent();

            // R2 antes do banco: se falhar, o registro continua e a nova tentativa não deixa arquivo órfão.
            await r2.ExcluirAsync(foto.Chave);
            db.Fotos.Remove(foto);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static IResult OsNaoEncontrada() => NaoEncontrado("OS não encontrada.");
}
