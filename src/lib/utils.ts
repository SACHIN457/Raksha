import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from '../firebase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const SAFETY_TIPS = [
  {
    title: "Stay Aware",
    content: "Always be aware of your surroundings, especially in unfamiliar or poorly lit areas."
  },
  {
    title: "Trust Your Instincts",
    content: "If a situation or person feels 'off', trust your gut and remove yourself from the situation immediately."
  },
  {
    title: "Share Your Location",
    content: "When traveling alone, share your real-time location with a trusted friend or family member."
  },
  {
    title: "Keep Emergency Contacts Ready",
    content: "Ensure your emergency contacts are updated in the Rakshak app for quick access during SOS."
  }
];

export const LEGAL_RESOURCES = `
### Important Laws for Women's Safety in India

1. **Section 354 of IPC**: Deals with assault or criminal force to a woman with intent to outrage her modesty.
2. **Section 354A**: Sexual harassment and punishment for sexual harassment.
3. **Section 354C**: Voyeurism.
4. **Section 354D**: Stalking.
5. **The Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013**.
6. **Protection of Women from Domestic Violence Act, 2005**.

**Emergency Numbers:**
- Women Helpline: 1091
- Police: 100
- Domestic Abuse Helpline: 181
`;
