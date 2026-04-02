using Microsoft.AspNetCore.Mvc;
using ConnectDB.Services;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Authorization;

namespace ConnectDB.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class LoyaltyController : ControllerBase
{
    private readonly ILoyaltyService _loyaltyService;

    public LoyaltyController(ILoyaltyService loyaltyService)
    {
        _loyaltyService = loyaltyService;
    }

    // POST: api/loyalty/add-points
    // Webhook từ POS hoặc ứng dụng đặt bàn sẽ gọi API này để cộng điểm
    [HttpPost("add-points")]
    public async Task<IActionResult> AddPoints([FromBody] AddPointsRequest request)
    {
        try
        {
            var pointsEarned = await _loyaltyService.AddPointsFromInvoiceAsync(
                request.CustomerPhone,
                request.InvoiceAmount,
                request.TransactionReference
            );

            return Ok(new { Message = "Points added successfully", PointsEarned = pointsEarned });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }
}

public class AddPointsRequest
{
    public string CustomerPhone { get; set; } = string.Empty;
    public decimal InvoiceAmount { get; set; }
    public string TransactionReference { get; set; } = string.Empty; // Mã hóa đơn / Receipt ID
}
