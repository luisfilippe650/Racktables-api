import type { ObjectsService } from "../../../src/modules/objects/objects.service.js";

// Compile this file to verify the service's input contract without running calls.
export function checkServiceInputs(service: ObjectsService): void {
  void service.create({ name: "server", objtype_id: 4 });
  void service.update(42, { has_problems: true, CPU: { clear: true } });
  void service.getAll();
  void service.getAll({ page: "2", per_page: 10 });
  void service.getAllObjects({ search: "server" });
  void service.getTypes({ page: 1 });
  void service.getSummary(42, "false");
  void service.getDictionaryOptions(1, { per_page: 10 });
  void service.mount({ rack_id: 7, object_id: 42, start_unit: 10, height: 2 });
  void service.move({ object_id: 42, destination_rack_id: 8, start_unit: 10 });

  // @ts-expect-error Creation requires a name and object type.
  void service.create({});
  // @ts-expect-error Fixed text fields do not accept numbers.
  void service.update(42, { label: 123 });
  // @ts-expect-error Pagination does not accept arrays.
  void service.getAll({ page: [] });
  // @ts-expect-error Search must be text.
  void service.getAllObjects({ search: 123 });
  // @ts-expect-error Unknown query fields are rejected.
  void service.getTypes({ search: "server" });
  // @ts-expect-error Summary accepts booleans or the strings "true" and "false".
  void service.getSummary(42, "bad");
  // @ts-expect-error Dictionary pagination does not accept booleans.
  void service.getDictionaryOptions(1, { per_page: true });
  // @ts-expect-error Mounting requires an allocation height.
  void service.mount({ rack_id: 7, object_id: 42, start_unit: 10 });
  void service.move({
    object_id: 42,
    // @ts-expect-error The destination rack ID must be a number.
    destination_rack_id: "8",
    start_unit: 10,
  });
}
