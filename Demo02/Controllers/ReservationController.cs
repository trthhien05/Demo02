using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;
using ConnectDB.Messaging;
using Microsoft.AspNetCore.SignalR;
using ConnectDB.Hubs;

namespace ConnectDB.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ReservationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IMessageQueue _messageQueue;
    private readonly IHubContext<NotificationHub> _hubContext;

    public ReservationController(AppDbContext context, IMessageQueue messageQueue, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _messageQueue = messageQueue;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetReservations()
    {
        var reservations = await _context.Reservations.Include(r => r.Customer).ToListAsync();
        return Ok(reservations);
    }

    [HttpPost]
    public async Task<IActionResult> BookTable(Reservation reservation)
    {
        // Kiểm tra logic tối thiểu: Phải đặt trước 30 phút
        if (reservation.ReservationTime < DateTime.UtcNow.AddMinutes(30))
        {
            return BadRequest("Phải đặt tối thiểu 30 phút trước giờ đến");
        }

        var customerExists = await _context.Customers.AnyAsync(c => c.Id == reservation.CustomerId);
        if (!customerExists)
        {
            return BadRequest("Khách hàng không tồn tại");
        }

        _context.Reservations.Add(reservation);
        await _context.SaveChangesAsync();

        // Gửi thông báo SignalR
        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Hệ thống", $"Đã có khách mới đặt bàn: {reservation.PaxCount} người vào {reservation.ReservationTime}.");

        return CreatedAtAction(nameof(GetReservations), new { id = reservation.Id }, reservation);
    }

    [HttpPost("{id}/check-in")]
    public async Task<IActionResult> CheckIn(int id)
    {
        var reservation = await _context.Reservations.Include(r => r.Customer).FirstOrDefaultAsync(r => r.Id == id);
        if (reservation == null) return NotFound("Không tìm thấy thông tin đặt bàn");

        if (reservation.Status != ReservationStatus.Pending && reservation.Status != ReservationStatus.Confirmed)
        {
            return BadRequest("Đặt bàn này không ở trạng thái có thể Check-in");
        }

        // 1. Cập nhật trạng thái Seated
        reservation.Status = ReservationStatus.Seated;

        // 2. Cập nhật LastVisit của khách
        if (reservation.Customer != null)
        {
            reservation.Customer.LastVisit = DateTime.UtcNow;
            _context.Customers.Update(reservation.Customer);

            // 3. Gửi lời chào vào Queue
            await _messageQueue.PutMessageAsync(new CampaignMessage
            {
                CustomerPhone = reservation.Customer.PhoneNumber,
                DefaultContent = $"Chào mừng quý khách {reservation.Customer.FullName} đã đến nhà hàng! Chúc quý khách ngon miệng."
            });

            // 4. Gửi thông báo SignalR cho Dashboard
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Hệ thống", $"Khách hàng {reservation.Customer.FullName} vừa Check-in tại quầy.");
        }

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Check-in thành công!", Reservation = reservation });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] ReservationStatus newStatus)
    {
        var reservation = await _context.Reservations.FindAsync(id);
        if (reservation == null) return NotFound("Không tìm thấy thông tin đặt bàn");

        reservation.Status = newStatus;
        await _context.SaveChangesAsync();

        return Ok(reservation);
    }
}
