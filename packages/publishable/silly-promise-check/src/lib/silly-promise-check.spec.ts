import { isPromise } from './silly-promise-check';

function is_promise(expected: boolean) {
  return (result: boolean) => {
    expect(result).toBe(expected);
  };
}

describe.each`
  val                              | type          | expectation
  ${new Promise<void>((r) => r())} | ${'promise'}  | ${is_promise(true)}
  ${42}                            | ${'number'}   | ${is_promise(false)}
  ${() => 42}                      | ${'function'} | ${is_promise(false)}
  ${{ foo: 'bar' }}                | ${'object'}   | ${is_promise(false)}
`('Given value of type "$type"', ({ val, expectation }) => {
  describe('When checking if it is a promise', () => {
    let result: boolean;
    beforeEach(() => {
      result = isPromise(val);
    });

    it('Then it is correctly iudentified to be either a promise or not a promise', () => {
      expectation(result);
    });
  });
});
