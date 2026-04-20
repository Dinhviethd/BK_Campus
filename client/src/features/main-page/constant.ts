/** Khu vực trong trường — đồng bộ với backend enum location */
export const LOCATIONS = [
  { id: 'all', label: 'Tất cả khu vực' },
  { id: 'Khu A', label: 'Khu A' },
  { id: 'Khu C', label: 'Khu C' },
  { id: 'Khu E', label: 'Khu E' },
  { id: 'Khu F', label: 'Khu F' },
  { id: 'Thư Viện', label: 'Thư Viện' },
  { id: 'Nhà Xe Khu F', label: 'Nhà Xe Khu F' },
  { id: 'Nhà Xe Khu E', label: 'Nhà Xe Khu E' },
  {id: 'Khu H', label: 'Khu H'},
] as const;

export type LocationId = (typeof LOCATIONS)[number]['id'];
