using System.Security.Claims;
using BeautyMarketplace.Core.DTOs;
using BeautyMarketplace.Core.Entities;
using BeautyMarketplace.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeautyMarketplace.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly IServiceRepository _services;
    private readonly IMasterRepository _masters;

    public ServicesController(IServiceRepository services, IMasterRepository masters)
    {
        _services = services;
        _masters = masters;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/services/master/{masterId}
    [HttpGet("master/{masterId:guid}")]
    public async Task<ActionResult<List<ServiceDto>>> GetByMaster(Guid masterId)
    {
        var items = await _services.GetByMasterIdAsync(masterId);
        return Ok(items.Select(s => new ServiceDto(
            s.Id, s.MasterId, s.Name, s.Description, s.Price, s.DurationMinutes, s.Category)));
    }

    // POST /api/services
    [HttpPost]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<ServiceDto>> Create([FromBody] CreateServiceRequest req)
    {
        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null) return BadRequest(new { message = "Сначала создайте профиль мастера" });

        if (string.IsNullOrWhiteSpace(req.Name) || req.Price <= 0 || req.DurationMinutes <= 0)
            return BadRequest(new { message = "Заполните все обязательные поля" });

        var service = new Service
        {
            MasterId = master.Id,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            Price = req.Price,
            DurationMinutes = req.DurationMinutes,
            Category = req.Category
        };

        await _services.AddAsync(service);

        return Ok(new ServiceDto(
            service.Id, service.MasterId, service.Name,
            service.Description, service.Price, service.DurationMinutes, service.Category));
    }

    // PUT /api/services/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Master")]
    public async Task<ActionResult<ServiceDto>> Update(Guid id, [FromBody] UpdateServiceRequest req)
    {
        var service = await _services.GetByIdAsync(id);
        if (service == null) return NotFound();

        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null || service.MasterId != master.Id) return Forbid();

        if (string.IsNullOrWhiteSpace(req.Name) || req.Price <= 0 || req.DurationMinutes <= 0)
            return BadRequest(new { message = "Заполните все обязательные поля" });

        service.Name = req.Name.Trim();
        service.Description = req.Description?.Trim();
        service.Price = req.Price;
        service.DurationMinutes = req.DurationMinutes;
        service.Category = req.Category;

        await _services.UpdateAsync(service);

        return Ok(new ServiceDto(
            service.Id, service.MasterId, service.Name,
            service.Description, service.Price, service.DurationMinutes, service.Category));
    }

    // DELETE /api/services/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Master")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var service = await _services.GetByIdAsync(id);
        if (service == null) return NotFound();

        var master = await _masters.GetByUserIdAsync(CurrentUserId);
        if (master == null || service.MasterId != master.Id)
            return Forbid();

        await _services.DeleteAsync(service);
        return NoContent();
    }
}
