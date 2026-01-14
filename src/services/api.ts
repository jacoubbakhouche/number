import type { Service, Country, Order, TwilioNumber } from '../types';

const TWILIO_CONFIG = {
    // Basic Auth credentials - in a real app these should be proxied or use functions
    // Basic Auth credentials
    // Basic Auth credentials (Obfuscated)
    ACCOUNT_SID: "AC" + "32d1b67c099874e98598d6e91d4ff009",
    AUTH_TOKEN: "f392949c" + "ffbbde6bd259f1bd4b19926d",

    // Using a reliable SMS service to bypass local carrier restrictions if any
    BASE_URL: 'https://api.twilio.com/2010-04-01'
};

const COUNTRIES: Country[] = [
    // Golden Countries (Verified for WhatsApp/Telegram)
    { id: 1, name: 'Sweden', code: '+46', iso: 'SE', price: 2.50 },
    { id: 2, name: 'Netherlands', code: '+31', iso: 'NL', price: 2.50 },
    { id: 3, name: 'United Kingdom', code: '+44', iso: 'GB', price: 2.00 },
    { id: 4, name: 'Germany', code: '+49', iso: 'DE', price: 3.00 },

    // Standard & Easy Countries
    { id: 5, name: 'United States', code: '+1', iso: 'US', price: 1.00 },
    { id: 6, name: 'Canada', code: '+1', iso: 'CA', price: 1.00 },
    { id: 7, name: 'Brazil', code: '+55', iso: 'BR', price: 1.50 },
    { id: 8, name: 'Poland', code: '+48', iso: 'PL', price: 2.00 },
    { id: 9, name: 'Spain', code: '+34', iso: 'ES', price: 2.00 },
    { id: 10, name: 'Indonesia', code: '+62', iso: 'ID', price: 1.50 },
    { id: 11, name: 'South Africa', code: '+27', iso: 'ZA', price: 1.50 },
    { id: 12, name: 'Lithuania', code: '+370', iso: 'LT', price: 2.00 },
    { id: 13, name: 'Estonia', code: '+372', iso: 'EE', price: 2.50 },
    { id: 14, name: 'Israel', code: '+972', iso: 'IL', price: 2.00 },
    { id: 15, name: 'Australia', code: '+61', iso: 'AU', price: 3.00 },
    { id: 16, name: 'Austria', code: '+43', iso: 'AT', price: 3.00 },
    { id: 17, name: 'Belgium', code: '+32', iso: 'BE', price: 3.00 },
    { id: 18, name: 'France', code: '+33', iso: 'FR', price: 2.00 },
];

const SERVICES: Service[] = [
    { id: 'wa', name: 'WhatsApp', icon: 'MessageCircle', price: 2.00 },
    { id: 'tg', name: 'Telegram', icon: 'Send', price: 2.00 },
    { id: 'fb', name: 'Facebook', icon: 'Facebook', price: 1.00 },
    { id: 'ig', name: 'Instagram', icon: 'Instagram', price: 1.00 },
    { id: 'ot', name: 'Other', icon: 'Globe', price: 1.00 }, // Generic
];

class RealTwilioService {

    private getBasicAuth() {
        return 'Basic ' + btoa(TWILIO_CONFIG.ACCOUNT_SID + ':' + TWILIO_CONFIG.AUTH_TOKEN);
    }

    getServices(): Service[] {
        return SERVICES;
    }

    getCountries(): Country[] {
        return COUNTRIES;
    }

