using UnityEngine;

public static class QuestMath
{
    public static int CalculateDamage(int attack, int defense)
    {
        return Mathf.Max(attack - defense, 0);
    }
}
