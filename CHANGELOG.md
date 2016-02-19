# somersault change log

## Version 0.0.x - Various Improvements
- Added `.filterAll(tag|tags)` command to create child container that only includes registrations matching all of the nominated tag(s).

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