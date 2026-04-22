using System.Threading.Tasks;

namespace ConnectDB.Services;

public interface IPdfService
{
    Task<byte[]> GenerateInvoicePdfAsync(int invoiceId);
}
