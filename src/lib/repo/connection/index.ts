export interface ConnectionRepository {
  connect(): Promise<void>;
  add(groupId: string, id: string, hasPrivilege: boolean): Promise<void>;
  getConnectionsOfGroup(
    groupId: string
  ): Promise<{ id: string; hasPrivilege: boolean }[]>;
  getGroupOfConnection(id: string): Promise<string | null>;
  remove(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
  hasPrivilege(id: string): Promise<boolean>;
  close(): Promise<void>;
}
