// src/lib/logger.ts
const PREFIX_DB = '[db]';
const PREFIX_UI = '[ui]';

export const dbLog = (...args: any[]) => {
  if (
    typeof __DEV__ !== 'undefined'
      ? __DEV__
      : process.env.NODE_ENV !== 'production'
  ) {
    console.log(PREFIX_DB, ...args);
  }
};

export const dbInfo = (...args: any[]) => {
  console.info(PREFIX_DB, ...args);
};

export const dbWarn = (...args: any[]) => {
  console.warn(PREFIX_DB, ...args);
};

export const dbError = (...args: any[]) => {
  console.error(PREFIX_DB, ...args);
};

export const uiLog = (...args: any[]) => {
  if (
    typeof __DEV__ !== 'undefined'
      ? __DEV__
      : process.env.NODE_ENV !== 'production'
  ) {
    console.log(PREFIX_UI, ...args);
  }
};

export default {
  dbLog,
  dbInfo,
  dbWarn,
  dbError,
  uiLog,
};