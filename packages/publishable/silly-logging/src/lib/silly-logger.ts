import { SillyLogAttribute } from './silly-log-attribute';

export type SillyLogPrinter = (
  message: string | SillyLogAttribute,
  ...args: Array<SillyLogAttribute>
) => void;

export interface SillyLogger {
  info: SillyLogPrinter;
  error: SillyLogPrinter;
}