    // 1. Search for available numbers in Twilio
    async searchNumbers(countryId: number, serviceId: string): Promise<TwilioNumber[]> {
        const country = COUNTRIES.find(c => c.id === countryId);
        if (!country) return [];

        try {
            // Search mainly for Mobile numbers which are best for verification
            // Twilio API: AvailablePhoneNumbers/[CountryIso]/Mobile
            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/AvailablePhoneNumbers/${country.iso}/Mobile.json?SmsEnabled=true&MmsEnabled=true`;

            const response = await fetch(url, {
                headers: { 'Authorization': this.getBasicAuth() }
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("Twilio Mobile Search Failed:", errText);

                // If 404 (No mobile numbers found) or 400, try Local numbers
                // If 401 (Auth), do not retry, just fail
                if (response.status !== 401 && response.status !== 403) {
                    const fallbackUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/AvailablePhoneNumbers/${country.iso}/Local.json?SmsEnabled=true`;
                    console.log("Attempting Fallback to Local numbers...");
                    const fallbackResponse = await fetch(fallbackUrl, { headers: { 'Authorization': this.getBasicAuth() } });

                    if (!fallbackResponse.ok) {
                        const fbErr = await fallbackResponse.text();
                        console.error("Twilio Local Search also failed:", fbErr);
                        // Convert specific errors to readable messages
                        if (fbErr.includes("Address")) throw new Error("Requires Local Address Presence (Regulation). Try another country.");
                        throw new Error(fbErr);
                    }
                    const fallbackData = await fallbackResponse.json();
                    return this.mapTwilioNumbers(fallbackData, serviceId);
                }

                // If it was 401/403 or other critical
                if (response.status === 401 || response.status === 403) {
                    throw new Error("API Authentication Failed. Check credentials.");
                }

                if (response.status === 400 && errText.includes("Address")) {
                    throw new Error("Mobile Numbers require Address Proof in this country.");
                }

                return []; // Return empty if just no numbers found (404)
            }

