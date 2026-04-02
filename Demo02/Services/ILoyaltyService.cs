using System.Threading.Tasks;

namespace ConnectDB.Services;

public interface ILoyaltyService
{
    Task<int> AddPointsFromInvoiceAsync(string customerPhone, decimal invoiceAmount, string transactionReference);
    Task ProcessTierUpgradeAsync(int customerId);
}
