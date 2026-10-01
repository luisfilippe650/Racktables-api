# Como racks são armazenados no RackTables

Este texto descreve o schema Prisma deste projeto e o contrato atual do módulo de racks.

## Object é a tabela central

Localizações, fileiras, racks e equipamentos são registros de `Object`. O campo `objtype_id` diferencia os tipos: localização = 1562, fileira = 1561 e rack = 1560. Os IDs são compartilhados: um rack e um servidor não têm sequências independentes.

`Object` armazena os campos comuns: nome, etiqueta, patrimônio (`asset_no`), indicação de problemas e comentário. `asset_no` é único entre todos os objetos; pode ser `NULL` quando não informado. O nome não possui uma constraint de unicidade: o módulo impede nomes repetidos entre racks dentro de transações serializáveis.

## A hierarquia fica em EntityLink

Não existe coluna `row_id` na tabela `Object`. O relacionamento é representado por quatro campos em `EntityLink`:

| parent_entity_type | parent_entity_id | child_entity_type | child_entity_id |
| ------------------ | ---------------- | ----------------- | --------------- |
| location           | 1                | row               | 7               |
| row                | 7                | rack              | 42              |
| rack               | 42               | object            | 88              |

Nesse exemplo, a localização 1 contém a fileira 7, que contém o rack 42. O equipamento 88 está vinculado ao rack sem indicar uma posição em U, como pode acontecer com um equipamento zero-U. Equipamentos que ocupam unidades são representados em `RackSpace`.

Os tipos de entidade também são chamados de realms. `rack` e `object` podem referenciar o mesmo registro de `Object` em operações diferentes. Por isso a exclusão trata os dois realms.

`EntityLink` não tem FK para `Object`. A aplicação precisa validar a existência e o tipo dos pais/filhos e remover vínculos quando exclui uma entidade. A constraint única evita repetir o mesmo vínculo, mas não impede ligar um rack a duas fileiras diferentes.

## Altura e ordenação ficam em AttributeValue

Esse é um modelo de atributos flexíveis: em vez de adicionar uma coluna em `Object` para cada característica, o banco guarda valores em outra tabela.

| object_id | object_tid | attr_id | uint_value |
| --------- | ---------- | ------- | ---------- |
| 42        | 1560       | 27      | 42         |
| 42        | 1560       | 29      | 1          |

O atributo 27 representa a altura (42U nesse exemplo); o 29 representa a ordem do rack na fileira. `object_tid` repete o tipo do objeto para participar das FKs compostas. `Attribute` define o atributo, e `AttributeMap` define quais atributos são válidos para cada tipo de objeto.

A chave de `AttributeValue` é `(object_id, attr_id)`: cada objeto tem no máximo um valor por atributo. Na criação, o módulo grava a altura e calcula a próxima ordem na fileira.

## RackSpace representa regiões de cada unidade

Cada U tem três regiões: `front`, `interior` e `rear`. A chave composta `(rack_id, unit_no, atom)` impede dois registros para a mesma região da mesma unidade.

| rack_id | unit_no | atom     | state | object_id |
| ------- | ------- | -------- | ----- | --------- |
| 42      | 10      | front    | T     | 88        |
| 42      | 10      | interior | T     | 88        |
| 42      | 10      | rear     | T     | 88        |

Essas três linhas representam o mesmo equipamento na U10; não representam três unidades ocupadas. Por isso a ocupação usa conjuntos de números de unidade para remover duplicações.

