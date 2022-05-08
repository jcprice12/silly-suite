import { DecoratedMethodParamFactory } from '@silly-suite/silly-decorator';
import { isPromise } from '@silly-suite/silly-promise-check';
import { isObservable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SillyLogAttribute } from './silly-log-attribute';
import { SillyLogAttributeFactory } from './silly-log-attribute.factory';
import { SillyLogger } from './silly-logger';

type Target = {
  name?: string;
  constructor: { name: string };
};
type DefinedSillyLogMapping = string | SillyLogAttributeFactory;
export type SillyLogMapping = null | DefinedSillyLogMapping;

export type LogOnArrivalDecoratorOptions = {
  arrivalMessage?: string;
  argMappings?: Array<SillyLogMapping>;
};
export function LogOnArrival(
  getLogger: DecoratedMethodParamFactory<SillyLogger>,
  options: LogOnArrivalDecoratorOptions = {}
) {
  const finalOptions: Required<LogOnArrivalDecoratorOptions> = {
    argMappings: finalizeOption(options.argMappings, []),
    arrivalMessage: finalizeOption(options.arrivalMessage, 'method invoked'),
  };
  return function (
    target: Target,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: function (original, thiz: unknown, args: Array<unknown>) {
        const decoratedMethodData = {
          thiz,
          target,
          propertyKey,
          args,
        };
        getLogger(decoratedMethodData).info(
          finalOptions.arrivalMessage,
          ...initializeLogAttributes(
            target,
            propertyKey,
            args,
            finalOptions.argMappings
          )
        );
        return original.apply(thiz, args);
      },
    });
  };
}

export type LogOnErrorOptions = {
  argMappings?: Array<SillyLogMapping>;
  errorMapping?: SillyLogMapping;
  errorMessage?: string;
  shouldWait?: boolean;
};
export function LogOnError(
  getLogger: DecoratedMethodParamFactory<SillyLogger>,
  options: LogOnErrorOptions = {}
) {
  const finalOptions: Omit<Required<LogOnErrorOptions>, 'errorMapping'> & {
    errorMapping: DefinedSillyLogMapping;
  } = {
    argMappings: finalizeOption(options.argMappings, []),
    errorMapping: finalizeOption(options.errorMapping, (error: Error) => ({
      name: 'error',
      value: error.message,
    })),
    errorMessage: finalizeOption(
      options.errorMessage,
      'unsuccessful method execution'
    ),
    shouldWait: finalizeOption(options.shouldWait, false),
  };
  return function (
    target: Target,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: function (original, thiz: unknown, args: Array<unknown>) {
        const decoratedMethodData = {
          thiz,
          target,
          propertyKey,
          args,
        };
        const logger = getLogger(decoratedMethodData);
        const logAttributes = initializeLogAttributes(
          target,
          propertyKey,
          args,
          finalOptions.argMappings
        );
        function onFailure(e: unknown) {
          const errorLogAttribute = mapToLogAttribute(
            e,
            finalOptions.errorMapping
          );
          logger.error(
            finalOptions.errorMessage,
            { name: errorLogAttribute.name, value: errorLogAttribute.value },
            ...logAttributes
          );
          throw e;
        }
        try {
          const result = original.apply(thiz, args);
          if (finalOptions.shouldWait && isPromise(result)) {
            return result.then(
              (valToResolve: unknown) => valToResolve,
              (e: unknown) => onFailure(e)
            );
          } else if (finalOptions.shouldWait && isObservable(result)) {
            return result.pipe(catchError((e) => onFailure(e) as never));
          }
          return result;
        } catch (e) {
          onFailure(e);
        }
      },
    });
  };
}

