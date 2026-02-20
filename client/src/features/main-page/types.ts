export interface Post {
  id: number;
  type: string;
  user: string;
  avatar: string;
  content: string;
  time: string;
  location: string;
  area: string;
  source: string;
  status: string;
  fbLink?: string;
}

export interface Location {
  id: string;
  label: string;
}