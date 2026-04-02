using Microsoft.AspNetCore.Mvc;
using ConnectDB.Services;
using System.Threading.Tasks;
using System;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;

namespace ConnectDB.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class VoucherController : ControllerBase
{
    private readonly IVoucherService _voucherService;

    public VoucherController(IVoucherService voucherService)
    {
        _voucherService = voucherService;
    }

    // GET: api/voucher/customer/{phone}
    [HttpGet("customer/{phone}")]
    public async Task<IActionResult> GetMyVouchers(string phone)
    {
        var vouchers = await _voucherService.GetCustomerVouchersAsync(phone);
        return Ok(vouchers);
    }

    // POST: api/voucher/redeem
    [HttpPost("redeem")]
    public async Task<IActionResult> Redeem([FromBody] RedeemRequest request)
    {
        var voucher = await _voucherService.RedeemVoucherAsync(request.Code);
        if (voucher == null)
            return BadRequest("Mã Voucher không hợp lệ, đã hết hạn hoặc đã được sử dụng.");

        return Ok(new { Message = "Sử dụng Voucher thành công!", DiscountValue = voucher.Value, Type = voucher.DiscountType.ToString() });
    }

    // POST: api/voucher/manual-give
    // API dành cho Admin để tặng voucher tay
    [HttpPost("manual-give")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ManualGive([FromBody] ManualGiveRequest request)
    {
        try
        {
            var voucher = await _voucherService.GenerateVoucherAsync(
                request.CustomerId, 
                request.Description, 
                request.Type, 
                request.Value, 
                request.ExpiryDays);

            return Ok(new { Message = "Tặng Voucher thành công!", VoucherCode = voucher.Code });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}

public class RedeemRequest
{
    public string Code { get; set; } = string.Empty;
}

public class ManualGiveRequest
{
    public int CustomerId { get; set; }
    public string Description { get; set; } = "Voucher tặng riêng";
    public DiscountType Type { get; set; }
    public decimal Value { get; set; }
    public int ExpiryDays { get; set; } = 30;
}