O enum armazenado contém `A`, `U` e `T`. Posições livres são representadas pela ausência de registro; o RackTables constrói o estado livre `F` na leitura, antes de sobrepor os registros existentes. Referência: [implementação oficial de leitura do rack](https://github.com/RackTables/racktables/blob/master/wwwroot/inc/database.php#L746-L778).

O módulo devolve:

- `occupied_units`: unidades com algum `object_id` atribuído;
- `unavailable_units`: unidades com qualquer região registrada, incluindo bloqueios sem equipamento;
- `free_units`: unidades sem registro em nenhuma das três regiões.

Assim, `occupied_units` está contido em `unavailable_units`. Uma unidade bloqueada pode estar indisponível sem estar ocupada por equipamento. Essa regra de unidade livre é conservadora e serve para dispositivos que precisam da profundidade inteira; disponibilidade de uma região específica exige examinar `getSpaces()`.

Registros fora de `1..height` não entram no resumo de ocupação, mas continuam acessíveis na consulta de posições para diagnóstico.

## A view Rack é uma consulta, não o local de gravação

A view `Rack` combina `Object`, atributos, miniatura, fileira e localização para facilitar leituras. Ela não armazena outra cópia dos racks.

A definição atual usa um `INNER JOIN` com a fileira. Isso faz racks sem fileira desaparecerem da view. O repository lê as tabelas base para consultar detalhes e retorna `row_id`, `row_name`, `location_id` e `location_name` nulos quando os relacionamentos faltam. Não houve alteração na view ou no schema do banco.

## Escritas precisam de transações

Criar um rack envolve gravar `Object`, dois `AttributeValue`, `EntityLink` e `ObjectHistory`. A transação confirma todas essas gravações juntas; se alguma falhar, as gravações são revertidas.

Criação, alteração e exclusão usam isolamento `Serializable`. Conflitos de transação `P2034` são repetidos até três tentativas. Consultas com várias leituras usam `RepeatableRead` para obter um retrato consistente durante a transação.

A constraint única de `asset_no` continua protegendo contra concorrência. Tanto a consulta prévia quanto a violação de unicidade na criação são traduzidas para `asset_conflict`, que o service transforma em erro 409.

## Exclusão e histórico

O módulo impede excluir racks com entidades filhas nos realms `rack` ou `object`, posições atribuídas a objetos ou posições em estado `T`. Registros `A/U` sem objetos são removidos durante a exclusão.

`FileLink` e `EntityLink` não têm FK para `Object`; `TagStorage` também não tem FK para a entidade identificada por seu realm/id. O repository remove esses vínculos explicitamente nos realms apropriados. `RackSpace` tem FK para o rack sem cascade e exige remoção explícita. Outros dados, como `AttributeValue` e `RackThumbnail`, possuem cascade na FK de `Object`.

Criação e alteração registram uma cópia dos campos comuns em `ObjectHistory`, dentro da mesma transação. O service aceita um segundo argumento `actor` na criação e um terceiro na alteração, que deve vir do usuário autenticado; sem ele, `user_name` é `NULL`. Esse autor não faz parte do DTO enviado pelo cliente.

`ObjectHistory` possui FK com `onDelete: Cascade`. Portanto, a exclusão física do objeto também remove seu histórico neste schema. Auditoria permanente de exclusões exige outro armazenamento ou uma mudança deliberada nessa relação. O snapshot também não inclui atributos ou vínculos, pois esses campos não existem em `ObjectHistory`.

## Contrato e responsabilidades do módulo

- DTO: valida nomes, IDs, altura, patrimônio, parâmetros de posições e paginação; rejeita campos extras. Altura padrão: 42U; limite operacional: 1.000U, para limitar memória das respostas por unidade. Dados legados com altura ausente, inválida ou superior ao limite retornam `RACK_HEIGHT_INVALID` (409) na consulta de ocupação.
- Service: valida entradas antes da persistência, traduz resultados de domínio para erros da aplicação e calcula ocupação fora da transação.
- Repository: executa consultas e escritas, preserva atomicidade e devolve os dados necessários ao service.

`getAll()` e `getOccupancyAll()` retornam `{ items, total, page, per_page }`. Os padrões são página 1 e 50 racks; o limite é 100 racks por página. A listagem de ocupação usa quatro consultas para uma página não vazia: objetos, contagem total, alturas e posições. Uma página vazia usa somente objetos e contagem.

`getSpace()` no repository devolve um resultado discriminado: `rack_not_found` ou `found` com a posição (que pode ser nula). O service mantém o retorno público de posição ou `null` e lança 404 apenas quando o rack não existe.

Controller e router ainda são scaffolding da migração. O módulo não expõe endpoints HTTP até essas camadas serem implementadas e registradas no app. Layout enriquecido com objetos (`include_objects`) não faz parte deste contrato.

## Verificação local

```sh
node --import tsx --test --test-isolation=none tests/modules/racks/*.test.ts
npm run typecheck
```

Os testes de repository usam clientes de persistência substitutos, sem gravação em banco real. Eles verificam tratamento de conflitos, limpeza dos realms, limites, paginação em lote e histórico; não comprovam comportamento real das constraints, rollback ou bloqueios de MariaDB.
