export interface Service {
    id: string;
    name: string;
    icon: string;
    price: number;
}

export interface Country {
    id: number;
    name: string;
    code: string;
    iso: string;
    price: number;
}

export interface TwilioNumber {
    phoneNumber: string;
    friendlyName?: string;
    country?: string; // ISO Code
    region?: string;
    price: number;
    capabilities: {
        SMS: boolean;
        MMS: boolean;
        voice: boolean;
        sms?: boolean; // support lowercase variant
        mms?: boolean;
    };
    beta?: boolean;
    type?: string;
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
    messages?: {
        id: string;
        body: string;
        date: number;
        sender: string;
        status?: string;
        errorCode?: number;
        errorMessage?: string;
    }[];
}
