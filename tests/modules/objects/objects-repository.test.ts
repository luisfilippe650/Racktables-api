import assert from "node:assert/strict";
import test from "node:test";
import * as implementation from "../../../src/modules/objects/repository/objects.prisma.js";
import type { Prisma } from "../../../src/database/prisma.js";
import { ApplicationError } from "../../../src/shared/errors/application.error.js";

const object = {
  id: 42,
  name: "server",
  label: null,
  asset_no: null,
  objtype_id: 4,
  has_problems: "no" as const,
  comment: "note",
};
const spaces = [
  { rack_id: 7, unit_no: 10, atom: "front", state: "T", object_id: 42 },
  { rack_id: 7, unit_no: 10, atom: "interior", state: "T", object_id: 42 },
  { rack_id: 7, unit_no: 10, atom: "rear", state: "T", object_id: 42 },
];

function repository(tx: Record<string, unknown>) {
  const prisma = {
    ...tx,
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
      operation(tx),
  };
  return new implementation.ObjectsPrismaRepository(
    prisma as unknown as typeof Prisma,
    async () => {},
  );
}

test("database errors integrate with the HTTP handler and hide database details", async () => {
  const cause = new Error("password=private");
  const repo = repository({
    object: {
      findFirst: async () => {
        throw cause;
      },
    },
  });
  await assert.rejects(
    () => repo.get(42),
    (error: unknown) => {
      assert.ok(error instanceof ApplicationError);
      assert.equal(error.code, "DATABASE_ERROR");
      assert.equal(error.statusCode, 500);
      assert.equal(error.cause, cause);
      assert.equal(error.message.includes("private"), false);
      return true;
    },
  );
});

test("create persists the final comment, server default ports and one history entry", async () => {
  const writes: Record<string, unknown> = {};
  const repo = repository({
    dictionary: { findFirst: async () => ({ dict_key: 4 }) },
    object: {
      findFirst: async () => null,
      create: async ({ data }: { data: object }) => {
        writes.object = data;
        return object;
      },
    },
    port: {
      createMany: async ({ data }: { data: object[] }) => {
        writes.ports = data;
        return { count: data.length };
      },
    },
    objectHistory: {
      create: async ({ data }: { data: object }) => {
        writes.history = data;
      },
    },
  });
  assert.deepEqual(
    await repo.create(
      { name: "server", objtype_id: 4, comment: "note" },
      "alice",
    ),
    {
      status: "created",
      object,
      ports_created: 3,
    },
  );
  assert.deepEqual(writes.object, {
    name: "server",
    objtype_id: 4,
    label: null,
    asset_no: null,
    has_problems: "no",
    comment: "note",
  });
  assert.deepEqual(writes.ports, [
    {
      object_id: 42,
      name: "kvm",
      iif_id: 1,
      type: 33,
      label: null,
      l2address: null,
    },
    {
      object_id: 42,
      name: "eth0",
      iif_id: 1,
      type: 24,
      label: null,
      l2address: null,
    },
    {
      object_id: 42,
      name: "eth1",
      iif_id: 1,
      type: 24,
      label: null,
      l2address: null,
    },
  ]);
  assert.deepEqual(writes.history, { ...object, user_name: "alice" });
});

test("create rejects unknown types and global name conflicts", async () => {
  assert.deepEqual(
    await repository({ dictionary: { findFirst: async () => null } }).create({
      name: "x",
      objtype_id: 4,
    }),
    { status: "invalid_type" },
  );
  const repo = repository({
    dictionary: { findFirst: async () => ({ dict_key: 4 }) },
    object: {
      findFirst: async ({ where }: { where: { name: string } }) => {
        assert.equal(where.name, "server");
        return object;
      },
    },
  });
  assert.deepEqual(await repo.create({ name: "server", objtype_id: 4 }), {
    status: "name_conflict",
  });
});

test("delete refuses mounted objects before touching dependencies", async () => {
  const repo = repository({
    object: {
      findUnique: async () => object,
      findMany: async () => [{ id: 7, name: "rack" }],
    },
    rackSpace: { findMany: async () => spaces },
  });
  assert.deepEqual(await repo.delete(42), {
    status: "currently_mounted",
    mounted_in: [
      {
        rack_id: 7,
        rack_name: "rack",
        start_unit: 10,
        end_unit: 10,
        height: 1,
      },
    ],
  });
});

