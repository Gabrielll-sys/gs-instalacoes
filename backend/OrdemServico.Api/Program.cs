using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.FileProviders.Physical;
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
var autenticacao = new Autenticacao(chaveJwt);

builder.Services.AddSingleton(autenticacao);
builder.Services.AddDbContext<AppDb>(o => o.UseSqlite(cfg.GetConnectionString("Db")));
builder.Services.AddSingleton<IR2Storage, R2Storage>();
builder.Services.AddSingleton<BackupDiario>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<BackupDiario>());
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
            Login = Respostas.NormalizarLogin(Obrigatorio("Auth:GestorInicial:Usuario")),
            Nome = "Gestor",
            Papel = Papeis.Gestor,
        };
        // Não é provisória: quem a define é quem instala, e não outra pessoa da equipe. Dá para trocar no menu da conta.
        autenticacao.DefinirSenha(gestor, Obrigatorio("Auth:GestorInicial:Senha"), provisoria: false);
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

app.MapContas();
app.MapOrdens();
app.MapOrcamentos();

app.Run();
