export interface Project {
  id: string;
  name: string;
  location?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress?: number | null;
  completion?: number | null;
  completionPercentage?: number | null;
  completion_percentage?: number | null;
  percent_complete?: number | null;
  budget?: number | null;
  manager?: string | null;
  supervisor?: string | null;
  description?: string | null;
  image?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
}
