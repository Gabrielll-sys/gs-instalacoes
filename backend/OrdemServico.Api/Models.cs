using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace OrdemServico.Api;

public class Ordem
{
    public Guid Id { get; set; }
    public required string Cliente { get; set; }
    public List<string> Responsaveis { get; set; } = [];
    // Visita técnica, Manutenção, Manutenção predial, Instalação: o rótulo é guardado como aparece, e a busca acha por ele.
    public List<string> Tipos { get; set; } = [];
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
    // Falso nas fotos de antes das miniaturas e quando gerar falhou: as telas mostram a foto inteira.
    public bool TemMiniatura { get; set; }
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
    // Modelo do carro do cliente, como o colaborador digitou; vai no PDF.
    public string Veiculo { get; set; } = "";
    public DateTimeOffset CriadoEm { get; set; }
    public string? CriadoPor { get; set; }
    public string Situacao { get; set; } = Situacoes.Aberto;
    // Quando o serviço do orçamento foi concluído; 6 meses depois, vira lembrete de manutenção periódica.
    public DateTimeOffset? FinalizadoEm { get; set; }
    // Quando o gestor marcou o lembrete como resolvido (manutenção já agendada).
    public DateTimeOffset? LembreteResolvidoEm { get; set; }
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

// Último número usado: excluir o orçamento mais recente não devolve o número dele para o próximo.
public class Contador
{
    public required string Nome { get; set; }
    public int Valor { get; set; }
}

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Ordem> Ordens => Set<Ordem>();
    public DbSet<Foto> Fotos => Set<Foto>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Orcamento> Orcamentos => Set<Orcamento>();
    public DbSet<Contador> Contadores => Set<Contador>();

    // O ToJson do SQLite gravava os números como texto ("20.0"): a leitura aceita os dois jeitos.
    private static readonly JsonSerializerOptions JsonItens = new() { NumberHandling = JsonNumberHandling.AllowReadingFromString };

    protected override void OnModelCreating(ModelBuilder b)
    {
        // MySQL só indexa texto com tamanho definido.
        b.Entity<Usuario>().Property(u => u.Login).HasMaxLength(100);
        b.Entity<Usuario>().HasIndex(u => u.Login).IsUnique();
        b.Entity<Contador>().Property(c => c.Nome).HasMaxLength(50);
        b.Entity<Orcamento>().HasIndex(o => o.Numero).IsUnique();
        b.Entity<Contador>().HasKey(c => c.Nome);
        // Itens do orçamento em JSON numa coluna de texto, no mesmo formato do ToJson que o SQLite usava:
        // o provedor oficial do MySQL não tem coluna JSON automática.
        b.Entity<Orcamento>().Property(o => o.Itens).HasConversion(
            new ValueConverter<List<ItemOrcamento>, string>(
                v => JsonSerializer.Serialize(v, JsonItens),
                v => JsonSerializer.Deserialize<List<ItemOrcamento>>(v, JsonItens) ?? new List<ItemOrcamento>()),
            new ValueComparer<List<ItemOrcamento>>(
                (a, b) => JsonSerializer.Serialize(a, JsonItens) == JsonSerializer.Serialize(b, JsonItens),
                v => JsonSerializer.Serialize(v, JsonItens).GetHashCode(),
                v => JsonSerializer.Deserialize<List<ItemOrcamento>>(JsonSerializer.Serialize(v, JsonItens), JsonItens)!));
        // Listas de texto viram JSON numa coluna só: o provedor do MySQL não mapeia listas sozinho, e o SQLite já guardava assim.
        var lista = new ValueConverter<List<string>, string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());
        var comparaLista = new ValueComparer<List<string>>(
            (a, b) => a!.SequenceEqual(b!),
            v => v.Aggregate(0, (h, x) => HashCode.Combine(h, x.GetHashCode())),
            v => v.ToList());
        b.Entity<Ordem>().Property(o => o.Responsaveis).HasConversion(lista, comparaLista);
        b.Entity<Ordem>().Property(o => o.Tipos).HasConversion(lista, comparaLista);
        // Cliente com orçamento não some: a API recusa a exclusão antes.
        b.Entity<Orcamento>().HasOne(o => o.Cliente).WithMany().OnDelete(DeleteBehavior.Restrict);
    }

    // SQLite não ordena DateTimeOffset nativamente; no MySQL o mesmo formato mantém as datas iguais nos dois bancos.
    protected override void ConfigureConventions(ModelConfigurationBuilder b) =>
        b.Properties<DateTimeOffset>().HaveConversion<DateTimeOffsetToBinaryConverter>();
}

