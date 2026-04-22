using ConnectDB.Data;
using ConnectDB.Models;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ConnectDB.Services;

public class PdfService : IPdfService
{
    private readonly AppDbContext _context;

    public PdfService(AppDbContext context)
    {
        _context = context;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<byte[]> GenerateInvoicePdfAsync(int invoiceId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Order)
                .ThenInclude(o => o.OrderItems)
                    .ThenInclude(oi => oi.MenuItem)
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null) throw new Exception("Không tìm thấy hóa đơn");

        var settings = await _context.RestaurantSettings.FirstOrDefaultAsync();
        var restaurantName = settings?.RestaurantName ?? "PROMAX RESTAURANT";
        var address = settings?.Address ?? "123 Street, City";
        var phoneNumber = settings?.PhoneNumber ?? "0123456789";

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A5);
                page.Margin(1, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Helvetica"));

                // Header
                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text(restaurantName).FontSize(18).Bold().FontColor(Colors.DeepPurple.Medium);
                        col.Item().Text(address).FontSize(9).FontColor(Colors.Grey.Medium);
                        col.Item().Text($"Hotline: {phoneNumber}").FontSize(9).FontColor(Colors.Grey.Medium);
                    });

                    row.RelativeItem().AlignRight().Column(col =>
                    {
                        col.Item().Text("HÓA ĐƠN").FontSize(20).Bold();
                        col.Item().Text($"Số: #{invoice.Id}").FontSize(10);
                        col.Item().Text($"Ngày: {invoice.IssuedAt.AddHours(7):dd/MM/yyyy HH:mm}").FontSize(10);
                    });
                });

                // Content
                page.Content().PaddingVertical(1, Unit.Centimetre).Column(col =>
                {
                    // Thông tin khách hàng
                    if (invoice.Customer != null)
                    {
                        col.Item().PaddingBottom(5).Text(x =>
                        {
                            x.Span("Khách hàng: ").Bold();
                            x.Span(invoice.Customer.FullName ?? "Khách lẻ");
                        });
                    }

                    // Bảng chi tiết món
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(20);
                            columns.RelativeColumn(3);
                            columns.ConstantColumn(40);
                            columns.RelativeColumn();
                            columns.RelativeColumn();
                        });

                        table.Header(header =>
                        {
                            header.Cell().Text("#");
                            header.Cell().Text("Món ăn");
                            header.Cell().AlignRight().Text("SL");
                            header.Cell().AlignRight().Text("Đơn giá");
                            header.Cell().AlignRight().Text("Thành tiền");
                        });

                        var items = invoice.Order?.OrderItems.ToList() ?? new();
                        for (int i = 0; i < items.Count; i++)
                        {
                            var item = items[i];
                            table.Cell().Text((i + 1).ToString());
                            table.Cell().Text(item.MenuItem?.Name ?? "N/A");
                            table.Cell().AlignRight().Text(item.Quantity.ToString());
                            table.Cell().AlignRight().Text(item.UnitPrice.ToString("N0"));
                            table.Cell().AlignRight().Text((item.UnitPrice * item.Quantity).ToString("N0"));
                        }
                    });

                    col.Item().PaddingTop(10).AlignRight().Column(innerCol =>
                    {
                        innerCol.Item().Text(x =>
                        {
                            x.Span("Tổng cộng: ").FontSize(10);
                            x.Span(invoice.Subtotal.ToString("N0")).FontSize(10);
                        });
                        innerCol.Item().Text(x =>
                        {
                            x.Span("VAT: ").FontSize(10);
                            x.Span(invoice.VatAmount.ToString("N0")).FontSize(10);
                        });
                        innerCol.Item().Text(x =>
                        {
                            x.Span("Phí dịch vụ: ").FontSize(10);
                            x.Span(invoice.ServiceChargeAmount.ToString("N0")).FontSize(10);
                        });
                        if (invoice.DiscountAmount > 0)
                        {
                            innerCol.Item().Text(x =>
                            {
                                x.Span("Giảm giá: ").FontSize(10).FontColor(Colors.Red.Medium);
                                x.Span($"-{invoice.DiscountAmount.ToString("N0")}").FontSize(10).FontColor(Colors.Red.Medium);
                            });
                        }
                        innerCol.Item().PaddingTop(5).Text(x =>
                        {
                            x.Span("THÀNH TIỀN: ").FontSize(14).Bold().FontColor(Colors.DeepPurple.Medium);
                            x.Span($"{invoice.FinalAmount.ToString("N0")} VNĐ").FontSize(14).Bold().FontColor(Colors.DeepPurple.Medium);
                        });
                    });
                });

                // Footer
                page.Footer().AlignCenter().Column(col =>
                {
                    col.Item().Text("Cảm ơn Quý khách! Hẹn gặp lại!").Italic();
                    col.Item().Text("Software powered by PROMAX RMS").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        });

        return document.GeneratePdf();
    }
}