test("delete reports the highest unit as start_unit for a mounted 2U object", async () => {
  const repo = repository({
    object: {
      findUnique: async () => object,
      findMany: async () => [{ id: 7, name: "rack" }],
    },
    rackSpace: {
      findMany: async () => [
        ...spaces,
        ...spaces.map((space) => ({ ...space, unit_no: 9 })),
      ],
    },
  });
  assert.deepEqual(await repo.delete(42), {
    status: "currently_mounted",
    mounted_in: [
      {
        rack_id: 7,
        rack_name: "rack",
        start_unit: 10,
        end_unit: 9,
        height: 2,
      },
    ],
  });
});

test("delete reports physical connections with remote endpoint details", async () => {
  const local = { id: 3, name: "eth0", object_id: 42, Object: object };
  const remote = {
    id: 4,
    name: "Gi1",
    object_id: 55,
    Object: { ...object, id: 55, name: "switch" },
  };
  const repo = repository({
    object: { findUnique: async () => object },
    rackSpace: { findMany: async () => [] },
    link: {
      findMany: async () => [
        {
          porta: 3,
          portb: 4,
          cable: "c1",
          Port_Link_portaToPort: local,
          Port_Link_portbToPort: remote,
        },
      ],
    },
  });
  assert.deepEqual(await repo.delete(42), {
    status: "physical_port_links",
    links: [
      {
        local_port_id: 3,
        local_port_name: "eth0",
        remote_port_id: 4,
        remote_port_name: "Gi1",
        remote_object_id: 55,
        remote_object_name: "switch",
        cable: "c1",
      },
    ],
  });
});

test("delete cleans restrictive NAT/VLAN dependencies and retains a detached snapshot", async () => {
  const remaining = new Set(["nat", "vlan", "ports"]);
  let snapshot: unknown;
  const repo = repository({
    object: {
      findUnique: async () => object,
      update: async () => object,
      delete: async () => {
        assert.deepEqual([...remaining], []);
        return object;
      },
    },
    rackSpace: { findMany: async () => [] },
    link: { findMany: async () => [] },
    entityLink: {
      findFirst: async () => null,
      deleteMany: async () => ({ count: 0 }),
    },
    mountOperation: {
      findMany: async () => [],
      deleteMany: async () => ({ count: 0 }),
    },
    fileLink: { deleteMany: async () => ({ count: 0 }) },
    tagStorage: { deleteMany: async () => ({ count: 0 }) },
    $executeRaw: async () => 0,
    iPv4NAT: {
      deleteMany: async () => {
        remaining.delete("nat");
        return { count: 1 };
      },
    },
    vLANSwitch: {
      deleteMany: async () => {
        remaining.delete("vlan");
        return { count: 1 };
      },
    },
    portVLANMode: {
      deleteMany: async () => {
        remaining.delete("ports");
        return { count: 1 };
      },
    },
    objectHistory: {
      create: async ({ data }: { data: unknown }) => {
        snapshot = data;
      },
    },
  });
  assert.deepEqual(await repo.delete(42, "alice"), {
    status: "deleted",
    object_id: 42,
    objtype_id: 4,
  });
  assert.deepEqual(snapshot, { ...object, id: null, user_name: "alice" });
});

test("lookup distinguishes duplicate names from a unique match", async () => {
  assert.deepEqual(
    await repository({
      object: { findMany: async () => [object, { ...object, id: 43 }] },
    }).getByName("server"),
    { status: "ambiguous" },
  );
  assert.deepEqual(
    await repository({
      object: { findMany: async () => [object] },
    }).getByServiceTag("tag"),
    { status: "found", object },
  );
});

test("list does not pick an arbitrary rack when an object spans two racks", async () => {
  const repo = repository({
    object: { findMany: async () => [object], count: async () => 1 },
    dictionary: {
      findMany: async () => [{ dict_key: 4, dict_value: "Server" }],
    },
    rackSpace: {
      findMany: async () => [...spaces, { ...spaces[0], rack_id: 8 }],
    },
  });
  const result = await repo.getAll({ page: 1, per_page: 50 });
  assert.equal(result.total, 1);
  assert.deepEqual(result.items[0], {
    object_id: 42,
    object_name: "server",
    object_label: null,
    asset_no: null,
    objtype_id: 4,
    object_type: "Server",
    rack_count: 2,
    rack_id: null,
    rack_name: null,
    allocation_status: "inconsistent_multiple_racks",
  });
});

test("summary preserves fixed fields for an object with no attribute maps", async () => {
  const repo = repository({
    object: { findUnique: async () => object },
    attributeMap: { findMany: async () => [] },
    attributeValue: { findMany: async () => [] },
    rackSpace: { findMany: async () => [] },
  });
  const result = await repo.getSummary(42);
  assert.equal(result?.common_name, "server");
  assert.equal(result?.comment, "note");
  assert.equal(result?.is_allocated, false);
  assert.deepEqual(result?.attributes, {});
});

