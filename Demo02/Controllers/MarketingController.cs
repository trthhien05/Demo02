using System.Threading.Tasks;
using ConnectDB.Data;
using ConnectDB.Messaging;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using ConnectDB.Models;

namespace ConnectDB.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class MarketingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IMessageQueue _messageQueue;

    public MarketingController(AppDbContext context, IMessageQueue messageQueue)
    {
        _context = context;
        _messageQueue = messageQueue;
    }

    // POST api/marketing/opt-out
    [HttpPost("opt-out")]
    public async Task<IActionResult> OptOutMarketing([FromBody] OptOutRequest request)
    {
        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.PhoneNumber == request.CustomerPhone);
        if (customer == null)
            return NotFound("Customer not found.");

        customer.IsOptOutMarketing = true;
        
        _context.Customers.Update(customer);
        await _context.SaveChangesAsync();

        return Ok($"Customer {customer.PhoneNumber} has opted out of marketing.");
    }

    // POST api/marketing/send-campaign
    [HttpPost("send-campaign")]
    public async Task<IActionResult> SendCampaign([FromBody] SendCampaignRequest request)
    {
        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.PhoneNumber == request.CustomerPhone);
        if (customer == null)
            return NotFound("Customer not found.");

        if (customer.IsOptOutMarketing)
            return BadRequest("Cannot send marketing message to opted-out customer.");

        var message = new CampaignMessage
        {
            CustomerPhone = request.CustomerPhone,
            DefaultContent = request.MessageContent
        };

        // Bỏ vào hàng đợi thay vì gọi hàm gửi rềnh rang ở đây
        await _messageQueue.PutMessageAsync(message);

        return Accepted(new { Message = "Campaign message queued successfully." });
    }

    // POST api/marketing/bulk-campaign
    [HttpPost("bulk-campaign")]
    public async Task<IActionResult> SendBulkCampaign([FromBody] BulkCampaignRequest request)
    {
        var query = _context.Customers.Where(c => !c.IsOptOutMarketing);

        if (request.TargetTier.HasValue)
        {
            query = query.Where(c => c.Tier == request.TargetTier.Value);
        }

        if (!string.IsNullOrEmpty(request.TargetSegment))
        {
            query = query.Where(c => c.Segment == request.TargetSegment);
        }

        var customers = await query.ToListAsync();
        
        foreach (var customer in customers)
        {
            var personalContent = request.MessageContent.Replace("{{name}}", customer.FullName ?? "Quý khách");
            
            await _messageQueue.PutMessageAsync(new CampaignMessage
            {
                CustomerPhone = customer.PhoneNumber,
                CustomerEmail = customer.Email,
                DefaultContent = personalContent
            });
        }

        return Accepted(new { Message = $"Bulk campaign queued for {customers.Count} customers." });
    }
}

public class OptOutRequest
{
    public string CustomerPhone { get; set; } = string.Empty;
}

public class SendCampaignRequest
{
    public string CustomerPhone { get; set; } = string.Empty;
    public string MessageContent { get; set; } = string.Empty;
}

public class BulkCampaignRequest
{
    public string MessageContent { get; set; } = string.Empty;
    public CustomerTier? TargetTier { get; set; }
    public string? TargetSegment { get; set; }
}

