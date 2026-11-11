using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace OrdemServico.Api;

// Senhas e tokens num lugar só: o login, a troca de senha, a equipe e a conta inicial usam as mesmas regras.
public sealed class Autenticacao(SymmetricSecurityKey chave)
{
    private readonly PasswordHasher<Usuario> senhas = new();

    public SymmetricSecurityKey Chave => chave;

    public SessaoDto Sessao(Usuario u) => new(
        new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            // Só a identidade: nome e papel são lidos do banco a cada pedido.
            Subject = new ClaimsIdentity([new Claim("uid", u.Id.ToString()), new Claim("ver", u.VersaoSessao.ToString())]),
            // Validade longa porque o técnico pode passar dias em campo sem conseguir renovar.
            Expires = DateTime.UtcNow.AddDays(90),
            SigningCredentials = new SigningCredentials(chave, SecurityAlgorithms.HmacSha256),
        }),
        u.Nome, u.Papel, u.TrocarSenha);

    public bool SenhaConfere(Usuario u, string? senha) =>
        senhas.VerifyHashedPassword(u, u.SenhaHash, senha ?? "") != PasswordVerificationResult.Failed;

    public void DefinirSenha(Usuario u, string senha, bool provisoria)
    {
        u.SenhaHash = senhas.HashPassword(u, senha);
        u.TrocarSenha = provisoria;
        u.VersaoSessao++;
    }
}
