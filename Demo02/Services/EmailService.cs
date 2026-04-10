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
            await smtp.ConnectAsync(settings["SmtpServer"], int.Parse(settings["Port"]!), SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(settings["SenderEmail"], settings["AppPassword"]);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
            Console.WriteLine($"[EMAIL SERVICE] Email sent successfully to {toEmail}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EMAIL SERVICE ERROR] Failed to send email to {toEmail}: {ex.Message}");
            throw; // Re-throw to handle in AuthService
        }
    }
}
