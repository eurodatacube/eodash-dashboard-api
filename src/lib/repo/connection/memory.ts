import { ConnectionRepository } from '.';

export class MemoryConnectionRepository implements ConnectionRepository {
  private readonly connections: Map<
    string,
    { id: string; hasPrivilege: boolean }[]
  > = new Map();
  private readonly groupOf: Map<
    string,
    { groupId: string; hasPrivilege: boolean }
  > = new Map();

  async connect() {}

  public async add(groupId: string, id: string, hasPrivilege: boolean) {
    this.groupOf.set(id, { groupId, hasPrivilege });

    if (!this.connections.has(groupId)) {
      this.connections.set(groupId, [{ id, hasPrivilege }]);
    } else {
      this.connections.set(
        groupId,
        this.connections.get(groupId)!.concat([{ id, hasPrivilege }])
      );
    }
  }

  public async getConnectionsOfGroup(groupId: string) {
    return this.connections.get(groupId) || [];
  }

  public async getGroupOfConnection(id: string) {
    return this.groupOf.get(id)?.groupId || null;
  }

  public async remove(id: string) {
    const groupId = this.groupOf.get(id)?.groupId;

    if (groupId) {
      const connections = this.connections.get(groupId)!;

        connections.splice(
          connections.findIndex((c) => c.id === id),
          1
        );
        if (connections.length) this.connections.set(groupId, connections);
        else this.connections.delete(groupId);
        this.groupOf.delete(id);
    }
  }

  public async has(id: string) {
    return this.groupOf.has(id);
  }

  public async hasPrivilege(id: string) {
    const connection = this.groupOf.get(id);

    return !!connection?.hasPrivilege;
  }

  async close() {}
}
