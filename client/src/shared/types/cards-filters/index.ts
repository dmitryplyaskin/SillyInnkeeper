export interface FilterOption {
  value: string;
  count: number;
}

export interface CardsFiltersResponse {
  creators: FilterOption[];
  spec_versions: FilterOption[];
  tags: FilterOption[];
  st_profiles: FilterOption[];
}
