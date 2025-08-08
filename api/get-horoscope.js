import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    // Correctly construct the full URL before parsing
    const fullUrl = new URL(request.url, `https://${request.headers.host}`);
    const { searchParams } = fullUrl;
    const sign = searchParams.get('sign'); // e.g., 'aries'

    if (!sign) {
        return response.status(400).json({ error: 'Sign parameter is missing' });
    }

    try {
        const key = `horoscope:${sign.toLowerCase()}`;
        const horoscopeText = await kv.get(key);
        
        if (horoscopeText) {
            return response.status(200).json({ horoscope: horoscopeText });
        } else {
            // This is the message you were seeing
            return response.status(404).json({ horoscope: 'לא נמצאה תחזית עבור מזל זה. נסה שוב מאוחר יותר.' });
        }
    } catch (error) {
        console.error('Failed to retrieve horoscope from KV:', error);
        return response.status(500).json({ horoscope: 'שגיאה בשליפת התחזית.' });
    }
}
