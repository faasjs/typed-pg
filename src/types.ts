// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
export interface Tables { }

export type TableName = keyof Tables

export type TableType<T extends TableName | string = string> = T extends TableName ? Tables[T] : Record<string, any>

export type ColumnName<T extends TableName | string = string> = T extends keyof Tables ? keyof Tables[T] : string

export type ColumnValue<T extends TableName | string = string, C extends ColumnName<T> | string = string> = T extends TableName ? C extends keyof Tables[T] ? Tables[T][C] : any : any
