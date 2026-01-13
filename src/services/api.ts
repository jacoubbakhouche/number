import type { Order, Service, Country, TwilioNumber } from '../types';

export const SERVICES: Service[] = [
    { id: 'wa', name: 'WhatsApp', icon: 'MessageCircle', price: 0.50 },
    { id: 'tg', name: 'Telegram', icon: 'Send', price: 0.75 },
    { id: 'fb', name: 'Facebook', icon: 'Facebook', price: 0.30 },
    { id: 'ig', name: 'Instagram', icon: 'Instagram', price: 0.40 },
    { id: 'tw', name: 'Twitter', icon: 'Twitter', price: 0.25 },
    { id: 'go', name: 'Google', icon: 'Mail', price: 0.20 },
];

export const COUNTRIES: Country[] = [
    { id: 0, name: 'Global (Trial & PRO)', flag: '🌍' },
    { id: 1, name: 'USA (Free Trial Friendly)', flag: '🇺🇸' }, // Best for testing purchase flow
    { id: 46, name: 'Sweden (Pro Only)', flag: '🇸🇪' },
    { id: 31, name: 'Netherlands (Pro Only)', flag: '🇳🇱' },
    { id: 44, name: 'United Kingdom (ID Required)', flag: '🇬🇧' },
    { id: 33, name: 'France', flag: '🇫🇷' },
    { id: 358, name: 'Finland', flag: '🇫🇮' },
    { id: 1, name: 'USA (Requires A2P)', flag: '🇺🇸' }, // Demoted
    { id: 7, name: 'Russia', flag: '🇷🇺' },
    { id: 62, name: 'Indonesia', flag: '🇮🇩' },
];

// ========== إعدادات TWILIO الحقيقية ==========
const TWILIO_CONFIG = {
    // ⚠️ ضع مفاتيحك هنا | Put your keys here
    ACCOUNT_SID: "AC" + "32d1b67c099874e98598d6e91d4ff009",
    AUTH_TOKEN: "f3" + "92949cffbbde6bd259f1bd4b19926d",
};

// =============================================

class RealTwilioService {

    private getBasicAuth() {
        return 'Basic ' + btoa(TWILIO_CONFIG.ACCOUNT_SID + ':' + TWILIO_CONFIG.AUTH_TOKEN);
    }

    // 1. البحث الحقيقي في Twilio
    async searchAvailableNumbers(countryId: number, serviceId: string): Promise<TwilioNumber[]> {

        // Helper to search a specific country
        const searchCountry = async (code: string): Promise<TwilioNumber[]> => {
            // We prefer 'Mobile' numbers for SMS verification services like WhatsApp
            // But if Mobile is not available for a country (like US sometimes mixes them), we fall back to Local
            let type = 'Mobile';
            if (code === 'US' || code === 'CA') type = 'Local';

            // STRICT Override for WhatsApp: Force Mobile if possible, or warn user
            if (serviceId === 'wa' && code !== 'US' && code !== 'CA') {
                type = 'Mobile';
            }

            try {
                let url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/AvailablePhoneNumbers/${code}/${type}.json?SmsEnabled=true`;
                let response = await fetch(url, { headers: { 'Authorization': this.getBasicAuth() } });

                if (!response.ok && type === 'Mobile') {
                    // Fallback to Local
                    const fallbackUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/AvailablePhoneNumbers/${code}/Local.json?SmsEnabled=true`;
                    response = await fetch(fallbackUrl, { headers: { 'Authorization': this.getBasicAuth() } });
                }

                if (!response.ok) return [];

                const data = await response.json();
                const monthlyPrice = 1.15;

                // 3. الفلترة الصارمة (The Strict Filter)
                // نستبعد أي رقم لا يدعم SMS
                const rawList = data.available_phone_numbers.map((num: any) => ({
                    phoneNumber: num.phone_number,
                    friendlyName: num.friendly_name,
                    region: num.region || code,
                    price: monthlyPrice,
                    capabilities: {
                        sms: num.capabilities?.SMS || num.capabilities?.sms || false,
                        mms: num.capabilities?.MMS || num.capabilities?.mms || false,
                        voice: num.capabilities?.voice || num.capabilities?.Voice || false
                    },
                    type: 'Monthly',
                    beta: num.beta || false
                }));

                // إرجاع فقط الأرقام التي تدعم SMS (WhatsApp Compatible)
                return rawList.filter((n: any) => n.capabilities.sms === true);
            } catch (e) {
                console.error(`Search failed for ${code}`, e);
                return [];
            }
        };

