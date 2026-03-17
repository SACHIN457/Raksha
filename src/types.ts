export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber?: string;
  emergencyContacts: EmergencyContact[];
  createdAt: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface SOSAlert {
  id?: string;
  userId: string;
  userName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'resolved';
  timestamp: string;
}

export interface Incident {
  id?: string;
  reporterId: string;
  type: 'harassment' | 'unsafe-area' | 'theft' | 'other';
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  timestamp: string;
}
