using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrdemServico.Api.Migrations
{
    /// <inheritdoc />
    public partial class FotoTiradaEm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "TiradaEm",
                table: "Fotos",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TiradaEm",
                table: "Fotos");
        }
    }
}
