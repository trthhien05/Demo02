using System.Threading.Tasks;

namespace ConnectDB.Services;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string htmlMessage);
}
