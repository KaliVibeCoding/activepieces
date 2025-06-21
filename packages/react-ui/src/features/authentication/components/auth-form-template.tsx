import { t } from 'i18next';
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { authenticationSession } from '@/lib/authentication-session';
import { useRedirectAfterLogin } from '@/lib/navigation-utils';
import {
  ApFlagId,
  ThirdPartyAuthnProvidersToShowMap,
} from '@activepieces/shared';

import { HorizontalSeparatorWithText } from '../../../components/ui/separator';
import { flagsHooks } from '../../../hooks/flags-hooks';

import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';
import { ThirdPartyLogin } from './third-party-logins';

const BottomNote = ({ isSignup }: { isSignup: boolean }) => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.toString();

  return isSignup ? (
    <div className="mb-4 text-center text-sm">
      {t('Already plugged into the Vibe?')} {/* KVC: Brand voice update */}
      <Link
        to={`/sign-in?${searchQuery}`}
        className="pl-1 text-muted-foreground hover:text-primary text-sm transition-all duration-200"
      >
        {t('Illuminate Session')} {/* KVC: Changed "Sign in" */}
      </Link>
    </div>
  ) : (
    <div className="mb-4 text-center text-sm">
      {t("New to the Neon Grid?")} {/* KVC: Brand voice update */}
      <Link
        to={`/sign-up?${searchQuery}`}
        className="pl-1 text-muted-foreground hover:text-primary text-sm transition-all duration-200"
      >
        {t('Create Your KVC Identity')} {/* KVC: Changed "Sign up" */}
      </Link>
    </div>
  );
};

const AuthSeparator = ({
  isEmailAuthEnabled,
}: {
  isEmailAuthEnabled: boolean;
}) => {
  const { data: thirdPartyAuthProviders } =
    flagsHooks.useFlag<ThirdPartyAuthnProvidersToShowMap>(
      ApFlagId.THIRD_PARTY_AUTH_PROVIDERS_TO_SHOW_MAP,
    );

  return (thirdPartyAuthProviders?.google || thirdPartyAuthProviders?.saml) &&
    isEmailAuthEnabled ? (
    <HorizontalSeparatorWithText className="my-4">
      {t('OR')}
    </HorizontalSeparatorWithText>
  ) : null;
};

const AuthFormTemplate = React.memo(
  ({ form }: { form: 'signin' | 'signup' }) => {
    const isSignUp = form === 'signup';
    const token = authenticationSession.getToken();
    const redirectAfterLogin = useRedirectAfterLogin();
    const [showCheckYourEmailNote, setShowCheckYourEmailNote] = useState(false);
    const { data: isEmailAuthEnabled } = flagsHooks.useFlag<boolean>(
      ApFlagId.EMAIL_AUTH_ENABLED,
    );
    const data = {
      signin: {
        title: t('Welcome Back to the Neon Grid!'), // KVC: Brand voice
        description: t('Enter your credentials to continue your KVC journey.'), // KVC: Brand voice
        showNameFields: false,
      },
      signup: {
        title: t('Join the KaliVibe!'), // KVC: Brand voice
        description: t('Create your KVC identity and electrify your workflow.'), // KVC: Brand voice
        showNameFields: true,
      },
    }[form];

    if (token) {
      redirectAfterLogin();
    }

    return (
      <Card className="w-[28rem] rounded-sm drop-shadow-xl">
        {!showCheckYourEmailNote && (
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{data.title}</CardTitle>
            <CardDescription>{data.description}</CardDescription>
          </CardHeader>
        )}

        <CardContent>
          {!showCheckYourEmailNote && <ThirdPartyLogin isSignUp={isSignUp} />}
          <AuthSeparator
            isEmailAuthEnabled={
              (isEmailAuthEnabled ?? true) && !showCheckYourEmailNote
            }
          ></AuthSeparator>
          {isEmailAuthEnabled ? (
            isSignUp ? (
              <SignUpForm
                setShowCheckYourEmailNote={setShowCheckYourEmailNote}
                showCheckYourEmailNote={showCheckYourEmailNote}
              />
            ) : (
              <SignInForm />
            )
          ) : null}
        </CardContent>

        <BottomNote isSignup={isSignUp}></BottomNote>
      </Card>
    );
  },
);

AuthFormTemplate.displayName = 'AuthFormTemplate';

export { AuthFormTemplate };
