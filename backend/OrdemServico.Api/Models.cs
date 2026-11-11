using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace OrdemServico.Api;

public class Ordem
{
    public Guid Id { get; set; }
    public required string Cliente { get; set; }
    public List<string> Responsaveis { get; set; } = [];
    public string Observacoes { get; set; } = "";
    public DateTimeOffset AbertaEm { get; set; }
    // Nulo nas OS criadas antes das contas individuais.
    public string? AbertaPor { get; set; }
    public List<Foto> Fotos { get; set; } = [];
}

public class Foto
{
    public Guid Id { get; set; }
    public Guid OrdemId { get; set; }
    public required string Secao { get; set; }
    public required string Chave { get; set; }
    // Quando foi adicionada à OS no aparelho, mesmo que o envio só aconteça depois.
    public DateTimeOffset CriadaEm { get; set; }
    // Nulo nas fotos enviadas antes das contas individuais.
    public string? EnviadaPor { get; set; }
}

public class Usuario
{
    // Toda conta criada ou redefinida pelo gestor começa com ela; a troca no primeiro acesso é o que a protege.
    public const string SenhaPadrao = "1234";
    public const int TentativasDeLogin = 5;

    public Guid Id { get; set; }
    public required string Login { get; set; }
    public required string Nome { get; set; }
    public required string Papel { get; set; }
    public string SenhaHash { get; set; } = "";
    public bool Ativo { get; set; } = true;
    // Senha definida por outra pessoa: o dono da conta troca no próximo acesso.
    public bool TrocarSenha { get; set; } = true;
    // Vai no token: trocar a senha encerra as sessões abertas com a anterior.
    public int VersaoSessao { get; set; }
}

public class Cliente
{
    public Guid Id { get; set; }
    public required string Nome { get; set; }
    public string Telefone { get; set; } = "";
    public string Email { get; set; } = "";
    // CPF ou CNPJ, como digitado.
    public string Documento { get; set; } = "";
    public string Endereco { get; set; } = "";
    public DateTimeOffset CriadoEm { get; set; }
}

public class Orcamento
{
    public Guid Id { get; set; }
    // Sequencial e único: é o número que o cliente cita.
    public int Numero { get; set; }
    public Guid ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    // Guardados como JSON na própria linha: são sempre lidos e trocados juntos, na ordem em que foram digitados.
    public List<ItemOrcamento> Itens { get; set; } = [];
    public string Pagamento { get; set; } = "";
    public string Prazo { get; set; } = "";
    public string Observacoes { get; set; } = "";
    public DateTimeOffset CriadoEm { get; set; }
    public string? CriadoPor { get; set; }
    public decimal Total => Itens.Sum(i => i.Total);
}

public class ItemOrcamento
{
    public required string Descricao { get; set; }
    public decimal Quantidade { get; set; }
    public required string Unidade { get; set; }
    public decimal PrecoUnitario { get; set; }
    // Arredonda cada linha, como na nota: a soma das linhas impressas bate com o total.
    public decimal Total => Math.Round(Quantidade * PrecoUnitario, 2, MidpointRounding.AwayFromZero);
}

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Ordem> Ordens => Set<Ordem>();
    public DbSet<Foto> Fotos => Set<Foto>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Orcamento> Orcamentos => Set<Orcamento>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Usuario>().HasIndex(u => u.Login).IsUnique();
        b.Entity<Orcamento>().HasIndex(o => o.Numero).IsUnique();
        b.Entity<Orcamento>().OwnsMany(o => o.Itens, i => i.ToJson());
        // Cliente com orçamento não some: a API recusa a exclusão antes.
        b.Entity<Orcamento>().HasOne(o => o.Cliente).WithMany().OnDelete(DeleteBehavior.Restrict);
    }

    // SQLite não ordena DateTimeOffset nativamente.
    protected override void ConfigureConventions(ModelConfigurationBuilder b) =>
        b.Properties<DateTimeOffset>().HaveConversion<DateTimeOffsetToBinaryConverter>();
}

public record LoginRequest(string? Usuario, string? Senha);
public record TrocaSenhaRequest(string? Atual, string? Nova);
public record NovoUsuarioRequest(string? Login, string? Nome, string? Papel);
public record UsuarioRequest(string? Nome, string? Papel, bool Ativo);
public record OrdemRequest(string? Cliente, List<string?>? Responsaveis, string? Observacoes, DateTimeOffset? AbertaEm);
public record UploadRequest(string? ContentType);
public record ClienteRequest(string? Nome, string? Telefone, string? Email, string? Documento, string? Endereco);
public record ItemRequest(string? Descricao, decimal? Quantidade, string? Unidade, decimal? PrecoUnitario);
public record OrcamentoRequest(Guid? ClienteId, List<ItemRequest?>? Itens, string? Pagamento, string? Prazo, string? Observacoes);
public record FotoRequest(string? Secao, string? ContentType, DateTimeOffset? CriadaEm);

public record FotoDto(Guid Id, Guid OrdemId, string Secao, string Url, DateTimeOffset CriadaEm);
public record OrdemDto(Guid Id, string Cliente, List<string> Responsaveis, string Observacoes, DateTimeOffset AbertaEm, List<FotoDto> Fotos);
public record SessaoDto(string Token, string Nome, string Papel, bool TrocarSenha);
public record UsuarioDto(Guid Id, string Login, string Nome, string Papel, bool Ativo, bool TrocarSenha);
public record ClienteDto(Guid Id, string Nome, string Telefone, string Email, string Documento, string Endereco);
public record ItemDto(string Descricao, decimal Quantidade, string Unidade, decimal PrecoUnitario, decimal Total);
public record OrcamentoDto(Guid Id, int Numero, Guid ClienteId, string ClienteNome, DateTimeOffset CriadoEm, List<ItemDto> Itens, decimal Total, string Pagamento, string Prazo, string Observacoes);

public static class Papeis
{
    public const string Gestor = "gestor";
    public const string Tecnico = "tecnico";
    public static bool Valido(string? papel) => papel is Gestor or Tecnico;
}

public static class Fotos
{
    public const string Antes = "antes";
    public const string Depois = "depois";
    // O app compacta antes de enviar; este limite é a garantia do lado do servidor.
    public const long TamanhoMaximo = 4 * 1024 * 1024;

    private static readonly Dictionary<string, string> Extensoes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/heic"] = ".heic",
    };

    // A chave é derivada no servidor: o cliente nunca escolhe onde grava nem qual URL fica registrada.
    public static string? Chave(Guid ordemId, Guid fotoId, string? contentType) =>
        contentType is not null && Extensoes.TryGetValue(contentType, out var ext)
            ? $"ordens/{ordemId}/{fotoId}{ext}"
            : null;
}
