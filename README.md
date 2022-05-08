# SillySuite

This project was generated using [Nx](https://nx.dev).

## Adding capabilities to your workspace

Nx supports many plugins which add capabilities for developing different types of applications and different tools.

These capabilities include generating applications, libraries, etc as well as the devtools to test, and build projects as well.

There are also many [community plugins](https://nx.dev/community) you could add.

## Generate a library

Run `nx generate @nrwl/js:library --name=silly-lib --directory=publishable --buildable --publishable --importPath=@silly-suite/silly-lib` to generate a library. Remember to check the workspace.json file to determine if the project name is what you wanted it to be.

Libraries are shareable across libraries and applications. They can be imported via `@silly-suite/silly-lib`.

## Build

Run `nx build my-lib` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `nx test my-lib` to execute the unit tests via [Jest](https://jestjs.io).

Run `nx affected:test` to execute the unit tests affected by a change.

## Understand your workspace

Run `nx graph` to see a diagram of the dependencies of your projects.

## Further help

Visit the [Nx Documentation](https://nx.dev) to learn more.
