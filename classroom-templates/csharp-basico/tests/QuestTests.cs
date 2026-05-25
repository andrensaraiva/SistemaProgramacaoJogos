using CodeQuest.Classroom;
using Xunit;

namespace CodeQuest.Classroom.Tests;

public class QuestTests
{
    [Theory]
    [InlineData(3, 5, 8)]
    [InlineData(-2, 2, 0)]
    [InlineData(10, 20, 30)]
    public void Somar_DeveRetornarSoma(int a, int b, int expected)
    {
        Assert.Equal(expected, Quest.Somar(a, b));
    }
}
