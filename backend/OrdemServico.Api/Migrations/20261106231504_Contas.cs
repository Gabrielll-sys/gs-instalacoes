using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrdemServico.Api.Migrations
{
    /// <inheritdoc />
    public partial class Contas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TiradaEm",
                table: "Fotos");

            migrationBuilder.AddColumn<string>(
                name: "AbertaPor",
                table: "Ordens",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnviadaPor",
                table: "Fotos",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Login = table.Column<string>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", nullable: false),
                    Papel = table.Column<string>(type: "TEXT", nullable: false),
                    SenhaHash = table.Column<string>(type: "TEXT", nullable: false),
                    Ativo = table.Column<bool>(type: "INTEGER", nullable: false),
                    TrocarSenha = table.Column<bool>(type: "INTEGER", nullable: false),
                    VersaoSessao = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                });

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
                name: "Usuarios");

            migrationBuilder.DropColumn(
                name: "AbertaPor",
                table: "Ordens");

            migrationBuilder.DropColumn(
                name: "EnviadaPor",
                table: "Fotos");

            migrationBuilder.AddColumn<long>(
                name: "TiradaEm",
                table: "Fotos",
                type: "INTEGER",
                nullable: true);
        }
    }
}
