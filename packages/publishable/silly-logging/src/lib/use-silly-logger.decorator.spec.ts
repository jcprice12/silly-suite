import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SillyLogger } from './silly-logger';
import {
  Log,
  LogAfterAsyncBehavior,
  LogOnArrival,
  LogOnError,
  LogOnResult,
} from './use-silly-logger.decorator';

function createLogAttribute(name: string, value: unknown) {
  return {
    name,
    value,
  };
}

describe('Given logger', () => {
  let errorSpy: jest.Mock;
  let infoSpy: jest.Mock;
  let logger: SillyLogger;
  const logRetriever = () => logger;
  beforeEach(() => {
    infoSpy = jest.fn();
    errorSpy = jest.fn();
    logger = {
      info: infoSpy,
      error: errorSpy,
    } as unknown as SillyLogger;
  });

  describe('Given things to log', () => {
    interface ArbitraryInterface {
      arb: string;
    }
    class ArbitraryClass {
      constructor(private readonly arb: string) {}
      public arbitrate(): string {
        return this.arb;
      }
    }

    let arbitraryString: string;
    let arbitraryNumber: number;
    let arbitraryBoolean: boolean;
    let arbitraryFunction: (arb: string) => string;
    let arbitraryObj: ArbitraryInterface;
    let arbitraryInstance: ArbitraryClass;

    beforeEach(() => {
      arbitraryString = 'hola';
      arbitraryBoolean = true;
      arbitraryNumber = 42;
      arbitraryFunction = (arb: string) => arb;
      arbitraryObj = {
        arb: 'hello',
      };
      arbitraryInstance = new ArbitraryClass('hi');
    });

    describe('Given static method that is decorated', () => {
      const thingToReturn = 'yooo';
      class ClassToTest {
        @LogOnArrival(logRetriever)
        static testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return thingToReturn;
        }
      }

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = ClassToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(thingToReturn);
        });
      });
    });

    describe('Given default LogOnArrival options', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnArrival(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given arg mappings for LogOnArrival', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnArrival(logRetriever, {
          argMappings: [
            null,
            'arbNumber',
            (arg: boolean) => ({ name: 'arbBool', value: !arg }),
          ],
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arbNumber', arbitraryNumber),
            createLogAttribute('arbBool', !arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given arrival message for LogOnArrival', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnArrival(logRetriever, {
          arrivalMessage: 'hello world',
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'hello world',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given default LogOnResult options', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('result', result),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given arg mappings for LogOnResult', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever, {
          argMappings: [
            null,
            'arbNumber',
            (arg: boolean) => ({ name: 'arbBool', value: !arg }),
          ],
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('result', result),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arbNumber', arbitraryNumber),
            createLogAttribute('arbBool', !arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given result mapping for LogOnResult', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever, {
          resultMapping: (result: string) => ({
            name: 'returnValue',
            value: `I (${result}) am the result`,
          }),
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('returnValue', 'I (yooo) am the result'),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given success message for LogOnResult', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever, {
          successMessage: 'I am successful',
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'I am successful',
            createLogAttribute('result', result),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given would like to wait for non-promise-returning method decorated with LogOnResult', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever, {
          shouldWait: true,
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('result', result),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given would like to wait for promise-returning method decorated with LogOnResult', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever, {
          shouldWait: true,
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Promise<string> {
          return Promise.resolve(this.classField);
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(async () => {
          result = await classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated after promise resolves', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('result', result),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is resolved', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given would like to wait for observable-returning method decorated with LogOnResult', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever, {
          shouldWait: true,
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Observable<string> {
          return of(this.classField);
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let obs: Observable<string>;
        beforeEach(() => {
          obs = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated after observable completes', (done) => {
          obs.subscribe((result) => {
            expect(infoSpy).toHaveBeenCalledWith(
              'successful method execution',
              createLogAttribute('result', result),
              createLogAttribute('class', 'ClassToTest'),
              createLogAttribute('method', 'testLogging'),
              createLogAttribute('arg1', arbitraryString),
              createLogAttribute('arg2', arbitraryNumber),
              createLogAttribute('arg3', arbitraryBoolean),
              createLogAttribute('arg4', arbitraryFunction),
              createLogAttribute('arg5', arbitraryInstance),
              createLogAttribute('arg6', arbitraryObj)
            );
            done();
          });
        });

        it('Then original return value is yielded', (done) => {
          obs.subscribe((result) => {
            expect(result).toBe(constructorArg);
            done();
          });
        });
      });
    });

    describe('Given would not like to wait for promise-returning method decorated with LogOnResult', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever, {
          shouldWait: false, //default but making clear for purpose of test
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Promise<string> {
          return Promise.resolve(this.classField);
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: Promise<string>;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then log is generated when promise is returned rather than after promise resolves', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('result', result),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then promise returned and value can be resolved', () => {
          return result.then((val) => {
            expect(val).toBe(constructorArg);
          });
        });
      });
    });

    describe('Given would not like to wait for observable-returning method decorated with LogOnResult', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogOnResult(logRetriever, {
          shouldWait: false, //default but making clear for purpose of test
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Observable<string> {
          return of(this.classField);
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let obs: Observable<string>;
        beforeEach(() => {
          obs = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated after observable completes', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('result', obs),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is yielded', (done) => {
          obs.subscribe((result) => {
            expect(result).toBe(constructorArg);
            done();
          });
        });
      });
    });

    describe('Given default LogOnError options', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): void {
          throw this.error;
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let thrownError: Error;
        beforeEach(() => {
          try {
            classToTest.testLogging(
              arbitraryString,
              arbitraryNumber,
              arbitraryBoolean,
              arbitraryFunction,
              arbitraryInstance,
              arbitraryObj
            );
          } catch (e) {
            thrownError = e as Error;
          }
        });

        it('Then correct log is generated', () => {
          expect(errorSpy).toHaveBeenCalledWith(
            'unsuccessful method execution',
            createLogAttribute('error', thrownError.message),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original error is thrown', () => {
          expect(thrownError).toBe(errorToThrow);
        });
      });
    });

    describe('Given arg mappings for LogOnError', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever, {
          argMappings: [
            null,
            'arbNumber',
            (arg: boolean) => ({ name: 'arbBool', value: !arg }),
          ],
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): void {
          throw this.error;
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let thrownError: Error;
        beforeEach(() => {
          try {
            classToTest.testLogging(
              arbitraryString,
              arbitraryNumber,
              arbitraryBoolean,
              arbitraryFunction,
              arbitraryInstance,
              arbitraryObj
            );
          } catch (e) {
            thrownError = e as Error;
          }
        });

        it('Then correct log is generated', () => {
          expect(errorSpy).toHaveBeenCalledWith(
            'unsuccessful method execution',
            createLogAttribute('error', thrownError.message),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arbNumber', arbitraryNumber),
            createLogAttribute('arbBool', !arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original error is thrown', () => {
          expect(thrownError).toBe(errorToThrow);
        });
      });
    });

    describe('Given error mapping for LogOnError', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever, {
          errorMapping: (e: Error) => ({ name: 'err', value: e.stack }),
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): void {
          throw this.error;
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let thrownError: Error;
        beforeEach(() => {
          try {
            classToTest.testLogging(
              arbitraryString,
              arbitraryNumber,
              arbitraryBoolean,
              arbitraryFunction,
              arbitraryInstance,
              arbitraryObj
            );
          } catch (e) {
            thrownError = e as Error;
          }
        });

        it('Then correct log is generated', () => {
          expect(errorSpy).toHaveBeenCalledWith(
            'unsuccessful method execution',
            createLogAttribute('err', thrownError.stack),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original error is thrown', () => {
          expect(thrownError).toBe(errorToThrow);
        });
      });
    });

    describe('Given error message for LogOnError', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever, {
          errorMessage: 'I have errored',
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): void {
          throw this.error;
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let thrownError: Error;
        beforeEach(() => {
          try {
            classToTest.testLogging(
              arbitraryString,
              arbitraryNumber,
              arbitraryBoolean,
              arbitraryFunction,
              arbitraryInstance,
              arbitraryObj
            );
          } catch (e) {
            thrownError = e as Error;
          }
        });

        it('Then correct log is generated', () => {
          expect(errorSpy).toHaveBeenCalledWith(
            'I have errored',
            createLogAttribute('error', thrownError.message),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original error is thrown', () => {
          expect(thrownError).toBe(errorToThrow);
        });
      });
    });

    describe('Given would like to wait for non-promise-returning method decorated with LogOnError', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever, {
          shouldWait: true,
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): void {
          throw this.error;
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let thrownError: Error;
        beforeEach(() => {
          try {
            classToTest.testLogging(
              arbitraryString,
              arbitraryNumber,
              arbitraryBoolean,
              arbitraryFunction,
              arbitraryInstance,
              arbitraryObj
            );
          } catch (e) {
            thrownError = e as Error;
          }
        });

        it('Then correct log is generated', () => {
          expect(errorSpy).toHaveBeenCalledTimes(1);
          expect(errorSpy).toHaveBeenCalledWith(
            'unsuccessful method execution',
            createLogAttribute('error', thrownError.message),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original error is thrown', () => {
          expect(thrownError).toBe(errorToThrow);
        });
      });
    });

    describe('Given would like to wait for promise-returning method decorated with LogOnError', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever, {
          shouldWait: true,
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Promise<void> {
          return Promise.reject(this.error);
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let thrownError: Error;
        beforeEach(async () => {
          try {
            await classToTest.testLogging(
              arbitraryString,
              arbitraryNumber,
              arbitraryBoolean,
              arbitraryFunction,
              arbitraryInstance,
              arbitraryObj
            );
          } catch (e) {
            thrownError = e as Error;
          }
        });

        it('Then correct log is generated', () => {
          expect(errorSpy).toHaveBeenCalledTimes(1);
          expect(errorSpy).toHaveBeenCalledWith(
            'unsuccessful method execution',
            createLogAttribute('error', thrownError.message),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original error is rejected', () => {
          expect(thrownError).toBe(errorToThrow);
        });
      });
    });

    describe('Given would like to wait for observable-returning method decorated with LogOnError', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever, {
          shouldWait: true,
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Observable<never> {
          return throwError(this.error);
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let obs: Observable<never>;
        beforeEach(() => {
          obs = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated after observable completes', (done) => {
          obs.subscribe(
            () => {
              fail('observable should emit error');
            },
            (err) => {
              expect(errorSpy).toHaveBeenCalledTimes(1);
              expect(errorSpy).toHaveBeenCalledWith(
                'unsuccessful method execution',
                createLogAttribute('error', err.message),
                createLogAttribute('class', 'ClassToTest'),
                createLogAttribute('method', 'testLogging'),
                createLogAttribute('arg1', arbitraryString),
                createLogAttribute('arg2', arbitraryNumber),
                createLogAttribute('arg3', arbitraryBoolean),
                createLogAttribute('arg4', arbitraryFunction),
                createLogAttribute('arg5', arbitraryInstance),
                createLogAttribute('arg6', arbitraryObj)
              );
              done();
            }
          );
        });

        it('Then original error is thrown', (done) => {
          obs.subscribe(
            () => {
              fail('observable should emit error');
            },
            (err) => {
              expect(err).toBe(errorToThrow);
              done();
            }
          );
        });
      });
    });

    describe('Given would not like to wait for promise-returning method decorated with LogOnError', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever, {
          shouldWait: false,
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Promise<void> {
          return Promise.reject(this.error);
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let promise: Promise<void>;
        beforeEach(() => {
          promise = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then no log is generated', () => {
          expect(errorSpy).not.toHaveBeenCalled();
          return promise.catch((e) => e);
        });

        it('Then promise is returned and will reject with original error', async () => {
          try {
            await promise;
            fail('an error should have been thrown');
          } catch (e) {
            expect(e).toBe(errorToThrow);
          }
        });
      });
    });

    describe('Given would not like to wait for observable-returning method decorated with LogOnError', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogOnError(logRetriever, {
          shouldWait: false,
        })
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Observable<never> {
          return throwError(this.error);
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let obs: Observable<never>;
        beforeEach(() => {
          obs = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then no log is generated', (done) => {
          expect(errorSpy).not.toHaveBeenCalled();
          obs.pipe(catchError((e) => e)).subscribe(
            () => {
              fail('observable should emit error');
            },
            () => {
              done();
            }
          );
        });

        it('Then original error is thrown', (done) => {
          obs.subscribe(
            () => {
              fail('observable should emit error');
            },
            (err) => {
              expect(err).toBe(errorToThrow);
              done();
            }
          );
        });
      });
    });

    describe('Given method decorated with Log that will execute successfully', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @Log(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): string {
          return this.classField;
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(() => {
          result = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated on arrival', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then correct log is generated on result', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('result', result),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is returned', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given method decorated with Log that will throw an error', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @Log(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): void {
          throw this.error;
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let thrownError: Error;
        beforeEach(() => {
          try {
            classToTest.testLogging(
              arbitraryString,
              arbitraryNumber,
              arbitraryBoolean,
              arbitraryFunction,
              arbitraryInstance,
              arbitraryObj
            );
          } catch (e) {
            thrownError = e as Error;
          }
        });

        it('Then correct log is generated on arrival', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then correct log is generated when error is thrown', () => {
          expect(errorSpy).toHaveBeenCalledWith(
            'unsuccessful method execution',
            createLogAttribute('error', thrownError.message),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original error is thrown', () => {
          expect(thrownError).toBe(errorToThrow);
        });
      });
    });

    describe('Given method decorated with LogAfterAsyncBehavior that returns a promise that will resolve', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogAfterAsyncBehavior(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Promise<string> {
          return Promise.resolve(this.classField);
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let result: string;
        beforeEach(async () => {
          result = await classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated on arrival', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then correct log is generated after promise resolves', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'successful method execution',
            createLogAttribute('result', result),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original return value is resolved', () => {
          expect(result).toBe(constructorArg);
        });
      });
    });

    describe('Given method decorated with LogAfterAsyncBehavior that returns a promise that will reject', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogAfterAsyncBehavior(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Promise<void> {
          return Promise.reject(this.error);
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let thrownError: Error;
        beforeEach(async () => {
          try {
            await classToTest.testLogging(
              arbitraryString,
              arbitraryNumber,
              arbitraryBoolean,
              arbitraryFunction,
              arbitraryInstance,
              arbitraryObj
            );
          } catch (e) {
            thrownError = e as Error;
          }
        });

        it('Then correct log is generated on arrival', () => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then correct log is generated after promise rejects', () => {
          expect(errorSpy).toHaveBeenCalledTimes(1);
          expect(errorSpy).toHaveBeenCalledWith(
            'unsuccessful method execution',
            createLogAttribute('error', thrownError.message),
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
        });

        it('Then original error is rejected', () => {
          expect(thrownError).toBe(errorToThrow);
        });
      });
    });

    describe('Given method decorated with LogAfterAsyncBehavior that returns an observable that will complete successfully', () => {
      class ClassToTest {
        constructor(private readonly classField: string) {}
        @LogAfterAsyncBehavior(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Observable<string> {
          return of(this.classField);
        }
      }

      let constructorArg: string;
      let classToTest: ClassToTest;
      beforeEach(() => {
        constructorArg = 'yooo';
        classToTest = new ClassToTest(constructorArg);
      });

      describe('When invoking method', () => {
        let obs: Observable<string>;
        beforeEach(() => {
          obs = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated on arrival', (done) => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
          obs.subscribe(() => {
            done();
          });
        });

        it('Then correct log is generated after observable completes', (done) => {
          obs.subscribe((result) => {
            expect(infoSpy).toHaveBeenCalledWith(
              'successful method execution',
              createLogAttribute('result', result),
              createLogAttribute('class', 'ClassToTest'),
              createLogAttribute('method', 'testLogging'),
              createLogAttribute('arg1', arbitraryString),
              createLogAttribute('arg2', arbitraryNumber),
              createLogAttribute('arg3', arbitraryBoolean),
              createLogAttribute('arg4', arbitraryFunction),
              createLogAttribute('arg5', arbitraryInstance),
              createLogAttribute('arg6', arbitraryObj)
            );
            done();
          });
        });

        it('Then original return value is yielded', (done) => {
          obs.subscribe((result) => {
            expect(result).toBe(constructorArg);
            done();
          });
        });
      });
    });

    describe('Given method decorated with LogAfterAsyncBehavior that returns an observable that will not complete successfully', () => {
      class ClassToTest {
        constructor(private readonly error: Error) {}
        @LogAfterAsyncBehavior(logRetriever)
        testLogging(
          _p1: string,
          _p2: number,
          _p3: boolean,
          _p4: (arb: string) => string,
          _p5: ArbitraryClass,
          _p6: ArbitraryInterface
        ): Observable<never> {
          return throwError(this.error);
        }
      }

      let errorToThrow: Error;
      let classToTest: ClassToTest;
      beforeEach(() => {
        errorToThrow = new Error('err');
        classToTest = new ClassToTest(errorToThrow);
      });

      describe('When invoking method', () => {
        let obs: Observable<never>;
        beforeEach(() => {
          obs = classToTest.testLogging(
            arbitraryString,
            arbitraryNumber,
            arbitraryBoolean,
            arbitraryFunction,
            arbitraryInstance,
            arbitraryObj
          );
        });

        it('Then correct log is generated on arrival', (done) => {
          expect(infoSpy).toHaveBeenCalledWith(
            'method invoked',
            createLogAttribute('class', 'ClassToTest'),
            createLogAttribute('method', 'testLogging'),
            createLogAttribute('arg1', arbitraryString),
            createLogAttribute('arg2', arbitraryNumber),
            createLogAttribute('arg3', arbitraryBoolean),
            createLogAttribute('arg4', arbitraryFunction),
            createLogAttribute('arg5', arbitraryInstance),
            createLogAttribute('arg6', arbitraryObj)
          );
          obs.subscribe(
            () => {
              fail('observable should emit error');
            },
            () => {
              done();
            }
          );
        });

        it('Then correct log is generated after observable completes', (done) => {
          obs.subscribe(
            () => {
              fail('observable should emit error');
            },
            (err) => {
              expect(errorSpy).toHaveBeenCalledTimes(1);
              expect(errorSpy).toHaveBeenCalledWith(
                'unsuccessful method execution',
                createLogAttribute('error', err.message),
                createLogAttribute('class', 'ClassToTest'),
                createLogAttribute('method', 'testLogging'),
                createLogAttribute('arg1', arbitraryString),
                createLogAttribute('arg2', arbitraryNumber),
                createLogAttribute('arg3', arbitraryBoolean),
                createLogAttribute('arg4', arbitraryFunction),
                createLogAttribute('arg5', arbitraryInstance),
                createLogAttribute('arg6', arbitraryObj)
              );
              done();
            }
          );
        });

        it('Then original error is thrown', (done) => {
          obs.subscribe(
            () => {
              fail('observable should emit error');
            },
            (err) => {
              expect(err).toBe(errorToThrow);
              done();
            }
          );
        });
      });
    });
  });
});
