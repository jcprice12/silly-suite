export interface DecoratedMethodData {
  thiz: any;
  args: any;
  target: any;
  propertyKey: string;
}

export type DecoratedMethodParamFactory<P> = (
  data: DecoratedMethodData
) => P;
