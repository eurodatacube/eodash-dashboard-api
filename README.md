# EODash Dashboard API

Uses [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design), [Node.js](https://nodejs.org/en/), [Typescript](https://www.typescriptlang.org/), [Socket.io](https://socket.io/), [Joi](https://joi.dev/), [Ava](https://github.com/avajs/ava)(for tests).

## Docs
API docs are located [here](docs/API.md)

## Build
To build the source and the tests run
```
yarn run build
```
This creates two versions of the build. One using CommonJS and another one using ES6 modules in the `build/main` and `build/module` directories respectively.

To run the CommonJS build run the `yarn run start:main` command.

## Test
To run all the unit tests first build them and then run
```
yarn run ava
```
There is also a `yarn run test:unit` command which also generates coverage data but is not recommended for local development as it breaks the source maps.

## Watch
To automatically build on file edits run
```
yarn run watch
```
This will listen to changes on both the source and test files. There are also commands to do this separately: `yarn run watch:build` and `yarn run watch:test`

## Linting
We use [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) and [CSpell](https://github.com/streetsidesoftware/cspell) for linting.

To lint all the source and test files run
```
yarn run test:lint
```
There is also a command to auto-fix errors: `yarn run fix`
