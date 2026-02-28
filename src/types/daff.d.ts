declare module 'daff' {
  export class TableView {
    constructor(data: any[][]);
    height(): number;
    width(): number;
    getCell(c: number, r: number): any;
  }

  export function compareTables(
    a: TableView,
    b: TableView,
  ): { align(): any };

  export class TableDiff {
    constructor(alignment: any);
    hilite(output: TableView): void;
  }

  export class DiffRender {
    render(table: TableView): void;
    html(): string;
  }

  export class Merger {
    constructor(base: TableView, ours: TableView, theirs: TableView);
    apply(output: TableView): number;
  }
}
