using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using ConnectDB.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace ConnectDB.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class DisableGlobalAuditAttribute : Attribute { }

public class AuditFilter : IAsyncActionFilter
{
    private readonly IAuditService _auditService;

    public AuditFilter(IAuditService auditService)
    {
        _auditService = auditService;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // 1. Check if auditing is disabled for this action or controller
        var endpoint = context.HttpContext.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<DisableGlobalAuditAttribute>() != null)
        {
            await next();
            return;
        }

        // 2. Perform the action
        var resultContext = await next();

        // 3. Post-execution auditing (only for mutations or if successful)
        var method = context.HttpContext.Request.Method;
        if (method == "GET" || resultContext.Exception != null || context.HttpContext.Response.StatusCode >= 400)
        {
            return;
        }

        // 4. Extract User Info
        var userIdStr = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out var userId)) return;

        // 5. Build Log Info
        var actionName = context.ActionDescriptor.DisplayName ?? "Unknown Action";
        var module = context.RouteData.Values["controller"]?.ToString() ?? "Unknown Module";
        var ipAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString();

        // Simple description based on method
        string description = method switch
        {
            "POST" => $"Thành công: Thêm mới dữ liệu qua {actionName}",
            "PUT" => $"Thành công: Cập nhật dữ liệu qua {actionName}",
            "PATCH" => $"Thành công: Chỉnh sửa dữ liệu qua {actionName}",
            "DELETE" => $"Thành công: Xóa dữ liệu qua {actionName}",
            _ => $"Thực hiện thao tác {method} trên {module}"
        };

        // If it's a POST/PUT, we might want to log some summary of the body if desired
        // But for now, keeping it simple to avoid massive logs.

        await _auditService.LogAsync(userId, method, module, description, ipAddress);
    }
}
