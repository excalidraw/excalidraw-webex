import { ENV } from "./constants";

export type ResolvablePromise<T> = Promise<T> & {
  resolve: [T] extends [undefined] ? (value?: T) => void : (value: T) => void;
  reject: (error: Error) => void;
};

export const resolvablePromise = <T>() => {
  let resolve!: any;
  let reject!: any;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  (promise as any).resolve = resolve;
  (promise as any).reject = reject;
  return promise as ResolvablePromise<T>;
};

export const loadScript = (filePath: string) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.onload = () => {
      resolve(filePath);
    };
    script.src = filePath;
    document.head.append(script);
  });
};

export const isDev = () => {
  return process.env.NODE_ENV === ENV.DEVELOPMENT;
};