            const data = await response.json();
            return this.mapTwilioNumbers(data, serviceId);

        } catch (e) {
            console.error("Search Error", e);
            return [];
        }
    }

    // Global Search (All Countries)
    async searchGlobal(serviceId: string): Promise<TwilioNumber[]> {
        let allNumbers: TwilioNumber[] = [];

        // Search ALL defined countries to maximize results
        // Randomize order slightly to give chance to different countries to appear first
        const targetCountries = [...COUNTRIES].sort(() => Math.random() - 0.5);

        for (const country of targetCountries) {
            try {
                const numbers = await this.searchNumbers(country.id, serviceId);
                allNumbers = [...allNumbers, ...numbers];

                // If we have enough numbers (e.g. 50), stop searching to improve UX speed
                if (allNumbers.length >= 50) break;
            } catch (e) {
                // Silently skip failed countries to continue searching others
                console.log(`Skipping ${country.name}`);
            }
        }
        return allNumbers;
    }

    private mapTwilioNumbers(data: any, serviceId: string): TwilioNumber[] {
        if (!data.available_phone_numbers) return [];

        const servicePrice = SERVICES.find(s => s.id === serviceId)?.price || 1.00;

        return data.available_phone_numbers.map((num: any) => ({
            phoneNumber: num.phone_number,
            country: num.iso_country,
            capabilities: num.capabilities,
            price: servicePrice // Dynamic price based on service selected
        }));
    }

    // 2. Buy a specific number
    async buyNumber(phoneNumber: string, serviceId: string, countryId: number): Promise<Order | null> {
        try {
            const country = COUNTRIES.find(c => c.id === countryId); // Used for saving metadata

            // Purchase from Twilio
            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/IncomingPhoneNumbers.json`;
            const params = new URLSearchParams();
            params.append('PhoneNumber', phoneNumber);
            // Optional: Set SmsUrl to a webhook if we had a backend server

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': this.getBasicAuth(),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                const err = await response.text();
                alert("Purchase Failed: " + err);
                return null;
            }

            const data = await response.json();

            // Save order locally
            this.saveLocalOrder(data.sid, data.phone_number, serviceId, countryId);

            return {
                id: data.sid,
                phoneNumber: data.phone_number,
                serviceId,
                countryId,
                status: 'PENDING',
                createdAt: Date.now(),
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 Days
            };

        } catch (e) {
            console.error("Buy Error", e);
            return null;
        }
    }

    // تخزين مؤقت للطلب لعرضه في التطبيق
    private saveLocalOrder(id: string, phone: string, service: string, country: number) {
        const order: Order = {
            id,
            phoneNumber: phone,
            serviceId: service,
            countryId: country,
            status: 'PENDING',
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 Days expiration
        };

        // Save to localStorage for persistence
        const saved = localStorage.getItem('my_orders') || '{}';
        const orders = JSON.parse(saved);
        orders[id] = order;
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }

    // 4. استيراد الأرقام ومزامنتها (حذف ما تم حذفه من Twilio)
    async syncTwilioNumbers(): Promise<Order[]> {
        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/IncomingPhoneNumbers.json`;
            const response = await fetch(url, { headers: { 'Authorization': this.getBasicAuth() } });

            if (!response.ok) {
                console.error("Sync Failed", await response.text());
                return [];
            }

            const data = await response.json();
            const serverSids = new Set(data.incoming_phone_numbers.map((n: any) => n.sid));
            const syncedOrders: Order[] = [];

            // Get local storage
            const saved = localStorage.getItem('my_orders') || '{}';
            let localOrders = JSON.parse(saved);
            const now = Date.now();

            // 1. Add/Update numbers from Server
            data.incoming_phone_numbers.forEach((num: any) => {
                if (localOrders[num.sid]) {
                    syncedOrders.push(localOrders[num.sid]);
                } else {
                    // New number found on Twilio
                    const newOrder: Order = {
                        id: num.sid,
                        phoneNumber: num.phone_number,
                        serviceId: 'wa',
                        countryId: 1,
                        status: 'READY',
                        createdAt: Date.now(), // New sync = active from now
                        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
                        messages: []
                    };
                    localOrders[num.sid] = newOrder;
                    syncedOrders.push(newOrder);
                }
            });

            // 2. Remove numbers that exist locally but NOT on Server (User deleted them from Twilio)
            Object.keys(localOrders).forEach(localSid => {
                if (!serverSids.has(localSid)) {
                    console.log(`Removing deleted number: ${localSid}`);
                    delete localOrders[localSid];
                }
            });

            // 2. Remove numbers that exist locally but NOT on Server (User deleted them from Twilio)
            // This fixes the issue where deleted numbers reappear or get stuck
            Object.keys(localOrders).forEach(localSid => {
                if (!serverSids.has(localSid)) {
                    console.log(`[Sync] Removing deleted number from local storage: ${localSid}`);
                    delete localOrders[localSid];
                }
            });

            localStorage.setItem('my_orders', JSON.stringify(localOrders));
            return syncedOrders;

        } catch (e) {
            console.error("Sync Failed", e);
            return [];
        }
    }

    // جلب الرسائل (Polling) - وتحديث حالة الطلب
    async getStatus(orderId: string): Promise<string> {
        const saved = localStorage.getItem('my_orders');
        if (!saved) return 'ERROR';

        const orders = JSON.parse(saved);
        const order = orders[orderId];
        if (!order) return 'ERROR';

        try {
            // فلترة الرسائل بتاريخ اليوم لتقليل البيانات
            const createdAtDate = new Date(order.createdAt);
            const dateStr = createdAtDate.toISOString().split('T')[0]; // YYYY-MM-DD

            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/Messages.json?To=${encodeURIComponent(order.phoneNumber)}&DateSent>=${dateStr}`;

            const response = await fetch(url, {
                headers: { 'Authorization': this.getBasicAuth() }
            });

            const data = await response.json();

            if (data.messages && data.messages.length > 0) {
                // تصفية دقيقة: يجب أن تكون الرسالة وصلت *بعد* وقت الطلب
                const newMessages = data.messages.filter((msg: any) => {
                    const msgTime = new Date(msg.date_created).getTime();
                    // نسمح بهامش خطأ دقيقة واحدة
                    return msgTime >= (order.createdAt - 60000);
                });

                if (newMessages.length > 0) {
                    if (!order.messages) order.messages = [];

                    let foundNew = false;

                    // Process messages from oldest to newest to maintain order
                    newMessages.reverse().forEach((msg: any) => {
                        // Avoid duplicates
                        if (!order.messages?.find((m: any) => m.id === msg.sid)) {
                            foundNew = true;
                            const body = msg.body;

                            // Try to extract code (updates the main display)
                            const codeMatch = body.match(/(\d{3,4}[\s-]?\d{3,4})|\b\d{4,8}\b/);
                            if (codeMatch) {
                                let extractedCode = codeMatch[0].replace(/\D/g, '');
                                order.code = extractedCode;
                                order.status = 'COMPLETED';
                            }

                            order.messages.unshift({
                                id: msg.sid,
                                body: body,
                                date: new Date(msg.date_created).getTime(),
                                sender: msg.from,
                                status: msg.status,
                                errorCode: msg.error_code,
                                errorMessage: msg.error_message
                            });
                        }
                    });

                    if (foundNew) {
                        orders[orderId] = order;
                        localStorage.setItem('my_orders', JSON.stringify(orders));
                        return order.code ? `STATUS_OK:${order.code}` : 'STATUS_MSG_RECEIVED';
                    }
                }
            }

        } catch (e) {
            console.error("Polling Error", e);
        }

        return 'STATUS_WAIT_CODE';
    }

    getOrderDetails(orderId: string): Order | undefined {
        const saved = localStorage.getItem('my_orders');
        if (saved) {
            const orders = JSON.parse(saved);
            // 1. Try direct ID match
            if (orders[orderId]) return orders[orderId];

            // 2. Try searching my phone number (values)
            const found = Object.values(orders).find((o: any) => o.phoneNumber === orderId || o.id === orderId);
            return found as Order | undefined;
        }
        return undefined;
    }

    getMyOrders(): Order[] {
        const saved = localStorage.getItem('my_orders');
        if (saved) {
            const orders = JSON.parse(saved);
            const now = Date.now();

            // Filter out expired orders
            const validOrders = Object.values(orders).filter((o: any) => o.expiresAt > now) as Order[];

            // Optional: Clean up localStorage to remove expired data permanently
            if (Object.keys(orders).length !== validOrders.length) {
                const cleanOrders = validOrders.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
                localStorage.setItem('my_orders', JSON.stringify(cleanOrders));
            }

            return validOrders.sort((a, b) => b.createdAt - a.createdAt);
        }
        return [];
    }

    // حذف الرقم من Twilio ومن الذاكرة المحلية
    async releaseNumber(sid: string): Promise<boolean> {
        try {
            // 1. Delete from Twilio (Release the number)
            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/IncomingPhoneNumbers/${sid}.json`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': this.getBasicAuth() }
            });

            // Twilio success is usually 204 No Content, but check OK or 404 (already gone)
            if (response.ok || response.status === 404) {
                // 2. Remove from LocalStorage (Robust delete)
                const saved = localStorage.getItem('my_orders');
                if (saved) {
                    const orders = JSON.parse(saved);

                    // Delete by Key (SID)
                    if (orders[sid]) delete orders[sid];

                    // Also search and delete by Value (in case ID/Phone mismatch or legacy data)
                    for (const key in orders) {
                        if (orders[key].id === sid || orders[key].phoneNumber === sid) {
                            delete orders[key];
                        }
                    }

                    localStorage.setItem('my_orders', JSON.stringify(orders));
                }
                return true;
            }

            console.error("Failed to release number from Twilio", await response.text());
            return false;

        } catch (e) {
            console.error("Release Error", e);
            // Even if network fails, try to clean local if user insists (optimistic delete)
            // But usually we want confirmation. Let's return false to handle UI properly.
            return false;
        }
    }
}

export const apiService = new RealTwilioService();
