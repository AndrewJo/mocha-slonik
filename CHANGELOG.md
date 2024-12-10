## [9.0.3](https://github.com/AndrewJo/mocha-slonik/compare/v9.0.2...v9.0.3) (2024-12-10)


### Bug Fixes

* package.json & package-lock.json to reduce vulnerabilities ([#30](https://github.com/AndrewJo/mocha-slonik/issues/30)) ([5c673fc](https://github.com/AndrewJo/mocha-slonik/commit/5c673fc77410e1732fde569a9e72447a3b91e483))

## [9.0.2](https://github.com/AndrewJo/mocha-slonik/compare/v9.0.1...v9.0.2) (2024-07-11)


### Bug Fixes

* package.json & package-lock.json to reduce vulnerabilities ([#28](https://github.com/AndrewJo/mocha-slonik/issues/28)) ([c803a30](https://github.com/AndrewJo/mocha-slonik/commit/c803a305f638de68935211f20b8b5720d639f708))

## [9.0.1](https://github.com/AndrewJo/mocha-slonik/compare/v9.0.0...v9.0.1) (2024-06-11)


### Bug Fixes

* upgrade ts-mock-imports from 1.3.8 to 1.3.16 ([#27](https://github.com/AndrewJo/mocha-slonik/issues/27)) ([13b5fb6](https://github.com/AndrewJo/mocha-slonik/commit/13b5fb623284335abae2e12b640073be893a6a1e))

# [9.0.0](https://github.com/AndrewJo/mocha-slonik/compare/v8.0.0...v9.0.0) (2023-10-16)


* chore!: update supported Slonik version to ≥35.0.0 <38 (#24) ([1830b68](https://github.com/AndrewJo/mocha-slonik/commit/1830b68a6a0e0209553c0d83a27b3bbeed2cf7e0)), closes [#24](https://github.com/AndrewJo/mocha-slonik/issues/24)


### BREAKING CHANGES

* Drops support for Slonik v34 and earlier.

# [8.0.0](https://github.com/AndrewJo/mocha-slonik/compare/v7.0.1...v8.0.0) (2023-09-29)


* chore!: update supported Slonik version to ≥34.0.0 <35 (#23) ([1f4d4e4](https://github.com/AndrewJo/mocha-slonik/commit/1f4d4e410810230fb511ce6a7ced7019924d24c9)), closes [#23](https://github.com/AndrewJo/mocha-slonik/issues/23)


### BREAKING CHANGES

* copyFromBinary has been removed and Node.js v16 support has been dropped.

## [7.0.1](https://github.com/AndrewJo/mocha-slonik/compare/v7.0.0...v7.0.1) (2023-06-06)


### Bug Fixes

* upgrade sinon from 15.0.3 to 15.0.4 ([#20](https://github.com/AndrewJo/mocha-slonik/issues/20)) ([31d5266](https://github.com/AndrewJo/mocha-slonik/commit/31d5266352b36d8951db28baffebca0da438255e))

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
