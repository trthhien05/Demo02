using System.Threading.Tasks;
using ConnectDB.Models;

namespace ConnectDB.Services;

public interface IAuthService
{
    Task<User> RegisterAsync(string username, string password, string fullName, UserRole role);
    Task<string?> LoginAsync(string username, string password);
}
