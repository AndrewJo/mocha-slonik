# [7.0.0](https://github.com/AndrewJo/mocha-slonik/compare/v6.0.1...v7.0.0) (2023-04-22)


* fix(types)!: add support for slonik >= 33.1.1 (#18) ([77cb4f7](https://github.com/AndrewJo/mocha-slonik/commit/77cb4f730131815b73825d9c75232a83d145f38a)), closes [#18](https://github.com/AndrewJo/mocha-slonik/issues/18)


### BREAKING CHANGES

* mocha-slonik will no longer compile with slonik version < 33.1.1

* fix: always call `.end()` on PgClient setup instance

* fix: use end method from PgPool

* refactor: remove processID in debug logs

* chore(deps): update dev dependency to 33.3.1

* chore(deps): update sinon v15.0.2

* chore(ci): test against slonik 33.3.1

* docs: update version compatibility chart

## [6.0.1](https://github.com/AndrewJo/mocha-slonik/compare/v6.0.0...v6.0.1) (2023-04-21)


### Bug Fixes

* limit slonik version range between 33.0.0 - 33.1.0 ([75b53af](https://github.com/AndrewJo/mocha-slonik/commit/75b53af0e13f8072ed5af820825b4db38bd406ff))


### Reverts

* switch back to lockfile v2 ([19a89ee](https://github.com/AndrewJo/mocha-slonik/commit/19a89ee594bbafd4d95c9ebe96972579664d688a))

# [6.0.0](https://github.com/AndrewJo/mocha-slonik/compare/v5.0.1...v6.0.0) (2023-01-27)


* feat(deps)!: upgrade to slonik 33.x.y ([c2b25d1](https://github.com/AndrewJo/mocha-slonik/commit/c2b25d16cd0fd1e24cfd1191ead969a147db1882))


### BREAKING CHANGES

* Slonik v33 introduces changes to the library API that
is not backwards compatible.
