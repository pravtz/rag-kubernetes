export abstract class Entity<T> {
  protected readonly _id: T;

  get id(): T {
    return this._id;
  }

  constructor(id: T) {
    this._id = id;
  }

  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) return false;
    if (!(other instanceof Entity)) return false;
    return this._id === other._id;
  }
}
