import type { Instance, InstanceStore } from '../types/index.js'
import { clone } from '../shared.js'

export class InMemoryInstanceStore implements InstanceStore {
  constructor(private instance: Instance) {}

  async load(_instanceId: string): Promise<Instance> {
    return clone(this.instance)
  }

  async save(instance: Instance): Promise<void> {
    this.instance = clone(instance)
  }
}
