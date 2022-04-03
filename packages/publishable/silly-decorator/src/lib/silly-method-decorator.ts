export interface DecoratedMethodData<C, A, T> {
  thiz: C;
  args: A;
  target: T;
  propertyKey: string;
}

export type DecoratedMethodParamFactory<P, C, A, T> = (
  data: DecoratedMethodData<C, A, T>
) => P;
