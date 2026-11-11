using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OrdemServico.Api;

namespace OrdemServico.Tests;

public sealed class FakeR2 : IR2Storage
{
    public List<string> Excluidas { get; } = [];
    public string GerarUrlUpload(string chave, string contentType) => $"https://r2.test/{chave}";
    public string UrlPublica(string chave) => $"https://cdn.test/{chave}";
    public Task ExcluirAsync(string chave)
    {
        Excluidas.Add(chave);
        return Task.CompletedTask;
    }
    public Dictionary<string, byte[]?> Arquivos { get; } = [];
    public Task<byte[]?> LerAsync(string chave, CancellationToken ct) => Task.FromResult(Arquivos.GetValueOrDefault(chave));
    // Sem valor definido, a foto existe e é pequena: a maioria dos testes não trata de tamanho.
    public Dictionary<string, long?> Tamanhos { get; } = [];
    public Task<long?> TamanhoAsync(string chave, CancellationToken ct) =>
        Task.FromResult(Tamanhos.TryGetValue(chave, out var tamanho) ? tamanho : 1000);
}

public sealed class Api : WebApplicationFactory<Program>
{
    public FakeR2 R2 { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var banco = Path.Combine(Path.GetTempPath(), $"os-teste-{Guid.NewGuid()}.db");
        builder.UseSetting("ConnectionStrings:Db", $"Data Source={banco}");
        builder.ConfigureTestServices(s => s.AddSingleton<IR2Storage>(R2));
    }

    private string? _tokenGestor;
    private string? _tokenTecnico;

    public HttpClient ClienteCom(string token)
    {
        var http = CreateClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return http;
    }

    public async Task<JsonElement> Entrar(string usuario, string senha)
    {
        var login = await CreateClient().PostAsJsonAsync("/api/login", new { usuario, senha });
        login.EnsureSuccessStatusCode();
        return await login.Content.ReadFromJsonAsync<JsonElement>();
    }

    // Tokens guardados porque o login tem limite de 20 por minuto, compartilhado por todos os testes.
    public async Task<HttpClient> ClienteGestor()
    {
        if (_tokenGestor is null)
        {
            var cfg = Services.GetRequiredService<IConfiguration>();
            _tokenGestor = (await Entrar(cfg["Auth:GestorInicial:Usuario"]!, cfg["Auth:GestorInicial:Senha"]!)).GetProperty("token").GetString();
        }
        return ClienteCom(_tokenGestor!);
    }

    public async Task<(string Login, Guid Id)> CriarConta(string papel = "tecnico", string nome = "Ana")
    {
        var login = $"t{Guid.NewGuid():N}"[..12];
        var gestor = await ClienteGestor();
        var resposta = await gestor.PostAsJsonAsync("/api/usuarios", new { login, nome, papel });
        resposta.EnsureSuccessStatusCode();
        var conta = await resposta.Content.ReadFromJsonAsync<JsonElement>();
        return (login, conta.GetProperty("id").GetGuid());
    }

    public async Task<HttpClient> ClienteLogado()
    {
        if (_tokenTecnico is null)
        {
            var (login, _) = await CriarConta();
            _tokenTecnico = (await Entrar(login, Usuario.SenhaPadrao)).GetProperty("token").GetString();
        }
        return ClienteCom(_tokenTecnico!);
    }
}

public class ApiTests(Api api) : IClassFixture<Api>
{
    private static object NovaOrdem(string cliente = "Cliente X", DateTimeOffset? abertaEm = null) => new
    {
        cliente,
        responsaveis = new[] { "Ana", " Ana ", "Bruno", "" },
        observacoes = "Garagem subsolo",
        abertaEm = abertaEm ?? DateTimeOffset.UtcNow.AddHours(-2),
    };

    private static async Task<JsonElement> BuscarOrdem(HttpClient http, Guid id)
    {
        var lista = await http.GetFromJsonAsync<JsonElement>("/api/ordens");
        return lista.EnumerateArray().Single(o => o.GetProperty("id").GetGuid() == id);
    }

