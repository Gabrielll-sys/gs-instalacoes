using System.Collections.Concurrent;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.FileProviders.Physical;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using OrdemServico.Api;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// Só em desenvolvimento: em produção as credenciais vêm de variáveis de ambiente.
// ExclusionFilters.None porque o provedor padrão ignora arquivos que começam com ponto.
if (builder.Environment.IsDevelopment())
    cfg.AddIniFile(new PhysicalFileProvider(builder.Environment.ContentRootPath, ExclusionFilters.None), ".env", optional: true, reloadOnChange: false);

string Obrigatorio(string chave) =>
    cfg[chave] is { Length: > 0 } valor ? valor : throw new InvalidOperationException($"Configure {chave}.");

var chaveJwt = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Obrigatorio("Auth:JwtKey")));
if (chaveJwt.KeySize < 256) throw new InvalidOperationException("Auth:JwtKey precisa de ao menos 32 bytes.");

var senhas = new PasswordHasher<Usuario>();

SessaoDto Sessao(Usuario u) => new(
    new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
    {
        // Só a identidade: nome e papel são lidos do banco a cada pedido.
        Subject = new ClaimsIdentity([new Claim("uid", u.Id.ToString()), new Claim("ver", u.VersaoSessao.ToString())]),
        // Validade longa porque o técnico pode passar dias em campo sem conseguir renovar.
        Expires = DateTime.UtcNow.AddDays(90),
        SigningCredentials = new SigningCredentials(chaveJwt, SecurityAlgorithms.HmacSha256),
    }),
    u.Nome, u.Papel, u.TrocarSenha);

void DefinirSenha(Usuario u, string senha, bool provisoria)
{
    u.SenhaHash = senhas.HashPassword(u, senha);
    u.TrocarSenha = provisoria;
    u.VersaoSessao++;
}

