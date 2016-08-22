# somersault change log

## Version 1.2.0
Added support for ES6 module-syntax that is transpiled via Babel. This uses the presence of a
__esModule attribute and the .default export.

## Version 1.0.0
Because it's probably quite done/stable and ready for the real world.
- Refactored .createChild to become .createContainer to match parent/child method names.
- Changed module to have function() return value, so simple example becomes:
      const container = require('somersault')();
      container.register('tag', object|class|func);
- Fixed up ES/JSDoc tags.

## Version 0.0.x - Various Improvements
- Added `.filterAll(tag|tags)` command to create child container that only includes registrations matching all of the nominated tag(s).
- Added `.register(tag|tags, generator, alternateParams)` overload to .register allowing for override of argument names to functions/classes.
- Added `.build(generator, alternateParams)` overload to .build allowing for override of argument names on generator.

## Version 0.0.5 - Various Improvements
- Added `.resolveAll(tag|tags)` command to resolve an array of inputs.
- Added `.filterAny(tag|tags)` command to create child container that only includes registrations matching any of the nominated tag(s).
- Added `.filterOut(tag|tags)` command to create child container that excludes any registrations matching any of the nominated tag(s).

## Version 0.0.3 - Various Improvements
- `$container` parameter on a generator/value now injects a dynamically created child container into the object/function being built.
- Support for container chaining. Pass an existing container to `.createContainer(parent)` or simply call `.createChild()` on an existing container.
    - Parent containers can now contain incomplete dependency graphs, with child containers filling in the blanks.
- Can store and retrieve non-function/class/arrow values now, allowing injection of configuration string data.
- Code quality improvements (100% statement coverage, 95% branch coverage).

## Version 0.0.2 - Initial Public Release
- Initial release / making NPM package public.