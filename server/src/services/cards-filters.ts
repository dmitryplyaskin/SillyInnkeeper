import Database from "better-sqlite3";
import { createDatabaseService, DatabaseService } from "./database";

export interface FilterOption {
  value: string;
  count: number;
}

export interface CardsFiltersResponse {
  creators: FilterOption[];
  spec_versions: FilterOption[];
  tags: FilterOption[];
}

export class CardsFiltersService {
  constructor(private dbService: DatabaseService) {}

  private buildLibraryWhere(libraryIds: string | string[]): {
    whereSql: string;
    params: string[];
  } {
    const ids = Array.isArray(libraryIds) ? libraryIds : [libraryIds];
    const clean = ids.map((s) => String(s).trim()).filter((s) => s.length > 0);
    if (clean.length === 0) return { whereSql: "1=0", params: [] };
    const placeholders = clean.map(() => "?").join(", ");
    return { whereSql: `c.library_id IN (${placeholders})`, params: clean };
  }

  getCreators(libraryIds: string | string[]): FilterOption[] {
    const lib = this.buildLibraryWhere(libraryIds);
    const sql = `
      SELECT 
        c.creator as value,
        COUNT(*) as count
      FROM cards c
      WHERE ${lib.whereSql} AND c.creator IS NOT NULL AND TRIM(c.creator) != ''
      GROUP BY c.creator
      ORDER BY count DESC, value COLLATE NOCASE ASC
    `;

    return this.dbService.query<FilterOption>(sql, lib.params);
  }

  getSpecVersions(libraryIds: string | string[]): FilterOption[] {
    const lib = this.buildLibraryWhere(libraryIds);
    const sql = `
      SELECT 
        c.spec_version as value,
        COUNT(*) as count
      FROM cards c
      WHERE ${lib.whereSql} AND c.spec_version IS NOT NULL AND TRIM(c.spec_version) != ''
      GROUP BY c.spec_version
      ORDER BY count DESC, value COLLATE NOCASE ASC
    `;

    return this.dbService.query<FilterOption>(sql, lib.params);
  }

  getTags(libraryIds: string | string[]): FilterOption[] {
    const lib = this.buildLibraryWhere(libraryIds);
    const sql = `
      SELECT 
        t.name as value,
        COUNT(DISTINCT ct.card_id) as count
      FROM tags t
      JOIN card_tags ct ON ct.tag_rawName = t.rawName
      JOIN cards c ON c.id = ct.card_id
      WHERE ${lib.whereSql}
      GROUP BY t.rawName, t.name
      ORDER BY count DESC, value COLLATE NOCASE ASC
    `;

    return this.dbService.query<FilterOption>(sql, lib.params);
  }

  getFilters(libraryIds: string | string[]): CardsFiltersResponse {
    return {
      creators: this.getCreators(libraryIds),
      spec_versions: this.getSpecVersions(libraryIds),
      tags: this.getTags(libraryIds),
    };
  }
}

export function createCardsFiltersService(
  db: Database.Database
): CardsFiltersService {
  const dbService = createDatabaseService(db);
  return new CardsFiltersService(dbService);
}
