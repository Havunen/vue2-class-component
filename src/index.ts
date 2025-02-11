// @ts-ignore
import Vue, { ComponentOptions } from 'vue'
import { VueClass } from './declarations.js'
import { componentFactory, $internalHooks } from './component.js'

export { createDecorator, VueDecorator, mixins } from './util.js'

function Component <V extends Vue>(options: ComponentOptions<V> & ThisType<V>): <VC extends VueClass<V>>(target: VC) => VC
function Component <VC extends VueClass<Vue>>(target: VC): VC
function Component (options: ComponentOptions<Vue> | VueClass<Vue>): any {
  if (typeof options === 'function') {
    return componentFactory(options)
  }
  return function (Component: VueClass<Vue>) {
    return componentFactory(Component, options)
  }
}

Component.registerHooks = function registerHooks (keys: string[]): void {
  for (const k of keys) {
    $internalHooks.add(k)
  }
}

export {
  Component
}

export default Component
