using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace OrdemServico.Api;

// Só para o "dotnet ef": as migrações são geradas para o MySQL de produção, sem precisar de um servidor rodando.
public class AppDbDesignTime : IDesignTimeDbContextFactory<AppDb>
{
    public AppDb CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<AppDb>().UseMySQL("Server=localhost;Database=gs;User ID=gs;Password=gs").Options);
}
