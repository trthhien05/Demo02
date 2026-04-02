using System;
using System.Linq;
using System.Threading.Tasks;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

using Microsoft.AspNetCore.SignalR;
using ConnectDB.Hubs;

namespace ConnectDB.Services;

public class LoyaltyService : ILoyaltyService
{
    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IVoucherService _voucherService;
    private readonly IHubContext<NotificationHub> _hubContext;
    private const int VND_PER_POINT = 10000;

    public LoyaltyService(AppDbContext context, IMemoryCache cache, IVoucherService voucherService, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _cache = cache;
        _voucherService = voucherService;
        _hubContext = hubContext;
    }

    public async Task<int> AddPointsFromInvoiceAsync(string customerPhone, decimal invoiceAmount, string transactionReference)
    {
        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.PhoneNumber == customerPhone);
        if (customer == null)
            throw new Exception("Customer not found.");

        int pointsEarned = (int)(invoiceAmount / VND_PER_POINT);
        if (pointsEarned <= 0) return 0;

        var transaction = new LoyaltyTransaction
        {
            CustomerId = customer.Id,
            TransactionReference = transactionReference,
            InvoiceAmount = invoiceAmount,
            PointsEarned = pointsEarned,
            Description = $"Earned {pointsEarned} points from invoice {transactionReference}"
        };

        _context.LoyaltyTransactions.Add(transaction);
        
        customer.Points += pointsEarned;
        _context.Customers.Update(customer);
        
        await _context.SaveChangesAsync();

        // Update Cache
        _cache.Set($"CustomerPoints_{customer.Id}", customer.Points, TimeSpan.FromHours(1));

        // Process Tier
        await ProcessTierUpgradeAsync(customer.Id);

        return pointsEarned;
    }

    public async Task ProcessTierUpgradeAsync(int customerId)
    {
        var customer = await _context.Customers.FindAsync(customerId);
        if (customer == null) return;

        var currentTier = customer.Tier;
        var newTier = currentTier;

        if (customer.Points >= 10000) newTier = CustomerTier.Diamond;
        else if (customer.Points >= 5000) newTier = CustomerTier.Gold;
        else if (customer.Points >= 1000) newTier = CustomerTier.Silver;
        else newTier = CustomerTier.Member;

        if (newTier > currentTier) // Chỉ tặng khi được LÊN hạng
        {
            customer.Tier = newTier;
            _context.Customers.Update(customer);
            await _context.SaveChangesAsync();

            // Tự động tặng voucher thăng hạng
            decimal discountValue = newTier == CustomerTier.Silver ? 10 : 20; // Silver 10%, others 20%
            await _voucherService.GenerateVoucherAsync(
                customer.Id, 
                $"Voucher chúc mừng thăng hạng {newTier}", 
                DiscountType.Percentage, 
                discountValue, 
                30);

            // Gửi thông báo SignalR cho Dashboard
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Hệ thống", $"Khách hàng {customer.FullName} vừa được thăng hạng lên {newTier}!");
        }
    }
}
