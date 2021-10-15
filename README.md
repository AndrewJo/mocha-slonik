# mocha-slonik

Slonik transaction support for [Mocha][mocha] test framework.

## How it works

mocha-slonik is a [Root Hook Plugin][root-hook-plugin] for [Mocha][mocha] that utilizes
[ts-mock-imports][ts-mock-imports] to return a stubbed bindPool function that wrap most of the
[Slonik query methods][slonik-query-methods] in a transaction that automatically rolls back after
each test.

## Usage

Install this library as a dev dependency:

```sh
npm i -D mocha-slonik
```

## Limitations

### Lack of `copyFromBinary` support

Due to the lack of support for transactions in `copyFromBinary` method and
[the potential for being deprecated in the future versions][slonik-issue-161], calling
`copyFromBinary` will immediately reject with an error message.

[mocha]: https://mochajs.org
[root-hook-plugin]: https://mochajs.org/#root-hook-plugins
[ts-mock-imports]: https://github.com/EmandM/ts-mock-imports
[slonik]: https://github.com/gajus/slonik
[slonik-query-methods]: https://github.com/gajus/slonik#slonik-query-methods
[slonik-issue-161]: https://github.com/gajus/slonik/issues/161#issuecomment-604770259
