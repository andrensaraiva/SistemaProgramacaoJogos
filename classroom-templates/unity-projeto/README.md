# Template Unity - GitHub Classroom

Template base para trabalhos Unity avaliados por testes do Unity Test Runner.

## Estrutura esperada

```text
Assets/
  Scripts/
  Tests/
ProjectSettings/
Packages/
```

## Como usar

1. Crie um projeto Unity LTS vazio.
2. Copie os scripts e testes deste template para o projeto.
3. Publique como template repository no GitHub.
4. Use no GitHub Classroom.
5. Configure o secret `UNITY_LICENSE` se usar GameCI em repositórios privados.

O workflow em `.github/workflows/unity-tests.yml` usa GameCI para rodar testes
EditMode e PlayMode.

