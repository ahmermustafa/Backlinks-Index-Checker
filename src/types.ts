export interface Job {
  id: number;
  created_at: string;
  total_urls: number;
  indexed_count: number;
  not_indexed_count: number;
  redirected_count: number;
  error_count: number;
  current_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Backlink {
  id: number;
  job_id: number;
  url: string;
  index_status: string; // "Indexed ✅", "Not Indexed ❌", "Redirected ↪️", "Not Found ⚠️", "Error ❌"
  http_status: number | null;
  redirect_url: string | null;
  checked_at: string;
}

export interface JobDetailsResponse {
  success: boolean;
  job: Job;
  backlinks: Backlink[];
}

export interface JobsListResponse {
  success: boolean;
  jobs: Job[];
}

export interface CreateJobResponse {
  success: boolean;
  jobId: number;
  message: string;
}
