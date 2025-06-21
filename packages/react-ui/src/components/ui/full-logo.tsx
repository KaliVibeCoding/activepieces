import { t } from 'i18next';

import { flagsHooks } from '@/hooks/flags-hooks';

const KVCFullLogo = () => { // KVC: Renamed component
  const branding = flagsHooks.useWebsiteBranding(); // This should return KVC branding info

  // KVC: Ensure branding.logos.fullLogoUrl points to the KVC full logo.
  // KVC: Update alt text to be more descriptive and on-brand.
  return (
    <div className="h-[60px]">
      <img
        className="h-full object-contain" // KVC: Added object-contain for better scaling
        src={branding.logos.fullLogoUrl} // Should be KVC logo
        alt={t('KaliVibeCoding Full Logo')} // KVC: Updated alt text
      />
    </div>
  );
};
KVCFullLogo.displayName = 'KVCFullLogo'; // KVC: Renamed display name
export { KVCFullLogo as FullLogo }; // KVC: Export with new name, alias for compatibility