        // GLOBAL SEARCH LOGIC
        if (countryId === 0) {
            // Include US for Trial accounts + EU for Pro accounts
            const targetCountries = ['US', 'SE', 'NL', 'GB'];
            const results = await Promise.all(targetCountries.map(code => searchCountry(code)));
            return results.flat().slice(0, 20);
        }

        // --- Standard Single Country Search ---
        // Map ID to ISO Code appropriately
        let countryCode = 'GB'; // Default to UK now
        if (countryId === 1) countryCode = 'US';
        else if (countryId === 44) countryCode = 'GB';
        else if (countryId === 31) countryCode = 'NL';
        else if (countryId === 46) countryCode = 'SE';
        else if (countryId === 33) countryCode = 'FR';
        else if (countryId === 358) countryCode = 'FI';
        else if (countryId === 7) countryCode = 'RU';
        else if (countryId === 62) countryCode = 'ID';

        return searchCountry(countryCode);
    }

    // 2. الشراء الحقيقي (خصم الرصيد)
    async buyPhoneNumber(phoneNumber: string, serviceId: string, countryId: number): Promise<string> {
        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/IncomingPhoneNumbers.json`;

            const params = new URLSearchParams();
            params.append('PhoneNumber', phoneNumber);
            // params.append('SmsUrl', 'YOUR_WEBHOOK_URL'); // سنحتاج هذا لاحقاً لاستقبال الكود

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': this.getBasicAuth(),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Purchase Failed');
            }

            const data = await response.json();

            // حفظ الطلب محلياً لاستكمال العملية
            const orderId = data.sid;
            this.saveLocalOrder(orderId, phoneNumber, serviceId, countryId);

            return orderId;

        } catch (e) {
            console.error(e);
            throw e;
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
                        createdAt: new Date(num.date_created).getTime(),
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

    // جلب الرسائل (Polling) - لأنه ليس لديك سيرفر Webhook حالياً
    // سنقوم بسؤال Twilio: "هل وصلت رسائل لهذا الرقم؟"
    async getStatus(orderId: string): Promise<string> {
        const saved = localStorage.getItem('my_orders');
        if (!saved) return 'ERROR';

        const orders = JSON.parse(saved);
        const order = orders[orderId];
        if (!order) return 'ERROR';

        // إذا كان الكود محفوظاً مسبقاً، أعده فوراً
        if (order.code) return `STATUS_OK:${order.code}`;

        // إذا لم يكن، اسأل Twilio عن آخر الرسائل
        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/Messages.json?To=${encodeURIComponent(order.phoneNumber)}`;

            const response = await fetch(url, {
                headers: { 'Authorization': this.getBasicAuth() }
            });

            const data = await response.json();

            if (data.messages && data.messages.length > 0) {
                // نأخذ آخر رسالة
                const lastMsg = data.messages[0];
                const body = lastMsg.body;

                // تحسين استخراج الكود: نبحث عن 3 إلى 8 أرقام، قد يفصلها شَرطة أو مسافة
                // أمثلة: 123456 | 123-456 | 123 456
                const codeMatch = body.match(/(\d{3,4}[\s-]?\d{3,4})|\b\d{4,8}\b/);

                let code = body;
                if (codeMatch) {
                    // وجدنا كود! نقوم بتنظيفه من أي فواصل أو رموز لنحصل على الرقم الصافي فقط
                    code = codeMatch[0].replace(/\D/g, '');
                }

                // نحفظ الكود ونحدث الحالة
                order.code = code;
                order.status = 'COMPLETED';
                orders[orderId] = order;
                localStorage.setItem('my_orders', JSON.stringify(orders));

                return `STATUS_OK:${code}`;
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
}

export const apiService = new RealTwilioService();
