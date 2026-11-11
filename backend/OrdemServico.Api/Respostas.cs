namespace OrdemServico.Api;

// Respostas e limpezas usadas por todas as rotas.
public static class Respostas
{
    public static IResult Erro(string message) => Results.BadRequest(new { message });
    public static IResult NaoEncontrado(string message) => Results.NotFound(new { message });

    public static string Limpo(string? texto) => texto?.Trim() ?? "";
    public static string NormalizarLogin(string? login) => login?.Trim().ToLowerInvariant() ?? "";

    // As datas vêm do aparelho porque a OS pode nascer offline; relógio adiantado não vira data futura.
    // UTC porque o conversor binário do SQLite ordena pelos ticks locais.
    public static DateTimeOffset NaoFuturo(DateTimeOffset? data)
    {
        var agora = DateTimeOffset.UtcNow;
        return data is { } d && d < agora ? d.ToUniversalTime() : agora;
    }
}
