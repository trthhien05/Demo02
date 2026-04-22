using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.AspNetCore.Authorization;
using ConnectDB.Messaging;
using Microsoft.AspNetCore.SignalR;
using ConnectDB.Hubs;
using ConnectDB.Models.Common;

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
    public async Task<IActionResult> GetReservations([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] ReservationStatus? status = null, [FromQuery] DateTime? date = null)
    {
        var query = _context.Reservations
            .AsNoTracking()
            .Include(r => r.Customer)
            .Include(r => r.DiningTable)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(r => r.Status == status.Value);
        }

        if (date.HasValue)
        {
            var d = DateTime.SpecifyKind(date.Value.Date, DateTimeKind.Utc);
            query = query.Where(r => r.ReservationTime >= d && r.ReservationTime < d.AddDays(1));
        }

        var totalCount = await query.CountAsync();
        var reservations = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        var result = new PagedResult<Reservation>(reservations, totalCount, page, pageSize);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> BookTable(Reservation reservation)
    {
        // 1. Chuẩn hóa ReservationTime sang UTC để tương thích PostgreSQL
        reservation.ReservationTime = DateTime.SpecifyKind(reservation.ReservationTime, DateTimeKind.Utc);

        // 2. Kiểm tra logic tối thiểu: Phải đặt trước 30 phút
        if (reservation.ReservationTime < DateTime.UtcNow.AddMinutes(30))
        {
            return BadRequest("Phải đặt tối thiểu 30 phút trước giờ đến");
        }

        // 3. Kiểm tra bàn tồn tại & sức chứa
        var table = await _context.DiningTables.FindAsync(reservation.DiningTableId);
        if (table == null) return BadRequest("Bàn không tồn tại");
        
        if (table.Capacity < reservation.PaxCount)
        {
            return BadRequest($"Bàn số {table.TableNumber} chỉ có {table.Capacity} chỗ, không đủ cho nhóm {reservation.PaxCount} khách.");
        }

        // 4. Kiểm tra trùng lịch (Chặn 2 nhóm đặt cùng 1 bàn trong vòng 2 tiếng)
        var startRange = reservation.ReservationTime.AddHours(-2);
        var endRange = reservation.ReservationTime.AddHours(2);
        var isConflict = await _context.Reservations.AnyAsync(r => 
            r.DiningTableId == reservation.DiningTableId && 
            r.Status != ReservationStatus.Cancelled &&
            r.ReservationTime > startRange && 
            r.ReservationTime < endRange);
        
        if (isConflict)
        {
            return BadRequest("Bàn này đã có lịch đặt trong khoảng thời gian này (trước/sau 2 tiếng). Vui lòng chọn bàn hoặc khung giờ khác.");
        }

        var customerExists = await _context.Customers.AnyAsync(c => c.Id == reservation.CustomerId);
        if (!customerExists)
        {
            return BadRequest("Khách hàng không tồn tại");
        }

        _context.Reservations.Add(reservation);
        await _context.SaveChangesAsync();

        // Gửi thông báo SignalR
        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Hệ thống", $"Khách mới đặt bàn {table.TableNumber}: {reservation.PaxCount} khách lúc {reservation.ReservationTime:HH:mm}.");

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

        // Cập nhật trạng thái bàn vật lý sang Occupied
        var table = await _context.DiningTables.FindAsync(reservation.DiningTableId);
        if (table != null)
        {
            table.Status = TableStatus.Occupied;
        }

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
