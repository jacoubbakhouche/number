export interface Service {
    id: string;
    name: string;
    icon: string;
    price: number;
}

export interface Country {
    id: number;
    name: string;
    flag: string;
}

export interface TwilioNumber {
    phoneNumber: string;
    friendlyName: string;
    region: string;
    price: number;
    capabilities: {
        sms: boolean;
        mms: boolean;
        voice: boolean;
    };
    beta: boolean; // Some numbers are beta/instant
    type?: string; // Monthly, Instant, etc.
}

export interface Order {
    id: string;
    phoneNumber: string;
    serviceId: string;
    countryId: number;
    status: 'PENDING' | 'READY' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
    code?: string;
    createdAt: number;
    expiresAt: number;
}
