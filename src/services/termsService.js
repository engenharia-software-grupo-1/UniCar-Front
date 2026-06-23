const TERMS_STORAGE_KEY = 'unicar.terms.acceptance';
const TERMS_VERSION = '1.0';

export function hasAcceptedTerms() {
  const acceptance = localStorage.getItem(TERMS_STORAGE_KEY);

  if (!acceptance) {
    return false;
  }

  try {
    const parsedAcceptance = JSON.parse(acceptance);

    return (
      parsedAcceptance.accepted === true &&
      parsedAcceptance.version === TERMS_VERSION
    );
  } catch {
    return false;
  }
}

export function acceptTerms() {
  const acceptance = {
    accepted: true,
    version: TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };

  localStorage.setItem(TERMS_STORAGE_KEY, JSON.stringify(acceptance));

  return acceptance;
}

export function getTermsVersion() {
  return TERMS_VERSION;
}