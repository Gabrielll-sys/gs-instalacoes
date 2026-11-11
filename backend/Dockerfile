# API para o Railway. Contexto de build: a pasta backend.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY OrdemServico.Api/OrdemServico.Api.csproj OrdemServico.Api/
RUN dotnet restore OrdemServico.Api/OrdemServico.Api.csproj
COPY OrdemServico.Api/ OrdemServico.Api/
RUN dotnet publish OrdemServico.Api/OrdemServico.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
# O gerador de PDF procura fontes de reserva (emoji, por exemplo) pela fontconfig do sistema.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_ENVIRONMENT=Production
# O banco SQLite fica no volume do Railway montado em /data; sem volume, ele some a cada deploy.
ENV ConnectionStrings__Db="Data Source=/data/ordens.db"
# O Railway informa a porta em PORT.
CMD ["sh", "-c", "mkdir -p /data && ASPNETCORE_HTTP_PORTS=${PORT:-8080} exec dotnet OrdemServico.Api.dll"]
