# RackTables REST API

Camada de integração desenvolvida no INPE para consultar e modificar o inventário do RackTables por HTTP. A API usa TypeScript, Fastify e Prisma, com um banco MySQL/MariaDB existente.

## Comece aqui

1. [Instale e execute a API](instalacao.md).
2. [Faça login e obtenha um token](autenticacao.md).
3. [Consulte os endpoints](endpoints.md) e os [exemplos de uso](exemplos.md).

## Recursos disponíveis

Locais físicos, filas, racks, equipamentos, atributos dinâmicos, montagem, desmontagem e movimentação entre racks.

## Documentação interativa

Com a API em execução na configuração padrão:

- [Swagger UI](http://localhost:8000/v1/racktables/docs): consulta e teste das rotas.
- [Especificação OpenAPI](http://localhost:8000/v1/racktables/docs/json): contrato dos endpoints em JSON.

Esses endereços apontam para a API no seu computador. Ajuste o host e a porta para a sua instalação. No Swagger, obtenha o token em `/auth/login` e informe-o no botão **Authorize**.

## Para desenvolvedores

- [Arquitetura de armazenamento dos racks](architecture/racktables-racks.md).
- [Como editar e gerar esta documentação](documentacao.md).
- [Códigos HTTP e solução de problemas](erros.md).
