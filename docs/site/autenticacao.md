# Autenticação

**Português (Brasil)** | [English](en/authentication.md)

Configure `JWT_SECRET` no `.env` com um segredo aleatório de pelo menos 32 bytes.
Gere um valor com `openssl rand -hex 32`. A API recusa iniciar sem esse segredo.

Faça login usando as credenciais existentes do RackTables:

```bash
curl -X POST http://localhost:8000/v1/racktables/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin","password":"sua-senha"}'
```

A resposta contém `access_token`, `token_type`, `expires_in` (3600 segundos)
e `user` (ID e login). Senhas e hashes não são retornados.
O hash SHA-1 existente é verificado por compatibilidade com o RackTables;
esse fluxo não cria usuários nem altera senhas no banco.

Envie o token em todas as requisições de dados, inclusive nos exemplos acima:

```bash
curl http://localhost:8000/v1/racktables/auth/me \
  -H 'Authorization: Bearer SEU_TOKEN'
```

O login e `/v1/racktables/docs` (incluindo seus arquivos e especificações)
são públicos. Todas as rotas de dados exigem `Authorization: Bearer SEU_TOKEN`.
No Swagger, faça login em `/auth/login`, copie `access_token` e informe
o token no botão **Authorize** para testar as rotas protegidas.
Credenciais incorretas e tokens ausentes, inválidos ou expirados retornam `401`.
Todos os usuários autenticados acessam as rotas de dados; permissões do
RackCode não são avaliadas por esta API. Para encerrar a sessão, descarte o
token no cliente; ele continua válido até expirar.
