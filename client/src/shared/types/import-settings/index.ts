export type ImportMode = "copy" | "move";
export type DuplicatesMode = "skip" | "copy";

export interface ImportSettings {
  sourceFolderPath: string | null;
  importMode: ImportMode;
  duplicatesMode: DuplicatesMode;
}


