using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrdemServico.Api.Migrations
{
    /// <inheritdoc />
    public partial class FinalizadoETipos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Tipos",
                table: "Ordens",
                type: "TEXT",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<long>(
                name: "FinalizadoEm",
                table: "Orcamentos",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "LembreteResolvidoEm",
                table: "Orcamentos",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Tipos",
                table: "Ordens");

            migrationBuilder.DropColumn(
                name: "FinalizadoEm",
                table: "Orcamentos");

            migrationBuilder.DropColumn(
                name: "LembreteResolvidoEm",
                table: "Orcamentos");
        }
    }
}
