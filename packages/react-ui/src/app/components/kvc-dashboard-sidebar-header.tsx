import { t } from 'i18next';
import { Link } from 'react-router-dom';

import { useEmbedding } from '@/components/embed-provider';
import { Button } from '@/components/ui/button';
import { SidebarHeader } from '@/components/ui/sidebar-shadcn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProjectSwitcher } from '@/features/projects/components/project-switcher';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { flagsHooks } from '@/hooks/flags-hooks';
import { cn, determineDefaultRoute } from '@/lib/utils';
// KVC Change: Using KVC specific types if they exist, else aliasing.
// Assuming ApEdition and ApFlagId are generic enough or will be replaced globally.
import { ApEdition, ApFlagId } from '@kvc/shared'; // Potential KVC Path

import { SidebarInviteUserButton } from './sidebar-invite-user';

// KVC Change: Renaming component to reflect KVC branding
const KVCDashboardSidebarHeader = ({
  isHomeDashboard,
}: {
  isHomeDashboard: boolean;
}) => {
  const branding = flagsHooks.useWebsiteBranding(); // This hook should ideally return KVC branding data
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const { embedState } = useEmbedding();
  const showProjectSwitcher =
    edition !== ApEdition.COMMUNITY && !embedState.isEmbedded;
  const defaultRoute = determineDefaultRoute(useAuthorization().checkAccess);

  // KVC Enhancement: Define KVC logo URLs, perhaps from a config or branding hook
  const kvcLogoIconUrl = branding.logos.logoIconUrl; // Replace with actual KVC icon URL
  const kvcFullLogoUrl = branding.logos.fullLogoUrl; // Replace with actual KVC full logo URL
  const kvcHomeAltText = t('KVC Home'); // KVC Change: Brand voice update

  return (
    <SidebarHeader className="pb-0 ">
      <div
        className={cn('flex items-center justify-between pr-1', {
          'justify-center': !showProjectSwitcher,
        })}
      >
        <div className="flex items-center justify-center gap-1 grow">
          <div className="relative">
            <Button variant="ghost" aria-label={kvcHomeAltText}>
              <Link
                to={isHomeDashboard ? defaultRoute : '/platform'}
                className="flex items-center justify-center"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    {showProjectSwitcher ? (
                      <img
                        src={kvcLogoIconUrl} // KVC Change
                        alt={kvcHomeAltText} // KVC Change
                        width={28}
                        height={28}
                        className=" max-h-[28px] max-w-[28px] object-contain"
                        style={{ filter: 'brightness(0) invert(1)' }} // KVC Style: Example for neon effect on dark bg
                      />
                    ) : (
                      <img
                        src={kvcFullLogoUrl} // KVC Change
                        alt={kvcHomeAltText} // KVC Change
                        width={160}
                        height={51}
                        className="max-h-[51px] max-w-[160px] object-contain"
                        // KVC Style: Consider adding a subtle neon glow via CSS filter if appropriate
                      />
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{kvcHomeAltText}</TooltipContent>
                </Tooltip>
              </Link>
            </Button>
            {!showProjectSwitcher && (
              <div className="absolute -right-7 top-1">
                <SidebarInviteUserButton />
              </div>
            )}
          </div>

          {showProjectSwitcher && (
            <div className="grow ">
              <ProjectSwitcher /> {/* This component might also need rebranding internally */}
            </div>
          )}
        </div>

        {showProjectSwitcher && <SidebarInviteUserButton />}
      </div>
    </SidebarHeader>
  );
};

KVCDashboardSidebarHeader.displayName = 'KVCDashboardSidebarHeader'; // KVC Change

export { KVCDashboardSidebarHeader as ApDashboardSidebarHeader }; // KVC Change: Exporting with new name, aliasing for compatibility if needed
