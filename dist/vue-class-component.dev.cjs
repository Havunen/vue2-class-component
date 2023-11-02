/**
  * vue-class-component v7.3.4
  * (c) 2015-present Evan You
  * @license MIT
  */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var Vue = require('vue');

function copyReflectionMetadata(to, from) {
  forwardMetadata(to, from);
  Object.getOwnPropertyNames(from.prototype).forEach(key => {
    forwardMetadata(to.prototype, from.prototype, key);
  });
  Object.getOwnPropertyNames(from).forEach(key => {
    forwardMetadata(to, from, key);
  });
}
function forwardMetadata(to, from, propertyKey) {
  const metaKeys = propertyKey ? Reflect.getOwnMetadataKeys(from, propertyKey) : Reflect.getOwnMetadataKeys(from);
  metaKeys.forEach(metaKey => {
    const metadata = propertyKey ? Reflect.getOwnMetadata(metaKey, from, propertyKey) : Reflect.getOwnMetadata(metaKey, from);
    if (propertyKey) {
      Reflect.defineMetadata(metaKey, metadata, to, propertyKey);
    } else {
      Reflect.defineMetadata(metaKey, metadata, to);
    }
  });
}

const fakeArray = {
  __proto__: []
};
const hasProto = fakeArray instanceof Array;
function createDecorator(factory) {
  return (target, key, index) => {
    const Ctor = typeof target === 'function' ? target : target.constructor;
    if (!Ctor.__decorators__) {
      Ctor.__decorators__ = [];
    }
    if (typeof index !== 'number') {
      index = undefined;
    }
    Ctor.__decorators__.push(options => factory(options, key, index));
  };
}
function mixins(...Ctors) {
  // @ts-ignore
  return Vue.extend({
    mixins: Ctors
  });
}
function isPrimitive(value) {
  const type = typeof value;
  return value == null || type !== 'object' && type !== 'function';
}
function warn(message) {
  if (typeof console !== 'undefined') {
    console.warn('[vue-class-component] ' + message);
  }
}

function collectDataFromConstructor(vm, Component) {
  // override _init to prevent to init as Vue instance
  const originalInit = Component.prototype._init;
  Component.prototype._init = function () {
    // proxy to actual vm
    const keys = Object.getOwnPropertyNames(vm);
    // 2.2.0 compat (props are no longer exposed as self properties)
    if (vm.$options.props) {
      for (const key in vm.$options.props) {
        if (!vm.hasOwnProperty(key)) {
          keys.push(key);
        }
      }
    }
    keys.forEach(key => {
      Object.defineProperty(this, key, {
        get: () => vm[key],
        set: value => {
          vm[key] = value;
        },
        configurable: true
      });
    });
  };
  // should be acquired class property values
  const data = new Component();
  // restore original _init to avoid memory leak (#209)
  Component.prototype._init = originalInit;
  // create plain data object
  const plainData = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      plainData[key] = data[key];
    }
  });
  {
    // @ts-ignore
    if (!(Component.prototype instanceof Vue) && Object.keys(plainData).length > 0) {
      warn('Component class must inherit Vue or its descendant class ' + 'when class property is used.');
    }
  }
  return plainData;
}

const $internalHooks = ['data', 'beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeDestroy', 'destroyed', 'beforeUpdate', 'updated', 'activated', 'deactivated', 'render', 'errorCaptured', 'serverPrefetch' // 2.6
];

function componentFactory(Component, options = {}) {
  options.name = options.name || Component._componentTag || Component.name;
  // prototype props.
  const proto = Component.prototype;
  Object.getOwnPropertyNames(proto).forEach(function (key) {
    if (key === 'constructor') {
      return;
    }
    // hooks
    if ($internalHooks.indexOf(key) > -1) {
      options[key] = proto[key];
      return;
    }
    const descriptor = Object.getOwnPropertyDescriptor(proto, key);
    if (descriptor.value !== void 0) {
      // methods
      if (typeof descriptor.value === 'function') {
        (options.methods || (options.methods = {}))[key] = descriptor.value;
      } else {
        // typescript decorated data
        (options.mixins || (options.mixins = [])).push({
          data() {
            return {
              [key]: descriptor.value
            };
          }
        });
      }
    } else if (descriptor.get || descriptor.set) {
      // computed properties
      (options.computed || (options.computed = {}))[key] = {
        get: descriptor.get,
        set: descriptor.set
      };
    }
  });
  (options.mixins || (options.mixins = [])).push({
    data() {
      return collectDataFromConstructor(this, Component);
    }
  });
  // decorate options
  const decorators = Component.__decorators__;
  if (decorators) {
    for (const fn of decorators) {
      fn(options);
    }
    delete Component.__decorators__;
  }
  // find super
  const superProto = Object.getPrototypeOf(Component.prototype);
  // @ts-ignore
  const Super = superProto instanceof Vue ? superProto.constructor : Vue;
  const Extended = Super.extend(options);
  forwardStaticMembers(Extended, Component, Super);
  copyReflectionMetadata(Extended, Component);
  return Extended;
}
const reservedPropertyNames = [
// Unique id
'cid',
// Super Vue constructor
'super',
// Component options that will be used by the component
'options', 'superOptions', 'extendOptions', 'sealedOptions',
// Private assets
'component', 'directive', 'filter'];
const shouldIgnore = {
  prototype: true,
  arguments: true,
  callee: true,
  caller: true
};
function forwardStaticMembers(Extended, Original, Super) {
  // We have to use getOwnPropertyNames since Babel registers methods as non-enumerable
  Object.getOwnPropertyNames(Original).forEach(key => {
    // Skip the properties that should not be overwritten
    if (shouldIgnore[key]) {
      return;
    }
    // Some browsers does not allow reconfigure built-in properties
    const extendedDescriptor = Object.getOwnPropertyDescriptor(Extended, key);
    if (extendedDescriptor && !extendedDescriptor.configurable) {
      return;
    }
    const descriptor = Object.getOwnPropertyDescriptor(Original, key);
    // If the user agent does not support `__proto__` or its family (IE <= 10),
    // the sub class properties may be inherited properties from the super class in TypeScript.
    // We need to exclude such properties to prevent to overwrite
    // the component options object which stored on the extended constructor (See #192).
    // If the value is a referenced value (object or function),
    // we can check equality of them and exclude it if they have the same reference.
    // If it is a primitive value, it will be forwarded for safety.
    if (!hasProto) {
      // Only `cid` is explicitly exluded from property forwarding
      // because we cannot detect whether it is a inherited property or not
      // on the no `__proto__` environment even though the property is reserved.
      if (key === 'cid') {
        return;
      }
      const superDescriptor = Object.getOwnPropertyDescriptor(Super, key);
      if (!isPrimitive(descriptor.value) && superDescriptor && superDescriptor.value === descriptor.value) {
        return;
      }
    }
    // Warn if the users manually declare reserved properties
    if (reservedPropertyNames.indexOf(key) >= 0) {
      warn(`Static property name '${key}' declared on class '${Original.name}' ` + 'conflicts with reserved property name of Vue internal. ' + 'It may cause unexpected behavior of the component. Consider renaming the property.');
    }
    Object.defineProperty(Extended, key, descriptor);
  });
}

function Component(options) {
  if (typeof options === 'function') {
    return componentFactory(options);
  }
  return function (Component) {
    return componentFactory(Component, options);
  };
}
Component.registerHooks = function registerHooks(keys) {
  $internalHooks.push(...keys);
};

exports.Component = Component;
exports.createDecorator = createDecorator;
exports.default = Component;
exports.mixins = mixins;
