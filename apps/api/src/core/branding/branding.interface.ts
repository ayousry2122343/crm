export interface WorkspaceBranding {
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  companyName?: string;
}

export const DEFAULT_BRANDING: WorkspaceBranding = {
  primaryColor: '#3B82F6',
  secondaryColor: '#1E293B',
};