public record LoginRequest(string? Usuario, string? Senha);
public record TrocaSenhaRequest(string? Atual, string? Nova);
public record NovoUsuarioRequest(string? Login, string? Nome, string? Papel);
public record UsuarioRequest(string? Nome, string? Papel, bool Ativo);
public record OrdemRequest(string? Cliente, List<string?>? Responsaveis, string? Observacoes, DateTimeOffset? AbertaEm, List<string?>? Tipos = null);
public record UploadRequest(string? ContentType);
public record ClienteRequest(string? Nome, string? Telefone, string? Email, string? Documento, string? Endereco);
public record ItemRequest(string? Descricao, decimal? Quantidade, string? Unidade, decimal? PrecoUnitario);
public record SituacaoRequest(string? Situacao);
public record OrcamentoRequest(Guid? ClienteId, List<ItemRequest?>? Itens, string? Pagamento, string? Prazo, string? Observacoes, string? Veiculo = null);
public record FotoRequest(string? Secao, string? ContentType, DateTimeOffset? CriadaEm);

public record FotoDto(Guid Id, Guid OrdemId, string Secao, string Url, DateTimeOffset CriadaEm, string? MiniaturaUrl);
public record OrdemDto(Guid Id, string Cliente, List<string> Responsaveis, string Observacoes, DateTimeOffset AbertaEm, List<FotoDto> Fotos, List<string> Tipos);
public record SessaoDto(string Token, string Nome, string Papel, bool TrocarSenha);
public record UsuarioDto(Guid Id, string Login, string Nome, string Papel, bool Ativo, bool TrocarSenha);
public record ClienteDto(Guid Id, string Nome, string Telefone, string Email, string Documento, string Endereco);
public record ItemDto(string Descricao, decimal Quantidade, string Unidade, decimal PrecoUnitario, decimal Total);
public record OrcamentoDto(Guid Id, int Numero, Guid ClienteId, string ClienteNome, DateTimeOffset CriadoEm, List<ItemDto> Itens, decimal Total, string Pagamento, string Prazo, string Observacoes, string Situacao, string Veiculo, DateTimeOffset? FinalizadoEm, string ClienteTelefone, DateTimeOffset? LembreteResolvidoEm);

// Acompanhamento do orçamento depois de montado; não muda nada do que vai no PDF.
public static class Situacoes
{
    public const string Aberto = "aberto";
    public const string Enviado = "enviado";
    public const string Aprovado = "aprovado";
    public const string Recusado = "recusado";
    // Serviço do orçamento concluído: começa a contar os 6 meses até o lembrete de manutenção.
    public const string Finalizado = "finalizado";
    public static bool Valida(string? situacao) => situacao is Aberto or Enviado or Aprovado or Recusado or Finalizado;

    public const int MesesAteManutencao = 6;
}

public static class TiposDeServico
{
    public static readonly string[] Todos = ["Visita técnica", "Manutenção", "Manutenção predial", "Instalação"];
}

public static class Listas
{
    // shortcut: busca e filtros só olham o que já foi carregado; buscar no servidor se o histórico passar de alguns milhares.
    public const int Padrao = 200;
    public const int Maximo = 2000;
    public static int Limite(int? pedido) => Math.Clamp(pedido ?? Padrao, 1, Maximo);
}

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
    // A grade mostra 3 fotos por linha, de cerca de 110 px: 360 px cobrem telas de alta densidade.
    public const int LadoMiniatura = 360;

    public static string ChaveMiniatura(string chave) => $"{chave[..chave.LastIndexOf('.')]}-mini.jpg";

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
