using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;

namespace OrdemServico.Api;

// Listas que o app e o site pedem a toda hora: se nada mudou desde a última vez, a resposta é um 304 vazio.
// O navegador faz isso sozinho com o cabeçalho ETag; o app guarda a última resposta e manda If-None-Match.
public static class Etag
{
    public static RouteHandlerBuilder ComEtag(this RouteHandlerBuilder rota) => rota.AddEndpointFilter(async (ctx, next) =>
    {
        var resultado = await next(ctx);
        if (resultado is IResult) return resultado;

        var http = ctx.HttpContext;
        var opcoes = http.RequestServices.GetRequiredService<IOptions<JsonOptions>>().Value.SerializerOptions;
        var json = JsonSerializer.SerializeToUtf8Bytes(resultado, opcoes);
        var marca = Convert.ToHexString(SHA256.HashData(json))[..32];

        http.Response.Headers.ETag = $"\"{marca}\"";
        // private: só o aparelho de quem pediu guarda; no-cache: sempre pergunta antes de usar o que guardou.
        http.Response.Headers.CacheControl = "private, no-cache";
        return http.Request.Headers.IfNoneMatch.ToString().Contains(marca)
            ? Results.StatusCode(StatusCodes.Status304NotModified)
            : Results.Bytes(json, "application/json; charset=utf-8");
    });
}
