declare module 'daff' {
  export class TableView {
    constructor(data: any[][]);
    height: number;
    width: number;
    getCell(c: number, r: number): any;
    setCell(c: number, r: number, value: any): void;
  }

  export class CompareFlags {
    constructor();
  }

  export function compareTables(
    a: TableView,
    b: TableView,
    flags?: CompareFlags,
  ): { align(): any };

  export class TableDiff {
    constructor(alignment: any, flags?: CompareFlags);
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
