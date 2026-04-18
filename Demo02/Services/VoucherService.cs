using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ConnectDB.Data;
using ConnectDB.Models;
using ConnectDB.Messaging;
using Microsoft.EntityFrameworkCore;

namespace ConnectDB.Services;

public class VoucherService : IVoucherService
{
    private readonly AppDbContext _context;
    private readonly IMessageQueue _messageQueue;

    public VoucherService(AppDbContext context, IMessageQueue messageQueue)
    {
        _context = context;
        _messageQueue = messageQueue;
    }

    public async Task<Voucher> GenerateVoucherAsync(int customerId, string description, DiscountType type, decimal value, int expiryDays)
    {
        var customer = await _context.Customers.FindAsync(customerId);
        if (customer == null) throw new Exception("Customer not found.");

        // Sinh mã ngẫu nhiên: WELCOME_ABC123
        var randomCode = Guid.NewGuid().ToString().Substring(0, 6).ToUpper();
        var prefix = type == DiscountType.Percentage ? "PCT" : "FIX";
        var finalCode = $"{prefix}_{randomCode}";

        var voucher = new Voucher
        {
            CustomerId = customerId,
            Code = finalCode,
            Description = description,
            DiscountType = type,
            Value = value,
            ExpiryDate = DateTime.UtcNow.AddDays(expiryDays),
            IsUsed = false
        };

        _context.Vouchers.Add(voucher);
        await _context.SaveChangesAsync();

        // Gửi qua hàng đợi Marketing
        var discountText = type == DiscountType.Percentage ? $"{value}%" : $"{value:N0} VNĐ";
        await _messageQueue.PutMessageAsync(new CampaignMessage
        {
            CustomerPhone = customer.PhoneNumber,
            DefaultContent = $"Chúc mừng! Bạn nhận được Voucher '{finalCode}' giảm {discountText}. HSD: {voucher.ExpiryDate:dd/MM/yyyy}. {description}"
        });

        return voucher;
    }

    public async Task<Voucher?> RedeemVoucherAsync(string code)
    {
        var voucher = await _context.Vouchers
            .FirstOrDefaultAsync(v => v.Code == code && !v.IsUsed && v.ExpiryDate > DateTime.UtcNow);

        if (voucher == null) return null;

        voucher.IsUsed = true;
        _context.Vouchers.Update(voucher);
        await _context.SaveChangesAsync();

        return voucher;
    }

    public async Task<List<Voucher>> GetCustomerVouchersAsync(string phoneNumber)
    {
        return await _context.Vouchers
            .Include(v => v.Customer)
            .Where(v => v.Customer != null && v.Customer.PhoneNumber == phoneNumber && !v.IsUsed && v.ExpiryDate > DateTime.UtcNow)
            .ToListAsync();
    }

    public async Task<List<Voucher>> GetAllVouchersAsync()
    {
        return await _context.Vouchers
            .Include(v => v.Customer)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();
    }

    public async Task<int> GenerateBulkItemsAsync(string description, DiscountType type, decimal value, int expiryDays, CustomerTier? targetTier)
    {
        var query = _context.Customers.AsQueryable();
        if (targetTier.HasValue)
        {
            query = query.Where(c => c.Tier == targetTier.Value);
        }

        var customers = await query.ToListAsync();
        foreach (var customer in customers)
        {
            await GenerateVoucherAsync(customer.Id, description, type, value, expiryDays);
        }

        return customers.Count;
    }
}

