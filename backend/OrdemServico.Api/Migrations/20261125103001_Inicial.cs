using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrdemServico.Api.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Clientes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Nome = table.Column<string>(type: "longtext", nullable: false),
                    Telefone = table.Column<string>(type: "longtext", nullable: false),
                    Email = table.Column<string>(type: "longtext", nullable: false),
                    Documento = table.Column<string>(type: "longtext", nullable: false),
                    Endereco = table.Column<string>(type: "longtext", nullable: false),
                    CriadoEm = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clientes", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Contadores",
                columns: table => new
                {
                    Nome = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                    Valor = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contadores", x => x.Nome);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Ordens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Cliente = table.Column<string>(type: "longtext", nullable: false),
                    Responsaveis = table.Column<string>(type: "longtext", nullable: false),
                    Tipos = table.Column<string>(type: "longtext", nullable: false),
                    Observacoes = table.Column<string>(type: "longtext", nullable: false),
                    AbertaEm = table.Column<long>(type: "bigint", nullable: false),
                    AbertaPor = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ordens", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Login = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    Nome = table.Column<string>(type: "longtext", nullable: false),
                    Papel = table.Column<string>(type: "longtext", nullable: false),
                    SenhaHash = table.Column<string>(type: "longtext", nullable: false),
                    Ativo = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    TrocarSenha = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    VersaoSessao = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Orcamentos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Numero = table.Column<int>(type: "int", nullable: false),
                    ClienteId = table.Column<Guid>(type: "char(36)", nullable: false),
                    Itens = table.Column<string>(type: "longtext", nullable: false),
                    Pagamento = table.Column<string>(type: "longtext", nullable: false),
                    Prazo = table.Column<string>(type: "longtext", nullable: false),
                    Observacoes = table.Column<string>(type: "longtext", nullable: false),
                    Veiculo = table.Column<string>(type: "longtext", nullable: false),
                    CriadoEm = table.Column<long>(type: "bigint", nullable: false),
                    CriadoPor = table.Column<string>(type: "longtext", nullable: true),
                    Situacao = table.Column<string>(type: "longtext", nullable: false),
                    FinalizadoEm = table.Column<long>(type: "bigint", nullable: true),
                    LembreteResolvidoEm = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orcamentos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orcamentos_Clientes_ClienteId",
                        column: x => x.ClienteId,
                        principalTable: "Clientes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Fotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    OrdemId = table.Column<Guid>(type: "char(36)", nullable: false),
                    Secao = table.Column<string>(type: "longtext", nullable: false),
                    Chave = table.Column<string>(type: "longtext", nullable: false),
                    CriadaEm = table.Column<long>(type: "bigint", nullable: false),
                    EnviadaPor = table.Column<string>(type: "longtext", nullable: true),
                    TemMiniatura = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Fotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Fotos_Ordens_OrdemId",
                        column: x => x.OrdemId,
                        principalTable: "Ordens",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Fotos_OrdemId",
                table: "Fotos",
                column: "OrdemId");

            migrationBuilder.CreateIndex(
                name: "IX_Orcamentos_ClienteId",
                table: "Orcamentos",
                column: "ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_Orcamentos_Numero",
                table: "Orcamentos",
                column: "Numero",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Login",
                table: "Usuarios",
                column: "Login",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Contadores");

            migrationBuilder.DropTable(
                name: "Fotos");

            migrationBuilder.DropTable(
                name: "Orcamentos");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Ordens");

            migrationBuilder.DropTable(
                name: "Clientes");
        }
    }
}
