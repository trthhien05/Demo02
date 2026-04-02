namespace ConnectDB.Models;

public enum CustomerTier
{
    Member = 0,
    Silver = 1,
    Gold = 2,
    Diamond = 3
}

public enum ReservationStatus
{
    Pending = 0,
    Confirmed = 1,
    Seated = 2,
    Completed = 3,
    Cancelled = 4,
    NoShow = 5
}

public enum DiscountType
{
    Percentage = 0, // Giảm %
    FixedAmount = 1 // Giảm tiền mặt
}

public enum UserRole
{
    Admin = 0,
    Staff = 1,
    Cashier = 2,
    Kitchen = 3,
    Waiter = 4
}

public enum TableStatus
{
    Available = 0, // Bàn trống
    Reserved = 1,  // Đã đặt chỗ
    Occupied = 2,  // Đang có khách
    Cleaning = 3   // Đang dọn dẹp
}

public enum OrderStatus
{
    Pending = 0,   // Chờ xác nhận
    Preparing = 1, // Đang chế biến (Kitchen)
    Served = 2,    // Đã phục vụ (Đã mang ra bàn)
    Completed = 3, // Đã hoàn thành (Đã thanh toán)
    Cancelled = 4  // Đã hủy
}

public enum PaymentMethod
{
    Cash = 0,
    Card = 1,
    Transfer = 2,
    EWallet = 3
}

public enum InvoiceStatus
{
    Unpaid = 0,
    Paid = 1,
    Voided = 2
}


