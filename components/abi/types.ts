export type TableMeta = {
  name: string;
  rows: number;
  cols: number;
};

export type QaResultRow = Record<string, any>;
export type EsSampleRow = QaResultRow; // optional alias

export type QaResponse = {
  insight?: string | null;
  result?: QaResultRow[] | null;
  error?: string | null;
};

export type Endpoint = {
  name: string;
  path_or_url: string;
  limit?: number | null;
};
