// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
export interface Tables {}

export type TableName = Extract<keyof Tables, string>

export type TableType<T extends string = string> = T extends TableName
  ? Tables[T]
  : Record<string, any>

export type ColumnName<T extends string = string> = T extends keyof Tables
  ? Extract<keyof Tables[T], string>
  : string

export type ColumnValue<T extends string = string, C extends string = string> = T extends TableName
  ? C extends keyof Tables[T]
    ? Tables[T][C]
    : any
  : any
