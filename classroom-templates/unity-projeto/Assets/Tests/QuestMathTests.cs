using NUnit.Framework;

public class QuestMathTests
{
    [Test]
    public void CalculateDamage_UsesMinimumZero()
    {
        Assert.AreEqual(7, QuestMath.CalculateDamage(10, 3));
        Assert.AreEqual(0, QuestMath.CalculateDamage(3, 10));
    }
}

