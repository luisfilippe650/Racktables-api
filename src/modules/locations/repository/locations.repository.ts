import { LocationInput, LocationUpdateInput, LocationOutput } from "../entity/locations.entity.js";

export abstract class LocationsRepository {
  abstract create(data: LocationInput): Promise<LocationOutput | null>;

  abstract delete( id : number ): Promise<void | null >;

  abstract updateLocation(data: LocationUpdateInput): Promise<LocationOutput | null >;

  abstract getLocation( id  : number ): Promise<LocationOutput | null >;

  abstract getAllLocations(): Promise<LocationOutput[] | null >;
}

