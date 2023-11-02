// @ts-ignore
import Vue, { VueConstructor } from 'vue'
import { VueClass } from './declarations.js'

export function copyReflectionMetadata (
  to: VueConstructor,
  from: VueClass<Vue>
) {
  forwardMetadata(to, from)

  for (const key of Object.getOwnPropertyNames(from.prototype)) {
    forwardMetadata(to.prototype, from.prototype, key)
  }

  for (const key of Object.getOwnPropertyNames(from)) {
    forwardMetadata(to, from, key)
  }
}

function forwardMetadata (to: object, from: object, propertyKey?: string): void {
  const metaKeys = propertyKey
    ? Reflect.getOwnMetadataKeys(from, propertyKey)
    : Reflect.getOwnMetadataKeys(from)

  for (const metaKey of metaKeys) {
    const metadata = propertyKey
      ? Reflect.getOwnMetadata(metaKey, from, propertyKey)
      : Reflect.getOwnMetadata(metaKey, from)

    if (propertyKey) {
      Reflect.defineMetadata(metaKey, metadata, to, propertyKey)
    } else {
      Reflect.defineMetadata(metaKey, metadata, to)
    }
  }
}