test("dictionary pagination cleans GPASS labels and distinguishes an absent chapter", async () => {
  const repo = repository({
    dictionary: {
      count: async () => 1,
      findMany: async () => [{ dict_key: 9, dict_value: "Dell%GPASS%R750" }],
    },
  });
  assert.deepEqual(
    await repo.getDictionaryOptions(11, { page: 1, per_page: 50 }),
    { page: 1, per_page: 50, total: 1, items: [{ id: 9, name: "Dell R750" }] },
  );
  assert.equal(
    await repository({
      dictionary: { count: async () => 0 },
    }).getDictionaryOptions(999),
    null,
  );
});

test("invalid later attribute prevents all earlier fixed and dynamic writes", async () => {
  let writes = 0;
  const repo = repository({
    object: {
      findUnique: async () => object,
      update: async () => {
        writes++;
        return object;
      },
    },
    attributeMap: {
      findMany: async () => [
        {
          attr_id: 1,
          chapter_id: null,
          Attribute: { id: 1, name: "CPU", type: "uint" },
        },
      ],
    },
    attributeValue: {
      upsert: async () => {
        writes++;
      },
    },
  });
  const result = await repo.update({
    id: 42,
    updates: { CPU: 8, Unknown: "bad" },
  });
  assert.equal(result.status, "invalid_attribute");
  assert.equal(writes, 0);
});

test("attribute updates convert dates, dictionary labels and explicit clearing atomically", async () => {
  const saved: unknown[] = [];
  const removed: unknown[] = [];
  let histories = 0;
  const repo = repository({
    object: { findUnique: async () => object },
    attributeMap: {
      findMany: async () => [
        {
          attr_id: 1,
          chapter_id: null,
          Attribute: { id: 1, name: "Purchased", type: "date" },
        },
        {
          attr_id: 2,
          chapter_id: 11,
          Attribute: { id: 2, name: "Model", type: "dict" },
        },
        {
          attr_id: 3,
          chapter_id: null,
          Attribute: { id: 3, name: "CPU", type: "uint" },
        },
      ],
    },
    dictionary: {
      findMany: async () => [{ dict_key: 9, dict_value: "Dell%GPASS%R750" }],
    },
    attributeValue: {
      upsert: async ({ create }: { create: unknown }) => saved.push(create),
      deleteMany: async ({ where }: { where: unknown }) => removed.push(where),
    },
    objectHistory: {
      create: async () => {
        histories++;
      },
    },
  });
  const result = await repo.update({
    id: 42,
    updates: {
      Purchased: "2024-02-29",
      Model: "Dell R750",
      CPU: { clear: true },
    },
  });
  assert.equal(result.status, "updated");
  assert.deepEqual(saved, [
    {
      object_id: 42,
      object_tid: 4,
      attr_id: 1,
      string_value: null,
      uint_value: 1709164800,
      float_value: null,
    },
    {
      object_id: 42,
      object_tid: 4,
      attr_id: 2,
      string_value: null,
      uint_value: 9,
      float_value: null,
    },
  ]);
  assert.deepEqual(removed, [{ object_id: 42, attr_id: 3 }]);
  assert.equal(histories, 1);
});

test("mount blocks unusable rack positions without writing", async () => {
  const repo = repository({
    object: {
      findUnique: async ({ where }: { where: { id: number } }) =>
        where.id === 42 ? object : { ...object, id: 7, objtype_id: 1560 },
    },
    attributeValue: { findUnique: async () => ({ uint_value: 42 }) },
    rackSpace: {
      findMany: async ({ where }: { where: { object_id?: number } }) =>
        where.object_id ? [] : [{ ...spaces[0], state: "U", object_id: null }],
    },
  });
  assert.deepEqual(
    await repo.mount({ rack_id: 7, object_id: 42, start_unit: 10, height: 1 }),
    {
      status: "space_occupied",
      position: { rack_id: 7, unit_no: 10, atom: "front" },
      object_id: null,
    },
  );
});

