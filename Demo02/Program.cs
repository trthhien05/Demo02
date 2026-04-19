using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Services;
using ConnectDB.BackgroundServices;
using ConnectDB.Messaging;
using ConnectDB.Hubs;
using System.Text;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")?.Trim();
    
    // Nếu là định dạng URI (postgres://), sử dụng phương pháp bóc tách chuỗi thủ công để tránh lỗi ký tự đặc biệt như '#'
    if (connectionString?.StartsWith("postgres://") == true)
    {
        try 
        {
            // 1. Loại bỏ tiền tố "postgres://"
            var rawContent = connectionString.Substring(11);
            
            // 2. Tìm vị trí dấu '@' cuối cùng (phân tách user:pass và host)
            var lastAtIndex = rawContent.LastIndexOf('@');
            if (lastAtIndex != -1)
            {
                var userPassPart = rawContent.Substring(0, lastAtIndex);
                var hostDbPart = rawContent.Substring(lastAtIndex + 1);
                
                // 3. Tách Username và Password
                var firstColonIndex = userPassPart.IndexOf(':');
                var username = Uri.UnescapeDataString(userPassPart.Substring(0, firstColonIndex));
                var password = Uri.UnescapeDataString(userPassPart.Substring(firstColonIndex + 1));
                
                // 4. Tách Host và Path/Query
                var firstSlashIndex = hostDbPart.IndexOf('/');
                var hostPortPart = firstSlashIndex != -1 ? hostDbPart.Substring(0, firstSlashIndex) : hostDbPart;
                var dbPath = firstSlashIndex != -1 ? hostDbPart.Substring(firstSlashIndex + 1) : "defaultdb";
                
                // Loại bỏ phần Query (?sslmode=...) nếu có trong dbPath
                if (dbPath.Contains('?')) dbPath = dbPath.Substring(0, dbPath.IndexOf('?'));

                // 5. Tách Host và Port
                var host = hostPortPart;
                var port = 5432; // Mặc định
                if (hostPortPart.Contains(':'))
                {
                    var hostPortArray = hostPortPart.Split(':');
                    host = hostPortArray[0];
                    port = int.Parse(hostPortArray[1]);
                }

                var npgsqlBuilder = new Npgsql.NpgsqlConnectionStringBuilder
                {
                    Host = host,
                    Port = port,
                    Database = dbPath,
                    Username = username,
                    Password = password,
                    SslMode = Npgsql.SslMode.Require,
                    TrustServerCertificate = true
                };
                
                connectionString = npgsqlBuilder.ToString();
                Console.WriteLine($"[DB CONFIG] Manual parsing successful. Host: {host}, DB: {dbPath}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB CONFIG] Error in manual parsing: {ex.Message}");
        }
    }

    options.UseNpgsql(connectionString);
});

// Add CORS & SignalR
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    var frontendUrls = builder.Configuration["FRONTEND_URLS"]?.Split(',') 
        ?? new[] { "http://localhost:5173", "http://localhost:3000" };

    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(frontendUrls)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Bắt buộc cho SignalR và HttpOnly Cookies
        });
});
//aaaa
// Configure Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("LoginLimiter", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100, // Tăng lên 100 cho phép thư thả testing
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Add services to the container.
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IVoucherService, VoucherService>();
builder.Services.AddScoped<ILoyaltyService, LoyaltyService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuditService, AuditService>();

// Messaging & Background Services
builder.Services.AddSingleton<IMessageQueue, InMemoryMessageQueue>();
builder.Services.AddHostedService<MarketingMessageWorker>();
builder.Services.AddHostedService<SegmentationBackgroundService>();

// JWT Authentication Configuration
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "CRM API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// Auto-migrate Database on Startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        if (context.Database.IsRelational())
        {
            context.Database.Migrate();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred while migrating the database: {ex.Message}");
    }
}

// Seed Initial Data (Users)
DataSeeder.SeedUsers(app.Services);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseRateLimiter(); // Add Rate Limiter middleware

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHub<NotificationHub>("/notificationHub");

app.Run();
