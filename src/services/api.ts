import type { Service, Country, Order, TwilioNumber } from '../types';

const TWILIO_CONFIG = {
    // Basic Auth credentials - in a real app these should be proxied or use functions
    ACCOUNT_SID: "AC" + "a1b2c3d4e5f678901234567890abcdef", // Placeholder, will be replaced by user env if needed or retrieved securely
    AUTH_TOKEN: "1a2b3c4d" + "5e6f7g8h9i0j1k2l3m4n5o6p", // Placeholder

    // Using a reliable SMS service to bypass local carrier restrictions if any
    BASE_URL: 'https://api.twilio.com/2010-04-01'
};

const COUNTRIES: Country[] = [
    // Golden Countries (Verified for WhatsApp/Telegram)
    { id: 1, name: 'Sweden', code: '+46', iso: 'SE', price: 2.50 },
    { id: 2, name: 'Netherlands', code: '+31', iso: 'NL', price: 2.50 },
    { id: 3, name: 'United Kingdom', code: '+44', iso: 'GB', price: 2.00 },
    { id: 4, name: 'Germany', code: '+49', iso: 'DE', price: 3.00 },

    // Standard Countries
    { id: 5, name: 'United States', code: '+1', iso: 'US', price: 1.00 },
    { id: 6, name: 'Canada', code: '+1', iso: 'CA', price: 1.00 },
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
                console.error("Twilio Search Failed", await response.text());
                // Fallback to Local/Mobile generic search if specific mobile endpoint fails
                const fallbackUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/AvailablePhoneNumbers/${country.iso}/Local.json?SmsEnabled=true`;
                const fallbackResponse = await fetch(fallbackUrl, { headers: { 'Authorization': this.getBasicAuth() } });
                if (!fallbackResponse.ok) return [];
                const fallbackData = await fallbackResponse.json();
                return this.mapTwilioNumbers(fallbackData, serviceId);
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
        // Prioritize golden European countries for better success rates
        const targetCountries = COUNTRIES.filter(c => ['SE', 'NL', 'GB', 'DE'].includes(c.iso));

        for (const country of targetCountries) {
            const numbers = await this.searchNumbers(country.id, serviceId);
            allNumbers = [...allNumbers, ...numbers];
            if (allNumbers.length >= 20) break; // Limit results
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

    // 4. استيراد الأرقام القديمة من Twilio مباشرة
    async syncTwilioNumbers(): Promise<Order[]> {
        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/IncomingPhoneNumbers.json`;
            const response = await fetch(url, { headers: { 'Authorization': this.getBasicAuth() } });

            if (!response.ok) return [];

            const data = await response.json();
            const syncedOrders: Order[] = [];

            // Get local storage to merge
            const saved = localStorage.getItem('my_orders') || '{}';
            const localOrders = JSON.parse(saved);
            const now = Date.now();

            data.incoming_phone_numbers.forEach((num: any) => {
                // If we already have it locally, use local data (to keep service info if available)
                if (localOrders[num.sid]) {
                    syncedOrders.push(localOrders[num.sid]);
                } else {
                    // New number found on Twilio, add it as an "Imported" order
                    const newOrder: Order = {
                        id: num.sid,
                        phoneNumber: num.phone_number,
                        serviceId: 'wa', // Default assumption, or 'unknown'
                        countryId: 1, // Default to US, or parse from code
                        status: 'READY',
                        // CRITICAL FIX: When syncing an existing number from Twilio, use the CURRENT TIME as createdAt.
                        // This prevents fetching old history/messages (like old Facebook codes) that existed before this sync.
                        // We only want to see NEW messages arriving from this moment onwards.
                        createdAt: Date.now(),
                        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
                        code: undefined
                    };

                    // Save to local storage so we track it from now on
                    localOrders[num.sid] = newOrder;
                    syncedOrders.push(newOrder);
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
                                sender: msg.from
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
                // 2. Remove from LocalStorage
                const saved = localStorage.getItem('my_orders');
                if (saved) {
                    const orders = JSON.parse(saved);
                    delete orders[sid];
                    localStorage.setItem('my_orders', JSON.stringify(orders));
                }
                return true;
            }

            console.error("Failed to release number from Twilio", await response.text());
            return false;

        } catch (e) {
            console.error("Release Error", e);
            // Even if network fails, try to clean local if user insists
            return false;
        }
    }
}

export const apiService = new RealTwilioService();
