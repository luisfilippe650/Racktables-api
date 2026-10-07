# Códigos HTTP e solução de problemas

| Código | Significado | Uso |
|---|---|---|
| `200` | OK | Consulta, atualização, montagem, desmontagem ou movimentação concluída |
| `201` | Created | Recurso criado |
| `204` | No Content | Exclusão ou alteração de vínculo concluída, sem corpo |
| `400` | Bad Request | Corpo, parâmetros, query ou atributos inválidos |
| `401` | Unauthorized | Credenciais incorretas ou token ausente, inválido ou expirado |
| `404` | Not Found | Recurso ou rota inexistente |
| `409` | Conflict | Conflito de nome, ocupação ou dependências do recurso |
| `413` | Payload Too Large | Corpo excede o limite do servidor |
| `415` | Unsupported Media Type | Tipo de conteúdo não suportado |
| `500` | Internal Server Error | Erro interno ou falha de operação no banco |

Os erros tratados pela aplicação normalmente incluem `code`, `message` e, quando disponíveis, `details`. Algumas validações nos controllers retornam `message` e `errors`.

## Problemas comuns

- **A API não inicia:** confira `DATABASE_URL` e `JWT_SECRET` no `.env`.
- **Erro 401:** faça login novamente e envie `Authorization: Bearer SEU_TOKEN`.
- **Erro de conexão com o banco:** confira endereço, porta e credenciais; dentro de Docker, `127.0.0.1` aponta para o próprio container.
- **Erro 409 ao montar:** consulte a ocupação do rack e verifique as unidades disponíveis.
