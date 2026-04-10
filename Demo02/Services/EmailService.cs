using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using MimeKit.Text;
using System.Threading.Tasks;

namespace ConnectDB.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
    {
        var settings = _configuration.GetSection("EmailSettings");
        
        var email = new MimeMessage();
        email.From.Add(new MailboxAddress(settings["SenderName"], settings["SenderEmail"]));
        email.To.Add(MailboxAddress.Parse(toEmail));
        email.Subject = subject;
        email.Body = new TextPart(TextFormat.Html) { Text = htmlMessage };

        using var smtp = new SmtpClient();
        try
        {
            var server = settings["SmtpServer"];
            var port = int.Parse(settings["Port"]!);
            var rawUser = settings["SenderEmail"] ?? "MISSING";
            var rawPass = settings["AppPassword"] ?? "MISSING";
            
            // Masking for safety
            var maskedUser = rawUser.Length > 3 ? rawUser.Substring(0, 3) + "***" : rawUser;
            var passClean = rawPass.Replace(" ", "");
            var maskedPass = passClean.Length > 3 ? passClean.Substring(0, 3) + "***" : "TOO_SHORT";

            Console.WriteLine($"[EMAIL SERVICE] Attempting to connect to {server}:{port}...");
            Console.WriteLine($"[DEBUG HINT] Using account: {maskedUser} | Pass length: {passClean.Length} | Pass starts with: {maskedPass}");
            
            await smtp.ConnectAsync(server, port, SecureSocketOptions.StartTls);
            Console.WriteLine("[EMAIL SERVICE] Connected. Attempting to authenticate...");
            
            await smtp.AuthenticateAsync(rawUser, passClean);
            Console.WriteLine("[EMAIL SERVICE] Authenticated successfully. Sending email...");
            
            var response = await smtp.SendAsync(email);
            Console.WriteLine($"[EMAIL SERVICE] Email sent! Server response: {response}");
            
            await smtp.DisconnectAsync(true);
            Console.WriteLine($"[EMAIL SERVICE] Disconnected safely.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EMAIL SERVICE ERROR] Failed at some step: {ex.Message}");
            if (ex.InnerException != null) 
                Console.WriteLine($"[INNER ERROR] {ex.InnerException.Message}");
            throw; 
        }
    }
}