builder.Services.AddDbContext<AppDb>(o => o.UseSqlite(cfg.GetConnectionString("Db")));
builder.Services.AddSingleton<IR2Storage, R2Storage>();
builder.Services.AddCors();
builder.Services.AddAuthorization();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        IssuerSigningKey = chaveJwt,
    };
    o.Events = new JwtBearerEvents
    {
        // O token vale 90 dias: conta desativada ou senha trocada precisam perder o acesso na hora.
        OnTokenValidated = async ctx =>
        {
            var token = ctx.Principal!;
            var id = Guid.TryParse(token.FindFirstValue("uid"), out var uid) ? uid : Guid.Empty;
            var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDb>();
            var usuario = await db.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
            if (usuario is not { Ativo: true } || token.FindFirstValue("ver") != usuario.VersaoSessao.ToString())
            {
                ctx.Fail("Sessão encerrada.");
                return;
            }
            ((ClaimsIdentity)token.Identity!).AddClaims([new Claim(ClaimTypes.Name, usuario.Nome), new Claim(ClaimTypes.Role, usuario.Papel)]);
        },
    };
});
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // Teto global, folgado: o freio de verdade é por usuário, no próprio login.
    o.AddFixedWindowLimiter("login", w =>
    {
        w.PermitLimit = 100;
        w.Window = TimeSpan.FromMinutes(1);
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    db.Database.Migrate();

    // Sem nenhuma conta, ninguém conseguiria entrar para criar as outras.
    if (!db.Usuarios.Any())
    {
        var gestor = new Usuario
        {
            Id = Guid.NewGuid(),
            Login = NormalizarLogin(Obrigatorio("Auth:GestorInicial:Usuario")),
            Nome = "Gestor",
            Papel = Papeis.Gestor,
        };
        // Não é provisória: quem a define é quem instala, e não outra pessoa da equipe. Dá para trocar no menu da conta.
        DefinirSenha(gestor, Obrigatorio("Auth:GestorInicial:Senha"), provisoria: false);
        db.Usuarios.Add(gestor);
        db.SaveChanges();
    }
}

// O app nativo não usa CORS; o site web usa. Em produção, só as origens listadas, separadas por vírgula.
// Content-Disposition exposto para o site ler o nome do arquivo do relatório.
var origens = cfg["Cors:Origens"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];
if (app.Environment.IsDevelopment())
    app.UseCors(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Content-Disposition"));
else if (origens.Length > 0)
    app.UseCors(p => p.WithOrigins(origens).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Content-Disposition"));

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Erros seguidos travam só aquele usuário por alguns minutos: quem erra de propósito não tranca a equipe inteira.
// shortcut: guardado em memória, zera ao reiniciar a API e não vale entre réplicas; mover para o banco se houver mais de uma instância.
var falhasDeLogin = new ConcurrentDictionary<string, (int Vezes, DateTime Ate)>();

app.MapPost("/api/login", async (LoginRequest req, AppDb db) =>
{
    var login = NormalizarLogin(req.Usuario);
    var agora = DateTime.UtcNow;
    if (falhasDeLogin.TryGetValue(login, out var falha) && falha.Vezes >= Usuario.TentativasDeLogin && falha.Ate > agora)
        return Results.Json(new { message = "Muitas tentativas erradas com este usuário. Aguarde 10 minutos e tente de novo." }, statusCode: StatusCodes.Status429TooManyRequests);

    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Login == login);
    // Mesma resposta para usuário inexistente, conta desativada ou senha errada.
    if (usuario is not { Ativo: true } || senhas.VerifyHashedPassword(usuario, usuario.SenhaHash, req.Senha ?? "") == PasswordVerificationResult.Failed)
    {
        falhasDeLogin.AddOrUpdate(login, _ => (1, agora.AddMinutes(10)), (_, f) => (f.Ate > agora ? f.Vezes + 1 : 1, agora.AddMinutes(10)));
        return Results.Unauthorized();
    }
    falhasDeLogin.TryRemove(login, out _);
    return Results.Ok(Sessao(usuario));
}).RequireRateLimiting("login");

app.MapPut("/api/conta/senha", async (TrocaSenhaRequest req, ClaimsPrincipal quem, AppDb db) =>
{
    var id = Guid.Parse(quem.FindFirstValue("uid")!);
    var usuario = await db.Usuarios.FirstAsync(u => u.Id == id);
    // 400, não 401: o app trata 401 como sessão encerrada e sairia da conta.
    if (senhas.VerifyHashedPassword(usuario, usuario.SenhaHash, req.Atual ?? "") == PasswordVerificationResult.Failed)
        return Erro("A senha atual está incorreta.");
    if (ProblemaNaSenha(req.Nova) is { } problema) return Erro(problema);
    if (req.Nova == req.Atual) return Erro("Escolha uma senha diferente da atual.");

    DefinirSenha(usuario, req.Nova!, provisoria: false);
    await db.SaveChangesAsync();
    return Results.Ok(Sessao(usuario));
}).RequireAuthorization().RequireRateLimiting("login");

// Para o seletor de responsáveis: só técnicos ativos, e só o nome, sem usuário de login.
app.MapGet("/api/equipe", async (AppDb db) =>
    await db.Usuarios.AsNoTracking().Where(u => u.Ativo && u.Papel == Papeis.Tecnico).OrderBy(u => u.Nome).Select(u => u.Nome).Distinct().ToListAsync())
    .RequireAuthorization();

var usuarios = app.MapGroup("/api/usuarios").RequireAuthorization(p => p.RequireRole(Papeis.Gestor));

usuarios.MapGet("", async (AppDb db) =>
    (await db.Usuarios.AsNoTracking().OrderBy(u => u.Nome).ToListAsync()).Select(UsuarioParaDto));

usuarios.MapPost("", async (NovoUsuarioRequest req, AppDb db) =>
{
    var login = NormalizarLogin(req.Login);
    var nome = req.Nome?.Trim() ?? "";
    if (!Regex.IsMatch(login, "^[a-z0-9._-]{3,50}$")) return Erro("O usuário precisa ter de 3 a 50 caracteres, sem espaços nem acentos.");
    if (ProblemaNaConta(nome, req.Papel) is { } problemaConta) return Erro(problemaConta);
    if (await db.Usuarios.AnyAsync(u => u.Login == login)) return Results.Conflict(new { message = "Já existe uma conta com esse usuário." });

    var usuario = new Usuario { Id = Guid.NewGuid(), Login = login, Nome = nome, Papel = req.Papel! };
    DefinirSenha(usuario, Usuario.SenhaPadrao, provisoria: true);
    db.Usuarios.Add(usuario);
    await db.SaveChangesAsync();
    return Results.Ok(UsuarioParaDto(usuario));
});

usuarios.MapPut("/{id:guid}", async (Guid id, UsuarioRequest req, AppDb db) =>
{
    var nome = req.Nome?.Trim() ?? "";
    if (ProblemaNaConta(nome, req.Papel) is { } problema) return Erro(problema);
    if (await db.Usuarios.FindAsync(id) is not { } usuario) return ContaNaoEncontrada();

    // Sem gestor ativo, ninguém mais conseguiria gerenciar contas nem gerar relatórios.
    var deixaDeSerGestor = usuario is { Papel: Papeis.Gestor, Ativo: true } && (req.Papel != Papeis.Gestor || !req.Ativo);
    if (deixaDeSerGestor && !await db.Usuarios.AnyAsync(u => u.Id != id && u.Papel == Papeis.Gestor && u.Ativo))
        return Erro("Esta é a única conta de gestor ativa: ela não pode virar técnico nem ser desativada. Para cadastrar um técnico, use Nova conta.");

    usuario.Nome = nome;
    usuario.Papel = req.Papel!;
    usuario.Ativo = req.Ativo;
    await db.SaveChangesAsync();
    return Results.Ok(UsuarioParaDto(usuario));
});

// Para quem esqueceu a senha: volta à padrão, e a pessoa escolhe outra no próximo acesso.
usuarios.MapPut("/{id:guid}/senha", async (Guid id, AppDb db) =>
{
    if (await db.Usuarios.FindAsync(id) is not { } usuario) return ContaNaoEncontrada();

    DefinirSenha(usuario, Usuario.SenhaPadrao, provisoria: true);
    await db.SaveChangesAsync();
    return Results.Ok(UsuarioParaDto(usuario));
});

var ordens = app.MapGroup("/api/ordens").RequireAuthorization();

// shortcut: só as 200 OS mais recentes, sem paginação; paginar quando o histórico antigo precisar aparecer no app.
ordens.MapGet("", async (AppDb db, IR2Storage r2) =>
{
    var lista = await db.Ordens.AsNoTracking()
        .Include(o => o.Fotos.OrderBy(f => f.CriadaEm))
        .OrderByDescending(o => o.AbertaEm)
        .Take(200)
        .ToListAsync();

    return lista.Select(o => new OrdemDto(
        o.Id, o.Cliente, o.Responsaveis, o.Observacoes, o.AbertaEm,
        o.Fotos.Select(f => new FotoDto(f.Id, f.OrdemId, f.Secao, r2.UrlPublica(f.Chave), f.CriadaEm)).ToList()));
});

// PUT com id gerado no aparelho: a mesma OS pode ser reenviada pela fila offline sem duplicar.
ordens.MapPut("/{id:guid}", async (Guid id, OrdemRequest req, ClaimsPrincipal quem, AppDb db) =>
{
    var cliente = req.Cliente?.Trim() ?? "";
    var responsaveis = (req.Responsaveis ?? []).Select(r => r?.Trim() ?? "").Where(r => r != "").Distinct().ToList();
    var observacoes = req.Observacoes?.Trim() ?? "";

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

    var arquivos = await Task.WhenAll(ordem.Fotos.Select(async f => (f.Id, Dados: await r2.LerAsync(f.Chave, ct))));
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

// Clientes e orçamentos ficam à parte das OS e são só do gestor.
var clientes = app.MapGroup("/api/clientes").RequireAuthorization(p => p.RequireRole(Papeis.Gestor));
// Ordem alfabética com acento no lugar certo, o que a comparação binária do SQLite não faz.
var ordemAlfabetica = StringComparer.Create(CultureInfo.GetCultureInfo("pt-BR"), ignoreCase: true);

clientes.MapGet("", async (AppDb db) =>
    (await db.Clientes.AsNoTracking().ToListAsync()).OrderBy(c => c.Nome, ordemAlfabetica).Select(ClienteParaDto));

clientes.MapPost("", async (ClienteRequest req, AppDb db) =>
{
    if (ProblemaNoCliente(req) is { } problema) return Erro(problema);
    var cliente = new Cliente { Id = Guid.NewGuid(), Nome = "", CriadoEm = DateTimeOffset.UtcNow };
    PreencherCliente(cliente, req);
    db.Clientes.Add(cliente);
    await db.SaveChangesAsync();
    return Results.Ok(ClienteParaDto(cliente));
});

clientes.MapPut("/{id:guid}", async (Guid id, ClienteRequest req, AppDb db) =>
{
    if (ProblemaNoCliente(req) is { } problema) return Erro(problema);
    if (await db.Clientes.FindAsync(id) is not { } cliente) return ClienteNaoEncontrado();
    PreencherCliente(cliente, req);
    await db.SaveChangesAsync();
    return Results.Ok(ClienteParaDto(cliente));
});

clientes.MapDelete("/{id:guid}", async (Guid id, AppDb db) =>
{
    if (await db.Orcamentos.AnyAsync(o => o.ClienteId == id)) return Erro("Este cliente tem orçamentos. Exclua os orçamentos dele antes.");
    await db.Clientes.Where(c => c.Id == id).ExecuteDeleteAsync();
    return Results.NoContent();
});

var orcamentos = app.MapGroup("/api/orcamentos").RequireAuthorization(p => p.RequireRole(Papeis.Gestor));

// shortcut: só os 200 mais recentes, sem paginação; paginar quando o histórico antigo precisar aparecer.
orcamentos.MapGet("", async (AppDb db) =>
    (await db.Orcamentos.AsNoTracking().Include(o => o.Cliente).OrderByDescending(o => o.Numero).Take(200).ToListAsync()).Select(OrcamentoParaDto));

orcamentos.MapPost("", async (OrcamentoRequest req, ClaimsPrincipal quem, AppDb db) =>
{
    if (await ProblemaNoOrcamento(req, db) is { } problema) return Erro(problema);
    // shortcut: dois orçamentos criados no mesmo instante disputam o número, e o índice único recusa um deles com erro 500; tratar se vários gestores passarem a criar ao mesmo tempo.
    var orcamento = new Orcamento
    {
        Id = Guid.NewGuid(),
        Numero = (await db.Orcamentos.MaxAsync(o => (int?)o.Numero) ?? 0) + 1,
        ClienteId = req.ClienteId!.Value,
        CriadoEm = DateTimeOffset.UtcNow,
        CriadoPor = quem.Identity?.Name,
    };
    PreencherOrcamento(orcamento, req);
    db.Orcamentos.Add(orcamento);
    await db.SaveChangesAsync();
    await db.Entry(orcamento).Reference(o => o.Cliente).LoadAsync();
    return Results.Ok(OrcamentoParaDto(orcamento));
});

orcamentos.MapPut("/{id:guid}", async (Guid id, OrcamentoRequest req, AppDb db) =>
{
    if (await ProblemaNoOrcamento(req, db) is { } problema) return Erro(problema);
    if (await db.Orcamentos.FindAsync(id) is not { } orcamento) return OrcamentoNaoEncontrado();
    orcamento.ClienteId = req.ClienteId!.Value;
    PreencherOrcamento(orcamento, req);
    await db.SaveChangesAsync();
    await db.Entry(orcamento).Reference(o => o.Cliente).LoadAsync();
    return Results.Ok(OrcamentoParaDto(orcamento));
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

app.Run();

static IResult Erro(string message) => Results.BadRequest(new { message });
static IResult OsNaoEncontrada() => Results.NotFound(new { message = "OS não encontrada." });
static IResult ContaNaoEncontrada() => Results.NotFound(new { message = "Conta não encontrada." });

static IResult ClienteNaoEncontrado() => Results.NotFound(new { message = "Cliente não encontrado." });
static IResult OrcamentoNaoEncontrado() => Results.NotFound(new { message = "Orçamento não encontrado." });

static UsuarioDto UsuarioParaDto(Usuario u) => new(u.Id, u.Login, u.Nome, u.Papel, u.Ativo, u.TrocarSenha);
static ClienteDto ClienteParaDto(Cliente c) => new(c.Id, c.Nome, c.Telefone, c.Email, c.Documento, c.Endereco);
static OrcamentoDto OrcamentoParaDto(Orcamento o) => new(
    o.Id, o.Numero, o.ClienteId, o.Cliente.Nome, o.CriadoEm,
    o.Itens.Select(i => new ItemDto(i.Descricao, i.Quantidade, i.Unidade, i.PrecoUnitario, i.Total)).ToList(),
    o.Total, o.Pagamento, o.Prazo, o.Observacoes);

static string Limpo(string? texto) => texto?.Trim() ?? "";

static string? ProblemaNoCliente(ClienteRequest r) =>
    Limpo(r.Nome) is "" or { Length: > 200 } ? "Informe o nome do cliente (até 200 caracteres)."
    : Limpo(r.Telefone).Length > 30 ? "O telefone pode ter até 30 caracteres."
    : Limpo(r.Email) is { Length: > 0 } email && (email.Length > 200 || !email.Contains('@')) ? "Confira o e-mail."
    : Limpo(r.Documento).Length > 20 ? "O CPF ou CNPJ pode ter até 20 caracteres."
    : Limpo(r.Endereco).Length > 500 ? "O endereço pode ter até 500 caracteres."
    : null;

static void PreencherCliente(Cliente c, ClienteRequest r)
{
    c.Nome = Limpo(r.Nome);
    c.Telefone = Limpo(r.Telefone);
    c.Email = Limpo(r.Email);
    c.Documento = Limpo(r.Documento);
    c.Endereco = Limpo(r.Endereco);
}

static async Task<string?> ProblemaNoOrcamento(OrcamentoRequest r, AppDb db)
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

static void PreencherOrcamento(Orcamento o, OrcamentoRequest r)
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

static string NormalizarLogin(string? login) => login?.Trim().ToLowerInvariant() ?? "";

static string? ProblemaNaSenha(string? senha) =>
    senha is { Length: >= 8 and <= 200 } ? null : "A senha precisa ter ao menos 8 caracteres.";

static string? ProblemaNaConta(string nome, string? papel) =>
    nome is "" or { Length: > 100 } ? "Informe o nome (até 100 caracteres)."
    : !Papeis.Valido(papel) ? "Papel inválido."
    : null;

// As datas vêm do aparelho porque a OS pode nascer offline; relógio adiantado não vira data futura.
// UTC porque o conversor binário do SQLite ordena pelos ticks locais.
static DateTimeOffset NaoFuturo(DateTimeOffset? data)
{
    var agora = DateTimeOffset.UtcNow;
    return data is { } d && d < agora ? d.ToUniversalTime() : agora;
}
