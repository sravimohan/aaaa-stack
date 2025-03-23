using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AAAA.Server.Controllers;

[ApiController]
[Route("[controller]")]
//[Authorize(Roles = "manager")]
[Authorize(Policy = "ManagerPolicy")]
public class WeatherForecastController : ControllerBase
{
    private static readonly string[] Summaries =
    [
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    ];

    private readonly ILogger<WeatherForecastController> _logger;

    public WeatherForecastController(ILogger<WeatherForecastController> logger)
    {
        _logger = logger;
    }

    [HttpGet(Name = "GetWeatherForecast")]
    // [RequiredScope("Forecast.Read")]
    public IEnumerable<WeatherForecast> Get()
    {
        var userClaims = User.Claims;
        foreach (var claim in userClaims)
        {
            _logger.LogInformation($"Claim Type: {claim.Type}, Claim Value: {claim.Value}");
        }

        return Enumerable.Range(1, 5).Select(index => new WeatherForecast
        {
            Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            TemperatureC = Random.Shared.Next(-20, 55),
            Summary = Summaries[Random.Shared.Next(Summaries.Length)]
        })
        .ToArray();
    }
}
