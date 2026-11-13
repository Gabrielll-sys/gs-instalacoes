using Microsoft.EntityFrameworkCore;

namespace OrdemServico.Api;

// Cópia do banco num bucket privado do R2, uma por dia, guardando os últimos 30 dias.
// Roda ao subir (o Railway pode ter acordado a API depois de dormir) e a cada 6 horas enquanto ela estiver de pé.
// Sem CloudflareR2:BucketBackup não faz nada: o bucket das fotos é público e não pode receber o banco.
public sealed class BackupDiario(IServiceScopeFactory escopos, IR2Storage r2, IConfiguration cfg, ILogger<BackupDiario> log) : BackgroundService
{
    public const int DiasGuardados = 30;

    public static string Chave(DateTime dia) => $"ordens-{dia:yyyy-MM-dd}.db";

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (string.IsNullOrEmpty(cfg["CloudflareR2:BucketBackup"]))
        {
            log.LogWarning("Configure CloudflareR2:BucketBackup: sem ele, o banco não tem backup.");
            return;
        }
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await FazerSeFaltar(DateTimeOffset.UtcNow, ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "O backup do banco falhou; nova tentativa em 6 horas.");
            }
            await Task.Delay(TimeSpan.FromHours(6), ct);
        }
    }

    public async Task<bool> FazerSeFaltar(DateTimeOffset agora, CancellationToken ct)
    {
        var hoje = TimeZoneInfo.ConvertTime(agora, MarcaPdf.Brasilia).Date;
        var chave = Chave(hoje);
        if (await r2.BackupExisteAsync(chave, ct)) return false;

        var arquivo = Path.Combine(Path.GetTempPath(), $"ordens-{Guid.NewGuid():N}.db");
        try
        {
            using (var escopo = escopos.CreateScope())
            {
                // VACUUM INTO grava uma cópia consistente do banco aberto, sem parar a API.
                await escopo.ServiceProvider.GetRequiredService<AppDb>().Database.ExecuteSqlRawAsync("VACUUM INTO {0}", [arquivo], ct);
            }
            await r2.EnviarBackupAsync(chave, arquivo, ct);
        }
        finally
        {
            File.Delete(arquivo);
        }

        // Apaga as que passaram de 30 dias, com folga para os dias em que a API dormiu e não rodou.
        for (var dias = DiasGuardados + 1; dias <= DiasGuardados + 15; dias++)
            await r2.ExcluirBackupAsync(Chave(hoje.AddDays(-dias)));
        log.LogInformation("Backup do banco enviado: {Chave}", chave);
        return true;
    }
}
