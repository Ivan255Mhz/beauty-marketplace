FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files first — cached until dependencies change
COPY BeautyMarketplace.sln .
COPY BeautyMarketplace.Core/BeautyMarketplace.Core.csproj                         BeautyMarketplace.Core/
COPY BeautyMarketplace.Infrastructure/BeautyMarketplace.Infrastructure.csproj     BeautyMarketplace.Infrastructure/
COPY BeautyMarketplace.API/BeautyMarketplace.API.csproj                           BeautyMarketplace.API/

RUN dotnet restore

# Copy source and publish
COPY . .
RUN dotnet publish BeautyMarketplace.API/BeautyMarketplace.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p wwwroot/uploads/avatars wwwroot/uploads/portfolio wwwroot/uploads/reviews
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "BeautyMarketplace.API.dll"]
