export type AnyRow = Record<string, any>;

export type Column<T extends AnyRow> = {
  label: string;
  align?: "left" | "right";
  cell: (row: T) => string;
};