export type LogOnResultOptions = {
  argMappings?: Array<SillyLogMapping>;
  resultMapping?: SillyLogMapping;
  successMessage?: string;
  shouldWait?: boolean;
};
export function LogOnResult(
  getLogger: DecoratedMethodParamFactory<SillyLogger>,
  options: LogOnResultOptions = {}
) {
  const finalOptions: Omit<Required<LogOnResultOptions>, 'resultMapping'> & {
    resultMapping: DefinedSillyLogMapping;
  } = {
    argMappings: finalizeOption(options.argMappings, []),
    resultMapping: finalizeOption(options.resultMapping, 'result'),
    successMessage: finalizeOption(
      options.successMessage,
      'successful method execution'
    ),
    shouldWait: finalizeOption(options.shouldWait, false),
  };
  return function (
    target: Target,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: function (original, thiz: unknown, args: Array<unknown>) {
        const decoratedMethodData = {
          thiz,
          target,
          propertyKey,
          args: args,
        };
        const logger = getLogger(decoratedMethodData);
        const logAttributes = initializeLogAttributes(
          target,
          propertyKey,
          args,
          finalOptions.argMappings
        );
        function onSuccess(result: unknown): unknown {
          const resultLogAttribute = mapToLogAttribute(
            result,
            finalOptions.resultMapping
          );
          logger.info(
            finalOptions.successMessage,
            { name: resultLogAttribute.name, value: resultLogAttribute.value },
            ...logAttributes
          );
          return result;
        }
        const result = original.apply(thiz, args);
        if (finalOptions.shouldWait && isPromise(result)) {
          return result.then((val: unknown) => onSuccess(val));
        } else if (finalOptions.shouldWait && isObservable(result)) {
          return result.pipe(tap((val: unknown) => onSuccess(val)));
        } else {
          return onSuccess(result);
        }
      },
    });
  };
}

export type LogDecoratorOptions = {
  shouldWait?: boolean;
  arrivalMessage?: string;
  argMappings?: Array<SillyLogMapping>;
  resultMapping?: SillyLogMapping;
  successMessage?: string;
  errorMapping?: SillyLogMapping;
  errorMessage?: string;
};
export function Log(
  getLogger: DecoratedMethodParamFactory<SillyLogger>,
  options?: LogDecoratorOptions
) {
  const logOnArrivalFn = LogOnArrival(getLogger, options);
  const logOnResultFn = LogOnResult(getLogger, options);
  const logOnErrorFn = LogOnError(getLogger, options);
  return function (
    target: Target,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    logOnArrivalFn(target, propertyKey, descriptor);
    logOnResultFn(target, propertyKey, descriptor);
    logOnErrorFn(target, propertyKey, descriptor);
  };
}

export function LogAfterAsyncBehavior(
  getLogger: DecoratedMethodParamFactory<SillyLogger>,
  options: Omit<LogDecoratorOptions, 'shouldWait'> = {}
) {
  return Log(getLogger, { ...options, shouldWait: true });
}

function finalizeOption<T>(option: unknown, defaultVal: unknown): T {
  return (option ?? defaultVal) as T;
}

function getClassNameFromTarget(target: {
  name?: string;
  constructor: { name: string };
}): string {
  return target.name ?? target.constructor.name;
}

function initializeLogAttributes(
  target: {
    name?: string;
    constructor: { name: string };
  },
  propertyKey: string,
  args: Array<unknown>,
  argMappings: Array<SillyLogMapping>
) {
  return [
    { name: 'class', value: getClassNameFromTarget(target) },
    { name: 'method', value: propertyKey },
    ...mapArgsToLogAttributes(args, argMappings),
  ];
}

function mapToLogAttribute(value: unknown, mapping: DefinedSillyLogMapping) {
  return typeof mapping === 'string'
    ? { name: mapping, value }
    : mapping(value);
}

function mapArgsToLogAttributes(
  args: Array<unknown>,
  argMappings: Array<SillyLogMapping>
): Array<SillyLogAttribute> {
  return args.map((arg, index) =>
    mapToLogAttribute(arg, argMappings[index] ?? `arg${index + 1}`)
  );
}