    [Fact]
    public async Task Rotas_exigem_token_e_senha_errada_nao_entra()
    {
        var http = api.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync("/api/ordens")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await http.PutAsJsonAsync($"/api/ordens/{Guid.NewGuid()}", NovaOrdem())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await http.PostAsJsonAsync("/api/login", new { usuario = "gestor", senha = "errada" })).StatusCode);

        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "token-invalido");
        Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync("/api/ordens")).StatusCode);
    }

    [Fact]
    public async Task Reenviar_ordem_nao_duplica_e_nao_muda_abertura()
    {
        var http = await api.ClienteLogado();
        var id = Guid.NewGuid();
        var abertura = DateTimeOffset.UtcNow.AddDays(-1);

        (await http.PutAsJsonAsync($"/api/ordens/{id}", NovaOrdem(abertaEm: abertura))).EnsureSuccessStatusCode();
        (await http.PutAsJsonAsync($"/api/ordens/{id}", NovaOrdem("Cliente Y", DateTimeOffset.UtcNow.AddDays(-30)))).EnsureSuccessStatusCode();

        var ordem = await BuscarOrdem(http, id);
        Assert.Equal("Cliente Y", ordem.GetProperty("cliente").GetString());
        Assert.Equal(["Ana", "Bruno"], ordem.GetProperty("responsaveis").EnumerateArray().Select(r => r.GetString()!));
        Assert.Equal(abertura, ordem.GetProperty("abertaEm").GetDateTimeOffset(), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Abertura_no_futuro_vira_agora_e_lista_vem_da_mais_recente()
    {
        var http = await api.ClienteLogado();
        var (antiga, futura) = (Guid.NewGuid(), Guid.NewGuid());
        (await http.PutAsJsonAsync($"/api/ordens/{antiga}", NovaOrdem(abertaEm: DateTimeOffset.UtcNow.AddHours(-5)))).EnsureSuccessStatusCode();
        (await http.PutAsJsonAsync($"/api/ordens/{futura}", NovaOrdem(abertaEm: DateTimeOffset.UtcNow.AddYears(5)))).EnsureSuccessStatusCode();

        var ordem = await BuscarOrdem(http, futura);
        Assert.True(ordem.GetProperty("abertaEm").GetDateTimeOffset() <= DateTimeOffset.UtcNow);

        var ids = (await http.GetFromJsonAsync<JsonElement>("/api/ordens")).EnumerateArray().Select(o => o.GetProperty("id").GetGuid()).ToList();
        Assert.True(ids.IndexOf(futura) < ids.IndexOf(antiga));
    }

    [Theory]
    [InlineData("", "Ana")]
    [InlineData("   ", "Ana")]
    [InlineData("Cliente", " ")]
    public async Task Ordem_invalida_e_rejeitada(string cliente, string responsavel)
    {
        var http = await api.ClienteLogado();
        var resposta = await http.PutAsJsonAsync($"/api/ordens/{Guid.NewGuid()}", new { cliente, responsaveis = new[] { responsavel } });
        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Fluxo_de_foto_e_idempotente_e_exclui_do_r2()
    {
        var http = await api.ClienteLogado();
        var (ordemId, fotoId) = (Guid.NewGuid(), Guid.NewGuid());
        var rota = $"/api/ordens/{ordemId}/fotos/{fotoId}";
        var foto = new { secao = "antes", contentType = "image/jpeg", criadaEm = DateTimeOffset.UtcNow };

        // OS ainda não sincronizada: nada de URL nem cadastro.
        Assert.Equal(HttpStatusCode.NotFound, (await http.PostAsJsonAsync($"{rota}/upload-url", new { contentType = "image/jpeg" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await http.PutAsJsonAsync(rota, foto)).StatusCode);

        (await http.PutAsJsonAsync($"/api/ordens/{ordemId}", NovaOrdem())).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.BadRequest, (await http.PostAsJsonAsync($"{rota}/upload-url", new { contentType = "application/pdf" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await http.PutAsJsonAsync(rota, new { secao = "durante", contentType = "image/jpeg" })).StatusCode);

        var upload = await (await http.PostAsJsonAsync($"{rota}/upload-url", new { contentType = "image/jpeg" })).Content.ReadFromJsonAsync<JsonElement>();
        var chave = $"ordens/{ordemId}/{fotoId}.jpg";
        Assert.Equal($"https://r2.test/{chave}", upload.GetProperty("uploadUrl").GetString());

        // Duas vezes, como na retomada depois de uma resposta perdida.
        (await http.PutAsJsonAsync(rota, foto)).EnsureSuccessStatusCode();
        (await http.PutAsJsonAsync(rota, foto)).EnsureSuccessStatusCode();

        var fotos = (await BuscarOrdem(http, ordemId)).GetProperty("fotos");
        var registrada = Assert.Single(fotos.EnumerateArray());
        Assert.Equal("antes", registrada.GetProperty("secao").GetString());
        Assert.Equal($"https://cdn.test/{chave}", registrada.GetProperty("url").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await http.DeleteAsync(rota)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await http.DeleteAsync(rota)).StatusCode);
        Assert.Equal([chave], api.R2.Excluidas.Where(k => k == chave));
        Assert.Empty((await BuscarOrdem(http, ordemId)).GetProperty("fotos").EnumerateArray());
    }

    [Fact]
    public async Task Data_de_adicao_vem_do_aparelho_e_nunca_fica_no_futuro()
    {
        var http = await api.ClienteLogado();
        var ordemId = Guid.NewGuid();
        (await http.PutAsJsonAsync($"/api/ordens/{ordemId}", NovaOrdem())).EnsureSuccessStatusCode();

        // Adicionada offline há dias e enviada só agora: vale a data do aparelho.
        var offline = DateTimeOffset.UtcNow.AddDays(-3);
        async Task Registrar(DateTimeOffset criadaEm) =>
            (await http.PutAsJsonAsync($"/api/ordens/{ordemId}/fotos/{Guid.NewGuid()}", new { secao = "antes", contentType = "image/jpeg", criadaEm })).EnsureSuccessStatusCode();

        await Registrar(offline);
        await Registrar(DateTimeOffset.UtcNow.AddYears(1));

        var datas = (await BuscarOrdem(http, ordemId)).GetProperty("fotos").EnumerateArray().Select(f => f.GetProperty("criadaEm").GetDateTimeOffset()).ToList();
        Assert.Equal(offline, datas[0], TimeSpan.FromSeconds(1));
        Assert.True(datas[1] <= DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task Login_diz_o_papel_e_pede_para_trocar_senha_provisoria()
    {
        var (login, _) = await api.CriarConta(nome: "Bruno");

        // Maiúscula e espaço digitados no celular não atrapalham.
        var sessao = await api.Entrar($" {login.ToUpperInvariant()} ", Usuario.SenhaPadrao);

        Assert.Equal("Bruno", sessao.GetProperty("nome").GetString());
        Assert.Equal("tecnico", sessao.GetProperty("papel").GetString());
        Assert.True(sessao.GetProperty("trocarSenha").GetBoolean());
    }

    [Fact]
    public async Task Gestor_inicial_entra_sem_precisar_trocar_a_senha()
    {
        var cfg = api.Services.GetRequiredService<IConfiguration>();
        var sessao = await api.Entrar(cfg["Auth:GestorInicial:Usuario"]!, cfg["Auth:GestorInicial:Senha"]!);

        Assert.Equal("gestor", sessao.GetProperty("papel").GetString());
        Assert.False(sessao.GetProperty("trocarSenha").GetBoolean());
    }

    [Fact]
    public async Task Tecnico_nao_gerencia_contas()
    {
        var tecnico = await api.ClienteLogado();
        var (_, id) = await api.CriarConta();

        Assert.Equal(HttpStatusCode.Forbidden, (await tecnico.GetAsync("/api/usuarios")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await tecnico.PostAsJsonAsync("/api/usuarios", new { login = "invasor", nome = "X", papel = "gestor" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await tecnico.PutAsJsonAsync($"/api/usuarios/{id}", new { nome = "X", papel = "gestor", ativo = true })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await tecnico.PutAsJsonAsync($"/api/usuarios/{id}/senha", new { })).StatusCode);
    }

    [Fact]
    public async Task Seletor_de_responsaveis_mostra_so_os_nomes_dos_tecnicos_ativos()
    {
        var gestor = await api.ClienteGestor();
        var tecnico = await api.ClienteLogado();
        var (_, desativada) = await api.CriarConta(nome: "Pessoa Desativada");
        await api.CriarConta(nome: "Pessoa Ativa");
        var (_, gestora) = await api.CriarConta(papel: "gestor", nome: "Pessoa Gestora");
        (await gestor.PutAsJsonAsync($"/api/usuarios/{desativada}", new { nome = "Pessoa Desativada", papel = "tecnico", ativo = false })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateClient().GetAsync("/api/equipe")).StatusCode);
        var nomes = (await tecnico.GetFromJsonAsync<string[]>("/api/equipe"))!;
        Assert.Contains("Pessoa Ativa", nomes);
        Assert.DoesNotContain("Pessoa Desativada", nomes);
        Assert.DoesNotContain("Pessoa Gestora", nomes);
        Assert.DoesNotContain("Gestor", nomes);

        // Desativa no fim: outro teste depende de existir um só gestor ativo, e o banco é compartilhado.
        (await gestor.PutAsJsonAsync($"/api/usuarios/{gestora}", new { nome = "Pessoa Gestora", papel = "gestor", ativo = false })).EnsureSuccessStatusCode();
    }

    [Theory]
    [InlineData("ab", "Nome", "tecnico")]
    [InlineData("com espaco", "Nome", "tecnico")]
    [InlineData("valido1", "", "tecnico")]
    [InlineData("valido2", "Nome", "dono")]
    public async Task Conta_invalida_e_recusada(string login, string nome, string papel)
    {
        var gestor = await api.ClienteGestor();
        var resposta = await gestor.PostAsJsonAsync("/api/usuarios", new { login, nome, papel });
        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Usuario_repetido_e_recusado()
    {
        var gestor = await api.ClienteGestor();
        var (login, _) = await api.CriarConta();
        var resposta = await gestor.PostAsJsonAsync("/api/usuarios", new { login = login.ToUpperInvariant(), nome = "Outro", papel = "tecnico" });
        Assert.Equal(HttpStatusCode.Conflict, resposta.StatusCode);
    }

    [Fact]
    public async Task Conta_desativada_perde_o_acesso_na_hora_e_volta_ao_reativar()
    {
        var gestor = await api.ClienteGestor();
        var (login, id) = await api.CriarConta();
        var token = (await api.Entrar(login, Usuario.SenhaPadrao)).GetProperty("token").GetString()!;
        var http = api.ClienteCom(token);
        Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/api/ordens")).StatusCode);

        (await gestor.PutAsJsonAsync($"/api/usuarios/{id}", new { nome = "Ana", papel = "tecnico", ativo = false })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync("/api/ordens")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await api.CreateClient().PostAsJsonAsync("/api/login", new { usuario = login, senha = Usuario.SenhaPadrao })).StatusCode);

        (await gestor.PutAsJsonAsync($"/api/usuarios/{id}", new { nome = "Ana", papel = "tecnico", ativo = true })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/api/ordens")).StatusCode);
    }

    [Fact]
    public async Task Trocar_senha_encerra_a_sessao_antiga_e_mantem_a_deste_aparelho()
    {
        var (login, _) = await api.CriarConta();
        var token = (await api.Entrar(login, Usuario.SenhaPadrao)).GetProperty("token").GetString()!;
        var antigo = api.ClienteCom(token);

        async Task<HttpResponseMessage> Trocar(string atual, string nova) =>
            await antigo.PutAsJsonAsync("/api/conta/senha", new { atual, nova });

        Assert.Equal(HttpStatusCode.BadRequest, (await Trocar("errada", "senha-nova-1")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Trocar(Usuario.SenhaPadrao, "curta")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Trocar(Usuario.SenhaPadrao, Usuario.SenhaPadrao)).StatusCode);

        var ok = await Trocar(Usuario.SenhaPadrao, "senha-nova-1");
        ok.EnsureSuccessStatusCode();
        var sessao = await ok.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(sessao.GetProperty("trocarSenha").GetBoolean());

        Assert.Equal(HttpStatusCode.Unauthorized, (await antigo.GetAsync("/api/ordens")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await api.ClienteCom(sessao.GetProperty("token").GetString()!).GetAsync("/api/ordens")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await api.CreateClient().PostAsJsonAsync("/api/login", new { usuario = login, senha = "senha-nova-1" })).StatusCode);
    }

    [Fact]
    public async Task Gestor_redefine_a_senha_e_a_pessoa_precisa_trocar_de_novo()
    {
        var gestor = await api.ClienteGestor();
        var (login, id) = await api.CriarConta();
        var http = api.ClienteCom((await api.Entrar(login, Usuario.SenhaPadrao)).GetProperty("token").GetString()!);
        var troca = await http.PutAsJsonAsync("/api/conta/senha", new { atual = Usuario.SenhaPadrao, nova = "senha-esquecida" });
        troca.EnsureSuccessStatusCode();
        http = api.ClienteCom((await troca.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!);

        (await gestor.PutAsJsonAsync($"/api/usuarios/{id}/senha", new { })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync("/api/ordens")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateClient().PostAsJsonAsync("/api/login", new { usuario = login, senha = "senha-esquecida" })).StatusCode);
        Assert.True((await api.Entrar(login, Usuario.SenhaPadrao)).GetProperty("trocarSenha").GetBoolean());
    }

    [Fact]
    public async Task Ultimo_gestor_ativo_nao_pode_ser_rebaixado_nem_desativado()
    {
        var gestor = await api.ClienteGestor();
        var contas = await gestor.GetFromJsonAsync<JsonElement>("/api/usuarios");
        var inicial = contas.EnumerateArray().Single(c => c.GetProperty("login").GetString() == "gestor").GetProperty("id").GetGuid();
        var rota = $"/api/usuarios/{inicial}";

        Assert.Equal(HttpStatusCode.BadRequest, (await gestor.PutAsJsonAsync(rota, new { nome = "Gestor", papel = "tecnico", ativo = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await gestor.PutAsJsonAsync(rota, new { nome = "Gestor", papel = "gestor", ativo = false })).StatusCode);

        // Com outro gestor ativo, a regra libera; desfaz em seguida porque o banco é compartilhado.
        var (_, outro) = await api.CriarConta(papel: "gestor");
        (await gestor.PutAsJsonAsync($"/api/usuarios/{outro}", new { nome = "Ana", papel = "tecnico", ativo = true })).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Relatorio_so_sai_para_o_gestor_mesmo_com_foto_faltando_ou_ilegivel()
    {
        var gestor = await api.ClienteGestor();
        var tecnico = await api.ClienteLogado();
        var ordemId = Guid.NewGuid();
        var rota = $"/api/ordens/{ordemId}/relatorio";

        Assert.Equal(HttpStatusCode.NotFound, (await gestor.GetAsync(rota)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateClient().GetAsync(rota)).StatusCode);

        (await tecnico.PutAsJsonAsync($"/api/ordens/{ordemId}", NovaOrdem("Cliente com acentuação"))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Forbidden, (await tecnico.GetAsync(rota)).StatusCode);

        // Sem fotos ainda: sai mesmo assim e diz o que falta.
        var vazio = await gestor.GetAsync(rota);
        vazio.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", vazio.Content.Headers.ContentType?.MediaType);

        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
        async Task Adicionar(string secao, byte[]? arquivo)
        {
            var fotoId = Guid.NewGuid();
            api.R2.Arquivos[$"ordens/{ordemId}/{fotoId}.jpg"] = arquivo;
            (await tecnico.PutAsJsonAsync($"/api/ordens/{ordemId}/fotos/{fotoId}", new { secao, contentType = "image/jpeg", criadaEm = DateTimeOffset.UtcNow })).EnsureSuccessStatusCode();
        }
        await Adicionar("antes", png);
        await Adicionar("antes", null);
        await Adicionar("depois", png);
        await Adicionar("depois", [1, 2, 3]);

        var resposta = await gestor.GetAsync(rota);
        resposta.EnsureSuccessStatusCode();
        var pdf = await resposta.Content.ReadAsByteArrayAsync();
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(pdf[..4]));
        Assert.StartsWith($"Relatorio-OS-{ordemId.ToString("N")[..8].ToUpperInvariant()}", resposta.Content.Headers.ContentDisposition?.FileName);
    }

    [Fact]
    public void Orientacao_vem_do_cabecalho_da_imagem()
    {
        static byte[] Png(int largura, int altura)
        {
            var d = new byte[24];
            (d[0], d[1]) = (0x89, (byte)'P');
            System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(d.AsSpan(16), largura);
            System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(d.AsSpan(20), altura);
            return d;
        }
        // Um bloco APP0 antes das dimensões, como nas fotos de câmera, e um DHT (C4), que não traz dimensões.
        static byte[] Jpeg(int largura, int altura) =>
        [
            0xFF, 0xD8,
            0xFF, 0xE0, 0x00, 0x04, 0x00, 0x00,
            0xFF, 0xC4, 0x00, 0x04, 0x00, 0x00,
            0xFF, 0xC0, 0x00, 0x11, 0x08, (byte)(altura >> 8), (byte)altura, (byte)(largura >> 8), (byte)largura, 0x03, 0x00, 0x00,
        ];

        Assert.True(RelatorioPdf.EstaEmPe(Png(100, 300)));
        Assert.False(RelatorioPdf.EstaEmPe(Png(300, 100)));
        Assert.True(RelatorioPdf.EstaEmPe(Jpeg(2252, 4000)));
        Assert.False(RelatorioPdf.EstaEmPe(Jpeg(4000, 2252)));

        static byte[] Webp(string bloco, int largura, int altura)
        {
            var d = new byte[32];
            "RIFF"u8.CopyTo(d);
            "WEBP"u8.CopyTo(d.AsSpan(8));
            System.Text.Encoding.ASCII.GetBytes(bloco).CopyTo(d, 12);
            var bin = System.Buffers.Binary.BinaryPrimitives.ReadInt32LittleEndian;
            switch (bloco)
            {
                case "VP8 ":
                    System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(d.AsSpan(26), (ushort)largura);
                    System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(d.AsSpan(28), (ushort)altura);
                    break;
                case "VP8L":
                    System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(d.AsSpan(21), (uint)((largura - 1) | (altura - 1) << 14));
                    break;
                case "VP8X":
                    (d[24], d[25], d[26]) = ((byte)(largura - 1), (byte)((largura - 1) >> 8), (byte)((largura - 1) >> 16));
                    (d[27], d[28], d[29]) = ((byte)(altura - 1), (byte)((altura - 1) >> 8), (byte)((altura - 1) >> 16));
                    break;
            }
            return d;
        }
        foreach (var bloco in new[] { "VP8 ", "VP8L", "VP8X" })
        {
            Assert.True(RelatorioPdf.EstaEmPe(Webp(bloco, 2304, 4096)));
            Assert.False(RelatorioPdf.EstaEmPe(Webp(bloco, 4096, 2304)));
        }
        Assert.Null(RelatorioPdf.EstaEmPe(null));
        Assert.Null(RelatorioPdf.EstaEmPe(new byte[40]));
    }

    [Fact]
    public async Task Foto_acima_de_4_MB_ou_que_nao_chegou_ao_R2_nao_e_registrada()
    {
        var http = await api.ClienteLogado();
        var ordemId = Guid.NewGuid();
        (await http.PutAsJsonAsync($"/api/ordens/{ordemId}", NovaOrdem())).EnsureSuccessStatusCode();

        async Task<HttpResponseMessage> Registrar(Guid fotoId, long? tamanho)
        {
            api.R2.Tamanhos[$"ordens/{ordemId}/{fotoId}.webp"] = tamanho;
            return await http.PutAsJsonAsync($"/api/ordens/{ordemId}/fotos/{fotoId}", new { secao = "antes", contentType = "image/webp" });
        }

        var (grande, ausente, noLimite) = (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        Assert.Equal(HttpStatusCode.BadRequest, (await Registrar(grande, 4 * 1024 * 1024 + 1)).StatusCode);
        Assert.Contains($"ordens/{ordemId}/{grande}.webp", api.R2.Excluidas);
        Assert.Equal(HttpStatusCode.BadRequest, (await Registrar(ausente, null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Registrar(noLimite, 4 * 1024 * 1024)).StatusCode);

        var registradas = (await BuscarOrdem(http, ordemId)).GetProperty("fotos").EnumerateArray().Select(f => f.GetProperty("id").GetGuid());
        Assert.Equal([noLimite], registradas);
    }

    [Fact]
    public async Task OS_e_foto_guardam_quem_abriu_e_quem_enviou()
    {
        var (login, _) = await api.CriarConta(nome: "Carla");
        var carla = api.ClienteCom((await api.Entrar(login, Usuario.SenhaPadrao)).GetProperty("token").GetString()!);
        var (ordemId, fotoId) = (Guid.NewGuid(), Guid.NewGuid());

        (await carla.PutAsJsonAsync($"/api/ordens/{ordemId}", NovaOrdem())).EnsureSuccessStatusCode();
        (await carla.PutAsJsonAsync($"/api/ordens/{ordemId}/fotos/{fotoId}", new { secao = "antes", contentType = "image/jpeg" })).EnsureSuccessStatusCode();

        using var escopo = api.Services.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<AppDb>();
        Assert.Equal("Carla", db.Ordens.Single(o => o.Id == ordemId).AbertaPor);
        Assert.Equal("Carla", db.Fotos.Single(f => f.Id == fotoId).EnviadaPor);
    }

    [Fact]
    public void Url_pre_assinada_aponta_para_o_r2_com_assinatura_v4()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["CloudflareR2:AccountId"] = "conta",
            ["CloudflareR2:AccessKey"] = "chave",
            ["CloudflareR2:SecretKey"] = "segredo",
            ["CloudflareR2:BucketName"] = "fotos",
            ["CloudflareR2:PublicUrl"] = "https://cdn.exemplo.com/",
        }).Build();
        using var r2 = new R2Storage(cfg);

        var url = r2.GerarUrlUpload("ordens/a/b.jpg", "image/jpeg");

        Assert.StartsWith("https://conta.r2.cloudflarestorage.com/fotos/ordens/a/b.jpg?", url);
        Assert.Contains("X-Amz-Signature=", url);
        Assert.Contains("X-Amz-Algorithm=AWS4-HMAC-SHA256", url);
        Assert.Equal("https://cdn.exemplo.com/ordens/a/b.jpg", r2.UrlPublica("ordens/a/b.jpg"));
    }

    [Fact]
    public void R2_sem_credenciais_falha_com_mensagem_clara_so_ao_enviar()
    {
        using var r2 = new R2Storage(new ConfigurationBuilder().Build());
        Assert.Equal("/x.jpg", r2.UrlPublica("x.jpg"));
        var erro = Assert.Throws<InvalidOperationException>(() => r2.GerarUrlUpload("x.jpg", "image/jpeg"));
        Assert.Contains("CloudflareR2:PublicUrl", erro.Message);
    }

    private async Task<Guid> CriarCliente(HttpClient gestor, string nome = "Maria Souza")
    {
        var resposta = await gestor.PostAsJsonAsync("/api/clientes", new { nome, telefone = "(31) 99999-0000", email = "", documento = "", endereco = "Rua A, 10" });
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static object NovoOrcamento(Guid clienteId, params object[] itens) => new
    {
        clienteId,
        itens,
        pagamento = " PIX ",
        prazo = "3 dias úteis",
        observacoes = "",
    };

    [Fact]
    public async Task Clientes_e_orcamentos_sao_so_do_gestor()
    {
        var tecnico = await api.ClienteLogado();
        var clienteId = await CriarCliente(await api.ClienteGestor());

        Assert.Equal(HttpStatusCode.Forbidden, (await tecnico.GetAsync("/api/clientes")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await tecnico.PostAsJsonAsync("/api/clientes", new { nome = "X" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await tecnico.GetAsync("/api/orcamentos")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await tecnico.PostAsJsonAsync("/api/orcamentos", NovoOrcamento(clienteId))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateClient().GetAsync("/api/clientes")).StatusCode);
    }

    [Fact]
    public async Task Orcamento_soma_cada_linha_arredondada_numera_em_sequencia_e_gera_pdf()
    {
        var gestor = await api.ClienteGestor();
        var clienteId = await CriarCliente(gestor, "Ângela Prado");

        var primeiro = await gestor.PostAsJsonAsync("/api/orcamentos", NovoOrcamento(clienteId,
            new { descricao = " Cabo 6 mm² ", quantidade = 2.5m, unidade = "m", precoUnitario = 10.99m },
            new { descricao = "Wallbox 7 kW", quantidade = 1, unidade = "un", precoUnitario = 3200m },
            new { descricao = "Brinde", quantidade = 3, unidade = "un", precoUnitario = 0m }));
        primeiro.EnsureSuccessStatusCode();
        var a = await primeiro.Content.ReadFromJsonAsync<JsonElement>();

        // 2,5 x 10,99 = 27,475, que vira 27,48 na linha; o total soma as linhas.
        Assert.Equal(27.48m, a.GetProperty("itens")[0].GetProperty("total").GetDecimal());
        Assert.Equal(3227.48m, a.GetProperty("total").GetDecimal());
        Assert.Equal("Cabo 6 mm²", a.GetProperty("itens")[0].GetProperty("descricao").GetString());
        Assert.Equal("PIX", a.GetProperty("pagamento").GetString());
        Assert.Equal("Ângela Prado", a.GetProperty("clienteNome").GetString());

        var segundo = await gestor.PostAsJsonAsync("/api/orcamentos", NovoOrcamento(clienteId, new { descricao = "Visita", quantidade = 1, unidade = "sv", precoUnitario = 150m }));
        var b = await segundo.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(a.GetProperty("numero").GetInt32() + 1, b.GetProperty("numero").GetInt32());

        // Editar troca os itens e mantém número e data.
        var id = a.GetProperty("id").GetGuid();
        (await gestor.PutAsJsonAsync($"/api/orcamentos/{id}", NovoOrcamento(clienteId, new { descricao = "Tomada 20 A", quantidade = 4, unidade = "un", precoUnitario = 35.9m }))).EnsureSuccessStatusCode();
        var lista = await gestor.GetFromJsonAsync<JsonElement>("/api/orcamentos");
        var editado = lista.EnumerateArray().Single(o => o.GetProperty("id").GetGuid() == id);
        Assert.Equal(143.6m, editado.GetProperty("total").GetDecimal());
        Assert.Equal(a.GetProperty("numero").GetInt32(), editado.GetProperty("numero").GetInt32());
        // O banco guarda a data em milissegundos.
        Assert.Equal(a.GetProperty("criadoEm").GetDateTimeOffset(), editado.GetProperty("criadoEm").GetDateTimeOffset(), TimeSpan.FromMilliseconds(1));
        Assert.Equal(b.GetProperty("id").GetGuid(), lista[0].GetProperty("id").GetGuid());

        var pdf = await gestor.GetAsync($"/api/orcamentos/{id}/pdf");
        pdf.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", pdf.Content.Headers.ContentType?.MediaType);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString((await pdf.Content.ReadAsByteArrayAsync())[..4]));
        Assert.Equal($"Orcamento-{a.GetProperty("numero").GetInt32():D4}.pdf", pdf.Content.Headers.ContentDisposition?.FileName);
        Assert.Equal(HttpStatusCode.NotFound, (await gestor.GetAsync($"/api/orcamentos/{Guid.NewGuid()}/pdf")).StatusCode);
    }

    [Theory]
    [InlineData(false, "Mat", 1, "un", 10, "Escolha o cliente.")]
    [InlineData(true, "", 1, "un", 10, "Item 1: informe o material")]
    [InlineData(true, "Mat", 1, "", 10, "Item 1: informe a unidade")]
    [InlineData(true, "Mat", 0, "un", 10, "Item 1: a quantidade")]
    [InlineData(true, "Mat", 1.0005, "un", 10, "Item 1: a quantidade")]
    [InlineData(true, "Mat", 1, "un", -1, "Item 1: o preço")]
    [InlineData(true, "Mat", 1, "un", 1.234, "Item 1: o preço")]
    public async Task Orcamento_invalido_e_recusado(bool clienteExiste, string descricao, double quantidade, string unidade, double preco, string mensagem)
    {
        var gestor = await api.ClienteGestor();
        var clienteId = clienteExiste ? await CriarCliente(gestor) : Guid.NewGuid();
        var resposta = await gestor.PostAsJsonAsync("/api/orcamentos", NovoOrcamento(clienteId, new { descricao, quantidade = (decimal)quantidade, unidade, precoUnitario = (decimal)preco }));
        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.StartsWith(mensagem, (await resposta.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());

        var semItens = await gestor.PostAsJsonAsync("/api/orcamentos", NovoOrcamento(await CriarCliente(gestor)));
        Assert.Equal(HttpStatusCode.BadRequest, semItens.StatusCode);
    }

    [Fact]
    public async Task Cliente_com_orcamento_nao_e_excluido_e_cadastro_invalido_e_recusado()
    {
        var gestor = await api.ClienteGestor();
        Assert.Equal(HttpStatusCode.BadRequest, (await gestor.PostAsJsonAsync("/api/clientes", new { nome = " " })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await gestor.PostAsJsonAsync("/api/clientes", new { nome = "X", email = "sem-arroba" })).StatusCode);

        var clienteId = await CriarCliente(gestor, "Zélia Cliente Excluível");
        (await gestor.PutAsJsonAsync($"/api/clientes/{clienteId}", new { nome = "Zélia Costa", telefone = "", email = "z@x.com", documento = "123", endereco = "" })).EnsureSuccessStatusCode();
        var clientes = await gestor.GetFromJsonAsync<JsonElement>("/api/clientes");
        Assert.Equal("z@x.com", clientes.EnumerateArray().Single(c => c.GetProperty("id").GetGuid() == clienteId).GetProperty("email").GetString());

        var orcamento = await (await gestor.PostAsJsonAsync("/api/orcamentos", NovoOrcamento(clienteId, new { descricao = "Mat", quantidade = 1, unidade = "un", precoUnitario = 1m })))
            .Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(HttpStatusCode.BadRequest, (await gestor.DeleteAsync($"/api/clientes/{clienteId}")).StatusCode);

        (await gestor.DeleteAsync($"/api/orcamentos/{orcamento.GetProperty("id").GetGuid()}")).EnsureSuccessStatusCode();
        (await gestor.DeleteAsync($"/api/clientes/{clienteId}")).EnsureSuccessStatusCode();
        clientes = await gestor.GetFromJsonAsync<JsonElement>("/api/clientes");
        Assert.DoesNotContain(clientes.EnumerateArray(), c => c.GetProperty("id").GetGuid() == clienteId);
    }

    [Fact]
    public async Task Erros_seguidos_travam_so_o_usuario_errado()
    {
        var (alvo, _) = await api.CriarConta(nome: "Alvo");
        var (outro, _) = await api.CriarConta(nome: "Outro");
        var http = api.CreateClient();
        for (var i = 0; i < Usuario.TentativasDeLogin; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await http.PostAsJsonAsync("/api/login", new { usuario = alvo, senha = "errada" })).StatusCode);

        // Travado até com a senha certa; o colega entra normalmente.
        Assert.Equal(HttpStatusCode.TooManyRequests, (await http.PostAsJsonAsync("/api/login", new { usuario = alvo, senha = Usuario.SenhaPadrao })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await http.PostAsJsonAsync("/api/login", new { usuario = outro, senha = Usuario.SenhaPadrao })).StatusCode);
    }

    [Fact]
    public async Task So_o_gestor_exclui_OS_e_as_fotos_saem_do_R2()
    {
        var gestor = await api.ClienteGestor();
        var tecnico = await api.ClienteLogado();
        var ordemId = Guid.NewGuid();
        var fotoId = Guid.NewGuid();
        (await tecnico.PutAsJsonAsync($"/api/ordens/{ordemId}", NovaOrdem("Para excluir"))).EnsureSuccessStatusCode();
        (await tecnico.PutAsJsonAsync($"/api/ordens/{ordemId}/fotos/{fotoId}", new { secao = "antes", contentType = "image/jpeg", criadaEm = DateTimeOffset.UtcNow })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Forbidden, (await tecnico.DeleteAsync($"/api/ordens/{ordemId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await gestor.DeleteAsync($"/api/ordens/{ordemId}")).StatusCode);

        var lista = await gestor.GetFromJsonAsync<JsonElement>("/api/ordens");
        Assert.DoesNotContain(lista.EnumerateArray(), o => o.GetProperty("id").GetGuid() == ordemId);
        Assert.Contains($"ordens/{ordemId}/{fotoId}.jpg", api.R2.Excluidas);
        Assert.Equal(HttpStatusCode.NoContent, (await gestor.DeleteAsync($"/api/ordens/{ordemId}")).StatusCode);
    }

    [Fact]
    public async Task Situacao_muda_sozinha_e_numero_excluido_nao_volta()
    {
        var gestor = await api.ClienteGestor();
        var clienteId = await CriarCliente(gestor, "Situação Teste");
        var item = new { descricao = "Mat", quantidade = 1, unidade = "un", precoUnitario = 10m };
        var a = await (await gestor.PostAsJsonAsync("/api/orcamentos", NovoOrcamento(clienteId, item))).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("aberto", a.GetProperty("situacao").GetString());

        var id = a.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.BadRequest, (await gestor.PutAsJsonAsync($"/api/orcamentos/{id}/situacao", new { situacao = "qualquer" })).StatusCode);
        var aprovado = await (await gestor.PutAsJsonAsync($"/api/orcamentos/{id}/situacao", new { situacao = "aprovado" })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("aprovado", aprovado.GetProperty("situacao").GetString());
        Assert.Equal(10m, aprovado.GetProperty("total").GetDecimal());

        // Editar os itens não mexe na situação.
        (await gestor.PutAsJsonAsync($"/api/orcamentos/{id}", NovoOrcamento(clienteId, item))).EnsureSuccessStatusCode();
        var lista = await gestor.GetFromJsonAsync<JsonElement>("/api/orcamentos");
        Assert.Equal("aprovado", lista.EnumerateArray().Single(o => o.GetProperty("id").GetGuid() == id).GetProperty("situacao").GetString());

        // O mais recente excluído não devolve o número.
        (await gestor.DeleteAsync($"/api/orcamentos/{id}")).EnsureSuccessStatusCode();
        var b = await (await gestor.PostAsJsonAsync("/api/orcamentos", NovoOrcamento(clienteId, item))).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(a.GetProperty("numero").GetInt32() + 1, b.GetProperty("numero").GetInt32());
        Assert.Single((await gestor.GetFromJsonAsync<JsonElement>("/api/orcamentos?limite=1")).EnumerateArray());
    }
}