test("mount and move reject invalid legacy rack heights without changing allocation", async () => {
  for (const rackHeight of [0, -1, 1.5, 1001, 1_000_000]) {
    let writes = 0;
    const repo = repository({
      object: {
        findUnique: async ({ where }: { where: { id: number } }) =>
          where.id === 42 ? object : { ...object, id: 7, objtype_id: 1560 },
      },
      attributeValue: { findUnique: async () => ({ uint_value: rackHeight }) },
      rackSpace: {
        findMany: async () => [],
        upsert: async () => {
          writes++;
        },
        deleteMany: async () => {
          writes++;
          return { count: 3 };
        },
      },
      molecule: {
        create: async () => {
          writes++;
          return { id: 99 };
        },
      },
      atom: {
        createMany: async () => {
          writes++;
          return { count: 3 };
        },
      },
      mountOperation: {
        create: async () => {
          writes++;
        },
      },
      rackThumbnail: {
        deleteMany: async () => {
          writes++;
          return { count: 0 };
        },
      },
    });
    assert.deepEqual(
      await repo.mount({ rack_id: 7, object_id: 42, start_unit: 1, height: 1 }),
      { status: "rack_height_invalid" },
      `height=${rackHeight}`,
    );
    assert.equal(writes, 0);

    const moved = repository({
      object: {
        findUnique: async ({ where }: { where: { id: number } }) =>
          where.id === 42 ? object : { ...object, id: 7, objtype_id: 1560 },
      },
      attributeValue: { findUnique: async () => ({ uint_value: rackHeight }) },
      rackSpace: {
        findMany: async ({ where }: { where: { object_id?: number } }) =>
          where.object_id
            ? spaces.map(({ rack_id, unit_no, atom }) => ({
                rack_id,
                unit_no,
                atom,
              }))
            : [],
        deleteMany: async () => {
          writes++;
          return { count: 3 };
        },
        upsert: async () => {
          writes++;
        },
      },
      molecule: {
        create: async () => {
          writes++;
          return { id: 99 };
        },
      },
      atom: {
        createMany: async () => {
          writes++;
          return { count: 3 };
        },
      },
      mountOperation: {
        create: async () => {
          writes++;
        },
      },
      rackThumbnail: {
        deleteMany: async () => {
          writes++;
          return { count: 0 };
        },
      },
    });
    assert.deepEqual(
      await moved.move({
        object_id: 42,
        destination_rack_id: 7,
        start_unit: 1,
      }),
      { status: "rack_height_invalid" },
      `height=${rackHeight}`,
    );
    assert.equal(writes, 0);
  }
});

test("unmount and move reject incomplete and non-contiguous source allocations", async () => {
  const repo = repository({
    object: { findUnique: async () => object },
    rackSpace: { findMany: async () => spaces.slice(0, 2) },
  });
  assert.deepEqual(await repo.unmount(42), {
    status: "inconsistent_allocation",
  });
  assert.deepEqual(
    await repo.move({ object_id: 42, destination_rack_id: 8, start_unit: 20 }),
    { status: "inconsistent_allocation" },
  );
});

test("same-rack move allows overlap, rebuilds positions and records old/new molecules", async () => {
  const written: unknown[] = [];
  const history: unknown[] = [];
  let molecule = 0;
  const repo = repository({
    object: {
      findUnique: async ({ where }: { where: { id: number } }) =>
        where.id === 42 ? object : { ...object, id: 7, objtype_id: 1560 },
    },
    attributeValue: { findUnique: async () => ({ uint_value: 42 }) },
    rackSpace: {
      findMany: async () => spaces,
      deleteMany: async () => ({ count: 3 }),
      upsert: async ({ create }: { create: unknown }) => written.push(create),
    },
    molecule: { create: async () => ({ id: ++molecule }) },
    atom: { createMany: async () => ({ count: 3 }) },
    mountOperation: {
      create: async ({ data }: { data: unknown }) => history.push(data),
    },
    rackThumbnail: { deleteMany: async () => ({ count: 0 }) },
  });
  const result = await repo.move(
    { object_id: 42, destination_rack_id: 7, start_unit: 10 },
    "alice",
  );
  assert.equal(result.status, "moved");
  assert.equal(written.length, 3);
  assert.deepEqual(history, [
    {
      object_id: 42,
      old_molecule_id: 1,
      new_molecule_id: 2,
      user_name: "alice",
      comment: "Automated move from rack 7 to rack 7: units 10-10",
    },
  ]);
});

