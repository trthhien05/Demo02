using System.Collections.Generic;
using System.Threading.Tasks;
using ConnectDB.Models;

namespace ConnectDB.Services;

public interface IVoucherService
{
    Task<Voucher> GenerateVoucherAsync(int customerId, string description, DiscountType type, decimal value, int expiryDays);
    Task<Voucher?> RedeemVoucherAsync(string code);
    Task<List<Voucher>> GetCustomerVouchersAsync(string phoneNumber);
    Task<List<Voucher>> GetAllVouchersAsync();
    Task<int> GenerateBulkItemsAsync(string description, DiscountType type, decimal value, int expiryDays, CustomerTier? targetTier);
    Task<bool> RevokeVoucherAsync(int id);
}

