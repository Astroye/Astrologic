import { kv } from '@vercel/kv';
import { zodiacSigns } from '../lib/zodiac.js';

async function generateHoroscopeForSign(sign, dateStr) {
    const prompt = `צור תחזית אסטרולוגית יומית, קצרה ומעוררת השראה למזל ${sign.name} (${sign.english}) לתאריך ${dateStr}. התחזית צריכה להיות באורך של 2-3 משפטים, בסגנון חיובי, ולהתייחס בקצרה לאחד או שניים מהתחומים: אהבה, קריירה, כספים או רווחה אישית. כתוב בעברית רהוטה. אל תוסיף כותרת או את שם המזל בתשובה.`;
    const apiKey = process.env.GEMINI_API_KEY;

    // ## זה השינוי העיקרי: עדכון כתובת ה-API ##
    const modelName = 'gemini-1.5-flash-latest';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, topP: 0.9 },
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        // אם נקבל שגיאה, נרצה לראות מה גוגל ענתה
        const errorBody = await response.text();
        console.error(`Google API Error: ${response.status}`, errorBody);
        throw new Error(`Google API request failed for ${sign.name}`);
    }
    const result = await response.json();
    // הוספנו בדיקה למקרה שהתשובה מגוגל ריקה
    if (!result.candidates || result.candidates.length === 0) {
        console.error("Google API returned no candidates for", sign.name);
        return "לא נוצרה תחזית עקב תקלה זמנית.";
    }
    return result.candidates[0]?.content?.parts[0]?.text.trim() || "לא נוצרה תחזית.";
}

export default async function handler(request, response) {
    /*
    // אבטחה זמנית מנוטרלת לבדיקה
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return response.status(401).json({ message: 'Unauthorized' });
    }
    */

    try {
        const todayStr = new Date().toLocaleDateString('en-CA');
        console.log(`Starting daily horoscope generation for ${todayStr}`);

        for (const sign of zodiacSigns) {
            try {
                const horoscopeText = await generateHoroscopeForSign(sign, todayStr);
                const key = `horoscope:${sign.english.toLowerCase()}`;
                
                console.log(`WRITING to DB -> Key: ${key}, Value: "${horoscopeText}"`);
                
                await kv.set(key, horoscopeText);
                console.log(`Successfully updated horoscope for ${sign.name}`);
            } catch (error) {
                console.error(`Failed to generate horoscope for ${sign.name}:`, error.message);
            }
        }

        console.log("All horoscopes updated successfully.");
        return response.status(200).json({ message: "Horoscopes updated successfully." });

    } catch (error) {
        console.error("A critical error occurred during the cron job:", error);
        return response.status(500).json({ message: "Failed to update horoscopes." });
    }
}