test("mount allocates descending units in all regions with one history operation", async () => {
  const written: unknown[] = [];
  const atoms: unknown[] = [];
  const history: unknown[] = [];
  const repo = repository({
    object: {
      findUnique: async ({ where }: { where: { id: number } }) =>
        where.id === 42 ? object : { ...object, id: 7, objtype_id: 1560 },
    },
    attributeValue: { findUnique: async () => ({ uint_value: 42 }) },
    rackSpace: {
      findMany: async () => [],
      upsert: async ({ create }: { create: unknown }) => written.push(create),
    },
    molecule: { create: async () => ({ id: 99 }) },
    atom: {
      createMany: async ({ data }: { data: unknown[] }) => atoms.push(...data),
    },
    mountOperation: {
      create: async ({ data }: { data: unknown }) => history.push(data),
    },
    rackThumbnail: { deleteMany: async () => ({ count: 0 }) },
  });
  assert.deepEqual(
    await repo.mount(
      { rack_id: 7, object_id: 42, start_unit: 2, height: 2 },
      "alice",
    ),
    {
      status: "mounted",
      allocation: {
        rack_id: 7,
        object_id: 42,
        start_unit: 2,
        height: 2,
        end_unit: 1,
        molecule_id: 99,
      },
    },
  );
  assert.deepEqual(written, [
    { rack_id: 7, unit_no: 1, atom: "front", state: "T", object_id: 42 },
    { rack_id: 7, unit_no: 1, atom: "interior", state: "T", object_id: 42 },
    { rack_id: 7, unit_no: 1, atom: "rear", state: "T", object_id: 42 },
    { rack_id: 7, unit_no: 2, atom: "front", state: "T", object_id: 42 },
    { rack_id: 7, unit_no: 2, atom: "interior", state: "T", object_id: 42 },
    { rack_id: 7, unit_no: 2, atom: "rear", state: "T", object_id: 42 },
  ]);
  assert.equal(atoms.length, 6);
  assert.deepEqual(history, [
    {
      object_id: 42,
      old_molecule_id: null,
      new_molecule_id: 99,
      user_name: "alice",
      comment: "Automated mount in rack 7: units 1-2",
    },
  ]);
});

test("unmount preserves removed atoms in history and removes only the target object", async () => {
  let deleted: unknown;
  let history: unknown;
  const repo = repository({
    object: { findUnique: async () => object },
    rackSpace: {
      findMany: async () =>
        spaces.map(({ rack_id, unit_no, atom }) => ({
          rack_id,
          unit_no,
          atom,
        })),
      deleteMany: async ({ where }: { where: unknown }) => {
        deleted = where;
        return { count: 3 };
      },
    },
    molecule: { create: async () => ({ id: 99 }) },
    atom: {
      createMany: async ({ data }: { data: unknown[] }) => {
        assert.deepEqual(data, [
          { rack_id: 7, unit_no: 10, atom: "front", molecule_id: 99 },
          { rack_id: 7, unit_no: 10, atom: "interior", molecule_id: 99 },
          { rack_id: 7, unit_no: 10, atom: "rear", molecule_id: 99 },
        ]);
      },
    },
    mountOperation: {
      create: async ({ data }: { data: unknown }) => {
        history = data;
      },
    },
    rackThumbnail: { deleteMany: async () => ({ count: 0 }) },
  });
  assert.deepEqual(await repo.unmount(42, "alice"), {
    status: "unmounted",
    allocation: {
      object_id: 42,
      rack_id: 7,
      units_removed: [10],
      molecule_id: 99,
    },
  });
  assert.deepEqual(deleted, { object_id: 42 });
  assert.deepEqual(history, {
    object_id: 42,
    old_molecule_id: 99,
    new_molecule_id: null,
    user_name: "alice",
    comment: "Automated unmount from rack 7: units 10-10",
  });
});

test("invalid calendar dates and unsigned values are rejected without writing", async () => {
  const repo = repository({
    object: { findUnique: async () => object },
    attributeMap: {
      findMany: async () => [
        {
          attr_id: 1,
          chapter_id: null,
          Attribute: { id: 1, name: "Purchased", type: "date" },
        },
        {
          attr_id: 2,
          chapter_id: null,
          Attribute: { id: 2, name: "CPU", type: "uint" },
        },
      ],
    },
  });
  for (const updates of [
    { Purchased: "2023-02-29" },
    { CPU: -1 },
    { CPU: 4_294_967_296 },
    { CPU: 1.5 },
  ]) {
    assert.equal(
      (await repo.update({ id: 42, updates })).status,
      "invalid_attribute",
    );
  }
});

test("serialization failures retry the whole transaction and stop after three attempts", async () => {
  let attempts = 0;
  const cause = Object.assign(new Error("deadlock"), { code: "P2034" });
  const repo = repository({
    dictionary: {
      findFirst: async () => {
        attempts++;
        throw cause;
      },
    },
  });
  await assert.rejects(
    () => repo.create({ name: "server", objtype_id: 4 }),
    (error: unknown) => {
      assert.ok(error instanceof ApplicationError);
      assert.equal(error.cause, cause);
      return true;
    },
  );
  assert.equal(attempts, 3);
});
