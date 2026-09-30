import type { ObjectEntity } from "../../../shared/entity/object.entity.js";

export type LocationInput = {
  name: string;
};

export type LocationUpdateInput = LocationInput & {
  id: number;
};

export type LocationOutput = ObjectEntity ;


/*
Quando a API cria uma row, ela executa:

  INSERT INTO Object
  (name, label, objtype_id, asset_no)
  VALUES ('Fileira 01', NULL, 1561, NULL);



*/

/*
Lista as rows.

  Exemplo:

  GET /v1/racktables/rows/?page=1&per_page=50

  Consulta:

  SELECT id, name, label
  FROM Object
  WHERE objtype_id = 1561
  ORDER BY name
  LIMIT 50 OFFSET 0;


   ## GET /v1/racktables/rows/by-name?name=Fileira%2001

  Procura uma row pelo nome exato.

  A consulta filtra:

  WHERE name = ?
    AND objtype_id = 1561




    *************

      Uma row seria conceitualmente:

  type Row = RackTablesObject & {
    objtypeId: 1561;
  };

  Mas fisicamente ela continua sendo um registro de Object.

  Quando a API cria uma row, ela executa:

  INSERT INTO Object
  (name, label, objtype_id, asset_no)
  VALUES ('Fileira 01', NULL, 1561, NULL);

  Isso está em app/repository/rackspace/rows_repository.py:18.

  Ou seja, não existe:

  INSERT INTO Row ...

  Existe:

  INSERT INTO Object ... objtype_id = 1561

  Outro detalhe que pode confundir: em alguns loops Python, a variável também se chama row:

  for row in cursor.fetchall():

  Nesse contexto, row significa “linha retornada pelo SQL”, não necessariamente uma entidade Row do RackTables.

  ———

  ## 3. Arquitetura atual da rota

  O fluxo é:

  HTTP request
      ↓
  rows_router.py
      ↓
  rows_service.py
      ↓
  rows_repository.py
      ↓
  MySQL: Object / EntityLink

  ### Router

  Define URL, método HTTP, parâmetros e validação básica:

  app/routers/rackspace/rows_router.py:14

  ### Service

  Contém regras de negócio, transações, locks, commits, rollbacks e respostas:

  app/service/rackspace/rows_service.py:39

  ### Repository

  Executa diretamente o SQL:

  app/repository/rackspace/rows_repository.py:18

  O prefixo completo é:

  /v1/racktables/rows

  Definido em app/main.py:41.

  ———

  # 4. Todas as rotas de Rows

  ## POST /v1/racktables/rows/

  Cria uma row.

  Body:

  {
    "name": "Fileira 01"
  }

  Fluxo:

  1. Pydantic remove espaços do começo e final.
  2. Rejeita nome vazio ou maior que 255 caracteres.
  3. Obtém um lock pelo nome.
  4. Abre transação.
  5. Verifica se já existe uma row com esse nome.
  6. Insere na tabela Object com objtype_id = 1561.
  7. Registra em ObjectHistory.
  8. Faz commit.

  Resposta aproximada:

  {
    "status": "success",
    "message": "Row created successfully",
    "data": {
      "row_id": 20,
      "name": "Fileira 01"
    }
  }

  Importante: criar a row não vincula automaticamente uma location. A criação e a associação são duas operações separadas.

  ———

  ## GET /v1/racktables/rows/

  Lista as rows.

  Exemplo:

  GET /v1/racktables/rows/?page=1&per_page=50

  Consulta:

  SELECT id, name, label
  FROM Object
  WHERE objtype_id = 1561
  ORDER BY name
  LIMIT 50 OFFSET 0;

  Resposta:

  {
    "status": "success",
    "message": "Operation successful",
    "data": {
      "items": [
        {
          "id": 20,
          "name": "Fileira 01",
          "label": null
        }
      ],
      "pagination": {
        "page": 1,
        "per_page": 50,
        "page_count": 1,
        "total": 1
      }
    }
  }

  Essa rota retorna somente os dados básicos. Não retorna location nem racks.

  ———

  ## GET /v1/racktables/rows/by-name?name=Fileira%2001

  Procura uma row pelo nome exato.

  A consulta filtra:

  WHERE name = ?
    AND objtype_id = 1561

  Possíveis resultados:

  - Nenhuma row: 404.
  - Uma row: 200.
  - Mais de uma com o mesmo nome: 409.

  O código usa LIMIT 2 porque só precisa descobrir se existe duplicidade.

  ———

  ## PATCH /v1/racktables/rows/{row_id}

  Renomeia a row.

  Exemplo:

  PATCH /v1/racktables/rows/20

  {
    "name": "Fileira Principal"
  }

  Fluxo:

  1. Valida o novo nome.
  2. Obtém locks para o ID e para o novo nome.
  3. Confirma que o ID existe e pertence a uma row.
  4. Confirma que outra row não usa o mesmo nome.
  5. Atualiza Object.name.
  6. Registra o histórico.
  7. Faz commit.

  Embora o SQL comum apenas faça:

  UPDATE Object SET name = ? WHERE id = ?;

  o service já verificou antes que o ID pertence a uma row.

  ———

  ## DELETE /v1/racktables/rows/{row_id}

  Exclui uma row.

  Antes de excluir, o service verifica:

  O objeto existe?
      ↓
  O objtype_id é 1561?
      ↓
  A row possui racks vinculados?

  Se houver racks vinculados:

  {
    "status": "error",
    "message": "Row cannot be deleted because it has linked racks",
    "detail": {
      "reason": "row_has_linked_racks",
      "action": "Move or delete all racks linked to this row before deleting it."
    }
  }

  Se não houver racks:

  1. Remove vínculos de arquivos e tags.
  2. Remove registros de EntityLink.
  3. Registra o histórico.
  4. Anonimiza temporariamente nome e label.
  5. Exclui a row da tabela Object.
  6. Faz commit.

  Se ela ainda estiver vinculada a uma location, esse vínculo é removido durante a limpeza de EntityLink.

  ———

  ## GET /v1/racktables/rows/racks

  Retorna cada row junto com seus racks.

  Resultado conceitual:

  {
    "row_id": 20,
    "row_name": "Fileira 01",
    "label": null,
    "racks": [
      {
        "id": 30,
        "name": "Rack 01"
      },
      {
        "id": 31,
        "name": "Rack 02"
      }
    ]
  }

  A consulta:

  1. Busca os objetos de tipo Row.
  2. Faz LEFT JOIN com EntityLink.
  3. Procura vínculos row → rack.
  4. Faz outro join com Object para obter nome e ID do rack.
  5. Agrupa os resultados em Python.

  O LEFT JOIN é importante porque inclui rows que ainda não possuem racks:

  {
    "row_id": 21,
    "row_name": "Fileira vazia",
    "racks": []
  }

  Essa implementação está em app/repository/rackspace/rows_repository.py:171.

  ———

  # 5. Como Location é vinculada com Row

  ## PUT /v1/racktables/rows/{row_id}/{location_id}

  Exemplo:

  PUT /v1/racktables/rows/20/10

  Significa:

  Vincular Row 20 à Location 10

  Não significa o contrário, mesmo que na URL o row_id venha primeiro. No banco, a location é o pai e a row é o filho:

  INSERT INTO EntityLink (
      parent_entity_type,
      parent_entity_id,
      child_entity_type,
      child_entity_id
  )
  VALUES (
      'location',
      10,
      'row',
      20
  );

  O fluxo completo é:

  1. Obtém lock da row e da location.
  2. Abre transação.
  3. Verifica se o row_id existe com objtype_id = 1561.
  4. Verifica se o location_id existe com objtype_id = 1562.
  5. Procura se a row já está ligada a alguma location.
  6. Se estiver ligada a outra location, retorna 409.
  7. Se já estiver ligada à mesma location, não insere novamente.
  8. Caso contrário, cria o registro em EntityLink.
  9. Faz commit.

  Portanto, pela regra do service:

  Uma Location pode ter várias Rows.
  Uma Row pode pertencer a apenas uma Location.

  Em cardinalidade:

  Location 1 ─────────── 0..N Row
  Row      0..1 ──────── 1 Location

  Digo “pela regra do service” porque o código não demonstra uma constraint de unicidade no banco garantindo isso. Ele consulta primeiro e depois insere. Os locks
  reduzem corrida dentro desta API, mas outro sistema escrevendo diretamente no banco ainda poderia criar dois vínculos.

  Também existe um comportamento idempotente:

  - Vincular à mesma location novamente: retorna sucesso sem duplicar.
  - Vincular a outra location: retorna conflito 409.

  ———

  ## DELETE /v1/racktables/rows/{row_id}/{location_id}

  Remove o relacionamento, mas não exclui nenhuma das duas entidades.

  Exemplo:

  DELETE /v1/racktables/rows/20/10

  O SQL é:

  DELETE FROM EntityLink
  WHERE parent_entity_type = 'location'
    AND parent_entity_id = 10
    AND child_entity_type = 'row'
    AND child_entity_id = 20;

  Antes disso, o service verifica:

  1. Se a row existe.
  2. Se a location existe.
  3. Se esse vínculo realmente existe.
  4. Se a row possui racks.

  Se a row possuir racks, a remoção é bloqueada:

  Location
    └── Row
         └── Rack

  Isso evita produzir esta situação:

  Row sem Location
    └── Rack

  A regra atual exige primeiro mover ou excluir todos os racks daquela row.

  ———

  # 6. Como listar Location com suas Rows

  Existe ainda a rota inversa:

  GET /v1/racktables/locations/rows

  Ela retorna:

  {
    "location_id": 10,
    "location_name": "Sala A",
    "rows": [
      {
        "id": 20,
        "name": "Fileira 01"
      },
      {
        "id": 21,
        "name": "Fileira 02"
      }
    ]
  }

  A consulta parte de Object filtrando locations:

  WHERE objtype_id = 1562

  Depois faz:

  LEFT JOIN EntityLink
    ON parent_entity_type = 'location'
   AND child_entity_type = 'row'

  E finalmente busca os objetos Row com:

  o.objtype_id = 1561

  A consulta completa está em app/repository/rackspace/locations_repository.py:136.

  Assim, existem duas visões diferentes:

  GET /locations/rows
  Location → suas Rows

  GET /rows/racks
  Row → seus Racks

  Não existe atualmente uma rota de row que devolva diretamente sua location.

  ———

  # 7. Como eu modelaria isso no TypeScript

  Mesmo que o banco trate tudo como Object, seu domínio TypeScript não precisa tratar tudo como uma entidade genérica.

  Eu separaria assim:

  export interface Row {
    id: number;
    name: string;
    label: string | null;
  }

  export interface Location {
    id: number;
    name: string;
  }

  export interface RowWithRacks extends Row {
    racks: Rack[];
  }

  export interface LocationWithRows extends Location {
    rows: Row[];
  }

  O detalhe de objtype_id ficaria encapsulado no repository:

  export const ObjectType = {
    RACK: 1560,
    ROW: 1561,
    LOCATION: 1562,
  } as const;

  Repository:

  class MySqlRowRepository {
    async create(name: string): Promise<Row> {
      // INSERT INTO Object (..., objtype_id)
      // objtype_id = ObjectType.ROW
    }

    async findById(id: number): Promise<Row | null> {
      // SELECT ... FROM Object
      // WHERE id = ? AND objtype_id = ObjectType.ROW
    }

    async linkToLocation(rowId: number, locationId: number): Promise<void> {
      // INSERT INTO EntityLink
    }
  }

  Use cases:

  CreateRow
  ListRows
  FindRowByName
  RenameRow
  DeleteRow
  AssignRowToLocation
  RemoveRowFromLocation
  ListRowsWithRacks

  Nesse desenho:

  - Controller entende HTTP.
  - Use case/application service entende regra de negócio.
  - Repository entende que uma Row é armazenada em Object.
  - O restante da aplicação trabalha com Row, não com Object.
  - 1561, 1562 e SQL não vazam para controller ou domínio.

  A principal frase para guardar é:

  > Row é uma entidade do domínio, mas é persistida como um registro da tabela Object.

  Essa distinção resolve praticamente toda a confusão da implementação atual.

*/