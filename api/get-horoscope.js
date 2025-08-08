import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    const fullUrl = new URL(request.url, `https://${request.headers.host}`);
    const { searchParams } = fullUrl;
    const sign = searchParams.get('sign');

    if (!sign) {
        return response.status(400).json({ error: 'Sign parameter is missing' });
    }

    try {
        const key = `horoscope:${sign.toLowerCase()}`;
        const horoscopeText = await kv.get(key);
        
        // ## הוספנו הדפסת אבחון כאן ##
        console.log(`READING from DB -> Key: ${key}, Found Value: "${horoscopeText}"`);

        if (horoscopeText) {
            return response.status(200).json({ horoscope: horoscopeText });
        } else {
            return response.status(404).json({ horoscope: 'לא נמצאה תחזית עבור מזל זה. נסה שוב מאוחר יותר.' });
        }
    } catch (error) {
        console.error('Failed to retrieve horoscope from KV:', error);
        return response.status(500).json({ horoscope: 'שגיאה בשליפת התחזית.' });
    }
}
