using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using MimeKit.Text;
using System.Threading.Tasks;
using Serilog;

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
            var user = settings["SenderEmail"];
            var pass = Environment.GetEnvironmentVariable("EMAIL_APP_PASSWORD") 
                       ?? settings["AppPassword"]?.Replace(" ", "");

            await smtp.ConnectAsync(server, port, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(user, pass);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
            
            Log.Information("[EMAIL SERVICE] Email sent successfully to {toEmail}", toEmail);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "[EMAIL SERVICE ERROR] Failed to send email to {toEmail}", toEmail);
            throw; 
        }
    }
}
