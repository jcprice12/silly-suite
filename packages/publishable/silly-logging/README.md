# publishable-silly-logging

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build silly-logging` to build the library.

## Running unit tests

Run `nx test silly-logging` to execute the unit tests via [Jest](https://jestjs.io).

## Usage

Below are some examples and documentation to help you use the module

### Testing

I encourage writing unit tests so that you can have confidence that you're using the module correctly

#### Asserting what is Logged by the Decorators

You can test your usage of the decorators by asserting what is logged.

Suppose you had the following class that uses the decorator:

```typescript
import { LogOnArrival, SillyLogger } from '@silly-suite/silly-logging';
import { maskPassword } from './mask-password.util';
import { retrieveLoggerOnClass } from './retrieve-logger.util';

export class MyClass {
  constructor(public readonly logger: SillyLogger) {}

  @LogOnArrival(retrieveLoggerOnClass, {
    argMappings: [maskPassword('pass')],
  })
  testLogOnArrival(password: string): void {
    password;
  }
}
```

```retrieveLogger``` and ```maskPassword``` have the following implementations respectively:

```typescript
import { DecoratedMethodData } from '@silly-suite/silly-decorator';

export function retrieveLoggerOnClass(data: DecoratedMethodData) {
  return data.thiz.logger 
}
```

```typescript
export function maskPassword(name: string) {
  return () => {
    return {
      name,
      value: '****'
    }
  }
}
```

Your test suite would then look something like this (using jest):

```typescript
import * as SillyLoggingModule from '@silly-suite/silly-logging';
import { MyClass } from './my-class';

function expectCalledWithArg(mock: jest.Mock, arg: unknown, nthCall = 0) {
  expect(mock.mock.calls[nthCall]).toEqual(expect.arrayContaining([arg]));
}

describe('Given class with logger', () => {
  let classUnderTest: MyClass;
  let logger: SillyLoggingModule.SillyLogger;
  let infoMock: jest.Mock;

  beforeEach(() => {
    infoMock = jest.fn();
    logger = {
      info: infoMock,
    } as unknown as SillyLoggingModule.SillyLogger;
    classUnderTest = new MyClass(logger);
  });

  describe('When invoking method decorated by LogOnArrival', () => {
    beforeEach(() => {
      classUnderTest.testLogOnArrival('pass123');
    });

    it('Then correct information is logged', () => {
      expectCalledWithArg(infoMock, {name: 'pass', value: '****'})
    });
  });
});
```

#### Mocking the Decorators

You can test your usage of the decorators by mocking them.

Suppose you had the same ```MyClass``` class defined in the documentation above. Your test suite would then look something like this (using jest):

```typescript
import * as SillyLoggingModule from '@silly-suite/silly-logging';
import { MyClass } from './my-class';
import { retrieveLoggerOnClass } from './retrieve-logger.util';
const mockLogOnArrival = (
  SillyLoggingModule as unknown as { logOnArrivalSpy: jest.Mock }
).logOnArrivalSpy;

jest.mock('@silly-suite/silly-logging', () => {
  const logOnArrivalSpy = jest.fn();
  return {
    LogOnArrival: (loggerFactory: unknown, options: unknown) => {
      return (_target: unknown, propertyKey: unknown, descriptor: unknown) => {
        logOnArrivalSpy(propertyKey, loggerFactory, options);
        return descriptor;
      };
    },
    logOnArrivalSpy,
  };
});

jest.mock('./mask-password.util.ts', () => {
  return {
    maskPassword: (name: string) => name,
  };
});

describe('Given class with logger', () => {
  beforeEach(() => {
    new MyClass({} as unknown as SillyLoggingModule.SillyLogger);
  });

  it('Then decorator used correctly', () => {
    expect(mockLogOnArrival).toHaveBeenCalledWith(
      'testLogOnArrival',
      retrieveLoggerOnClass,
      {
        argMappings: ['pass'],
      }
    );
  });
});
```