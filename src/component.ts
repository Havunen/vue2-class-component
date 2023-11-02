import Vue, {ComponentOptions} from 'vue'
import { copyReflectionMetadata } from './reflect.js'
import { VueClass, DecoratedClass } from './declarations.js'
import { collectDataFromConstructor } from './data.js'
import { warn } from './util.js'

export const $internalHooks = new Set([
  'data',
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeDestroy',
  'destroyed',
  'beforeUpdate',
  'updated',
  'activated',
  'deactivated',
  'render',
  'errorCaptured', // 2.5
  'serverPrefetch' // 2.6
])

export function componentFactory (
  Component: VueClass<Vue>,
  options: ComponentOptions<Vue> = {}
): VueClass<Vue> {
  options.name = options.name || (Component as any)._componentTag || (Component as any).name
  // prototype props.
  const proto = Component.prototype
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') {
      continue;
    }

    // hooks
    if ($internalHooks.has(key)) {
      options[key] = proto[key]
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(proto, key)!
    if (descriptor.value !== void 0) {
      // methods
      if (typeof descriptor.value === 'function') {
        (options.methods || (options.methods = {}))[key] = descriptor.value
      } else {
        // typescript decorated data
        (options.mixins || (options.mixins = [])).push({
          data (this: Vue) {
            return { [key]: descriptor.value }
          }
        })
      }
    } else if (descriptor.get || descriptor.set) {
      // computed properties
      (options.computed || (options.computed = {}))[key] = {
        get: descriptor.get,
        set: descriptor.set
      }
    }
  }
  (options.mixins || (options.mixins = [])).push({
    data (this: Vue) {
      return collectDataFromConstructor(this, Component)
    }
  })

  // decorate options
  const decorators = (Component as DecoratedClass).__decorators__
  if (decorators) {
    for (const fn of decorators) {
      fn(options);
    }
    delete (Component as DecoratedClass).__decorators__
  }

  // find super
  const superProto = Object.getPrototypeOf(Component.prototype)

  // @ts-ignore
  const Super: any = superProto instanceof Vue ? superProto.constructor as VueClass<Vue> : Vue

  const Extended = Super.extend(options)

  forwardStaticMembers(Extended, Component)
  copyReflectionMetadata(Extended, Component)

  return Extended
}

const reservedPropertyNames = [
  // Unique id
  'cid',

  // Super Vue constructor
  'super',

  // Component options that will be used by the component
  'options',
  'superOptions',
  'extendOptions',
  'sealedOptions',

  // Private assets
  'component',
  'directive',
  'filter'
]

const shouldIgnore = {
  prototype: true,
  arguments: true,
  callee: true,
  caller: true
}

function forwardStaticMembers (
  Extended: typeof Vue,
  Original: typeof Vue
): void {
  // We have to use getOwnPropertyNames since Babel registers methods as non-enumerable
  for (const key of Object.getOwnPropertyNames(Original)) {
    // Skip the properties that should not be overwritten
    if (shouldIgnore[key]) {
      continue;
    }

    // Some browsers does not allow reconfigure built-in properties
    const extendedDescriptor = Object.getOwnPropertyDescriptor(Extended, key)
    if (extendedDescriptor && !extendedDescriptor.configurable) {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(Original, key)!

    // Warn if the users manually declare reserved properties
    if (
      process.env.NODE_ENV !== 'production' &&
      reservedPropertyNames.indexOf(key) >= 0
    ) {
      warn(
        `Static property name '${key}' declared on class '${(Original as any).name}' ` +
        'conflicts with reserved property name of Vue internal. ' +
        'It may cause unexpected behavior of the component. Consider renaming the property.'
      )
    }

    Object.defineProperty(Extended, key, descriptor)
  }
}
