using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using static OrdemServico.Api.Respostas;

namespace OrdemServico.Api;

// Login, troca de senha, seletor de responsáveis e gestão da equipe.
public static class RotasContas
{
    // Erros seguidos travam só aquele usuário por alguns minutos: quem erra de propósito não tranca a equipe inteira.
    // shortcut: guardado em memória, zera ao reiniciar a API e não vale entre réplicas; mover para o banco se houver mais de uma instância.
    private static readonly ConcurrentDictionary<string, (int Vezes, DateTime Ate)> FalhasDeLogin = new();

    public static void MapContas(this WebApplication app)
    {
        app.MapPost("/api/login", async (LoginRequest req, AppDb db, Autenticacao auth) =>
        {
            var login = NormalizarLogin(req.Usuario);
            var agora = DateTime.UtcNow;
            if (FalhasDeLogin.TryGetValue(login, out var falha) && falha.Vezes >= Usuario.TentativasDeLogin && falha.Ate > agora)
                return Results.Json(new { message = "Muitas tentativas erradas com este usuário. Aguarde 10 minutos e tente de novo." }, statusCode: StatusCodes.Status429TooManyRequests);

            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Login == login);
            // Mesma resposta para usuário inexistente, conta desativada ou senha errada.
            if (usuario is not { Ativo: true } || !auth.SenhaConfere(usuario, req.Senha))
            {
                FalhasDeLogin.AddOrUpdate(login, _ => (1, agora.AddMinutes(10)), (_, f) => (f.Ate > agora ? f.Vezes + 1 : 1, agora.AddMinutes(10)));
                return Results.Unauthorized();
            }
            FalhasDeLogin.TryRemove(login, out _);
            return Results.Ok(auth.Sessao(usuario));
        }).RequireRateLimiting("login");

        app.MapPut("/api/conta/senha", async (TrocaSenhaRequest req, ClaimsPrincipal quem, AppDb db, Autenticacao auth) =>
        {
            var id = Guid.Parse(quem.FindFirstValue("uid")!);
            var usuario = await db.Usuarios.FirstAsync(u => u.Id == id);
            // 400, não 401: o app trata 401 como sessão encerrada e sairia da conta.
            if (!auth.SenhaConfere(usuario, req.Atual)) return Erro("A senha atual está incorreta.");
            if (ProblemaNaSenha(req.Nova) is { } problema) return Erro(problema);
            if (req.Nova == req.Atual) return Erro("Escolha uma senha diferente da atual.");

            auth.DefinirSenha(usuario, req.Nova!, provisoria: false);
            await db.SaveChangesAsync();
            return Results.Ok(auth.Sessao(usuario));
        }).RequireAuthorization().RequireRateLimiting("login");

        // Para o seletor de responsáveis: só técnicos ativos, e só o nome, sem usuário de login.
        app.MapGet("/api/equipe", async (AppDb db) =>
            await db.Usuarios.AsNoTracking().Where(u => u.Ativo && u.Papel == Papeis.Tecnico).OrderBy(u => u.Nome).Select(u => u.Nome).Distinct().ToListAsync())
            .RequireAuthorization();

        var usuarios = app.MapGroup("/api/usuarios").RequireAuthorization(p => p.RequireRole(Papeis.Gestor));

        usuarios.MapGet("", async (AppDb db) =>
            (await db.Usuarios.AsNoTracking().OrderBy(u => u.Nome).ToListAsync()).Select(ParaDto));

        usuarios.MapPost("", async (NovoUsuarioRequest req, AppDb db, Autenticacao auth) =>
        {
            var login = NormalizarLogin(req.Login);
            var nome = Limpo(req.Nome);
            if (!Regex.IsMatch(login, "^[a-z0-9._-]{3,50}$")) return Erro("O usuário precisa ter de 3 a 50 caracteres, sem espaços nem acentos.");
            if (ProblemaNaConta(nome, req.Papel) is { } problemaConta) return Erro(problemaConta);
            if (await db.Usuarios.AnyAsync(u => u.Login == login)) return Results.Conflict(new { message = "Já existe uma conta com esse usuário." });

            var usuario = new Usuario { Id = Guid.NewGuid(), Login = login, Nome = nome, Papel = req.Papel! };
            auth.DefinirSenha(usuario, Usuario.SenhaPadrao, provisoria: true);
            db.Usuarios.Add(usuario);
            await db.SaveChangesAsync();
            return Results.Ok(ParaDto(usuario));
        });

        usuarios.MapPut("/{id:guid}", async (Guid id, UsuarioRequest req, AppDb db) =>
        {
            var nome = Limpo(req.Nome);
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
            return Results.Ok(ParaDto(usuario));
        });

        // Para quem esqueceu a senha: volta à padrão, e a pessoa escolhe outra no próximo acesso.
        usuarios.MapPut("/{id:guid}/senha", async (Guid id, AppDb db, Autenticacao auth) =>
        {
            if (await db.Usuarios.FindAsync(id) is not { } usuario) return ContaNaoEncontrada();

            auth.DefinirSenha(usuario, Usuario.SenhaPadrao, provisoria: true);
            await db.SaveChangesAsync();
            return Results.Ok(ParaDto(usuario));
        });
    }

    private static IResult ContaNaoEncontrada() => NaoEncontrado("Conta não encontrada.");

    private static UsuarioDto ParaDto(Usuario u) => new(u.Id, u.Login, u.Nome, u.Papel, u.Ativo, u.TrocarSenha);

    private static string? ProblemaNaSenha(string? senha) =>
        senha is { Length: >= 8 and <= 200 } ? null : "A senha precisa ter ao menos 8 caracteres.";

    private static string? ProblemaNaConta(string nome, string? papel) =>
        nome is "" or { Length: > 100 } ? "Informe o nome (até 100 caracteres)."
        : !Papeis.Valido(papel) ? "Papel inválido."
        : null;
}
