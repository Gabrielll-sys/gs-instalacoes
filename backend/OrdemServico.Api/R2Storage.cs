using System.Net;
using Amazon.S3;
using Amazon.S3.Model;

namespace OrdemServico.Api;

public interface IR2Storage
{
    string GerarUrlUpload(string chave, string contentType);
    string UrlPublica(string chave);
    Task ExcluirAsync(string chave);
    Task<byte[]?> LerAsync(string chave, CancellationToken ct);
    Task<long?> TamanhoAsync(string chave, CancellationToken ct);
}

public sealed class R2Storage(IConfiguration cfg) : IR2Storage, IDisposable
{
    // Lazy: sem credenciais a API sobe e lista as OS; só o envio falha, e a foto continua na fila do app.
    private readonly Lazy<AmazonS3Client> _client = new(() => new AmazonS3Client(
        Obrigatorio(cfg, "AccessKey"),
        Obrigatorio(cfg, "SecretKey"),
        new AmazonS3Config
        {
            ServiceURL = $"https://{Obrigatorio(cfg, "AccountId")}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            AuthenticationRegion = "auto",
        }));

    public string GerarUrlUpload(string chave, string contentType)
    {
        // Falha agora em vez de aceitar uma foto cuja URL pública sairia quebrada.
        Obrigatorio(cfg, "PublicUrl");
        return _client.Value.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = Obrigatorio(cfg, "BucketName"),
            Key = chave,
            Verb = HttpVerb.PUT,
            ContentType = contentType,
            Expires = DateTime.UtcNow.AddMinutes(30),
        });
    }

    public string UrlPublica(string chave) => $"{cfg["CloudflareR2:PublicUrl"]?.TrimEnd('/')}/{chave}";

    public Task ExcluirAsync(string chave) =>
        _client.Value.DeleteObjectAsync(Obrigatorio(cfg, "BucketName"), chave);

    public async Task<byte[]?> LerAsync(string chave, CancellationToken ct)
    {
        try
        {
            using var resposta = await _client.Value.GetObjectAsync(Obrigatorio(cfg, "BucketName"), chave, ct);
            using var memoria = new MemoryStream();
            await resposta.ResponseStream.CopyToAsync(memoria, ct);
            return memoria.ToArray();
        }
        catch (AmazonS3Exception e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            // Só arquivo inexistente vira nulo: falha de rede precisa falhar o relatório, não omitir a prova.
            return null;
        }
    }

    public async Task<long?> TamanhoAsync(string chave, CancellationToken ct)
    {
        try
        {
            return (await _client.Value.GetObjectMetadataAsync(Obrigatorio(cfg, "BucketName"), chave, ct)).ContentLength;
        }
        catch (AmazonS3Exception e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public void Dispose()
    {
        if (_client.IsValueCreated) _client.Value.Dispose();
    }

    private static string Obrigatorio(IConfiguration cfg, string nome) =>
        cfg[$"CloudflareR2:{nome}"] is { Length: > 0 } valor
            ? valor
            : throw new InvalidOperationException($"Configure CloudflareR2:{nome}.");
}
