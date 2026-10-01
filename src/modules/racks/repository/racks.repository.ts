import type {
  RackCreateResult,
  RackDeleteResult,
  RackDetailsOutput,
  RackInput,
  RackOccupancyData,
  RackPagination,
  RackPage,
  RackSpaceResult,
  RackOutput,
  RackSpaceAtom,
  RackSpaceOutput,
  RackUpdate,
  RackUpdateResult,
} from "../entity/racks.entity.js";

export abstract class RacksRepository {

  abstract create(data: RackInput, actor?: string | null,): Promise<RackCreateResult>;

  abstract update(data: RackUpdate, actor?: string | null,): Promise<RackUpdateResult>;

  abstract delete(id: number): Promise<RackDeleteResult>;

  abstract get(id: number): Promise<RackOutput | null>;

  abstract getByName(name: string): Promise<RackOutput | null>;

  abstract getAll(pagination: RackPagination): Promise<RackPage<RackOutput>>;

  abstract getDetails(rackId: number): Promise<RackDetailsOutput | null>;

  abstract getOccupancy(rackId: number): Promise<RackOccupancyData | null>;

  abstract getOccupancyAll(pagination: RackPagination,): Promise<RackPage<RackOccupancyData>>;

  /** Retorna as posições registradas; null se o rack não existir. */
  abstract getSpaces(rackId: number): Promise<RackSpaceOutput[] | null>;

  /**
   * Retorna a posição registrada para a unidade e região informadas.
   * Diferencia rack inexistente de posição sem registro, na mesma leitura.
   * A ausência de registro não determina se a posição está disponível.
   */
  abstract getSpace(
    rackId: number,
    unitNo: number,
    atom: RackSpaceAtom,
  ): Promise<RackSpaceResult>;

  /**
   * Retorna as posições do objeto neste rack; [] se não houver associação.
   * Retorna null se o rack não existir.
   */
  abstract getObjectSpaces(
    rackId: number,
    objectId: number,
  ): Promise<RackSpaceOutput[] | null>;
}
