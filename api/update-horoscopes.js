import { kv } from '@vercel/kv';
// ודא שיצרת את הקובץ הזה בתיקיית lib
import { zodiacSigns } from '../lib/zodiac.js'; 

// פונקציית עזר פנימית לייצר תחזית למזל בודד
async function generateHoroscopeForSign(sign, dateStr) {
    const prompt = `צור תחזית אסטרולוגית יומית, קצרה ומעוררת השראה למזל ${sign.name} (${sign.english}) לתאריך ${dateStr}. התחזית צריכה להיות באורך של 2-3 משפטים, בסגנון חיובי, ולהתייחס בקצרה לאחד או שניים מהתחומים: אהבה, קריירה, כספים או רווחה אישית. כתוב בעברית רהוטה. אל תוסיף כותרת או את שם המזל בתשובה.`;
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
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
        // אם ה-API של גוגל נכשל, נזרוק שגיאה כדי שהלולאה תדע
        throw new Error(`Google API request failed for ${sign.name}`);
    }
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text.trim() || "לא נוצרה תחזית.";
}

// הפונקציה הראשית שה-Cron Job מפעיל
export default async function handler(request, response) {
    // אבטחה: ודא שהבקשה מגיעה מה-Cron Job של Vercel ולא ממשתמש רגיל
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return response.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const todayStr = new Date().toLocaleDateString('en-CA'); // פורמט: YYYY-MM-DD
        console.log(`Starting daily horoscope generation for ${todayStr}`);

        // לולאה שעוברת על כל המזלות
        for (const sign of zodiacSigns) {
            try {
                const horoscopeText = await generateHoroscopeForSign(sign, todayStr);
                // יצירת מפתח ייחודי לכל מזל, למשל: "horoscope:aries"
                const key = `horoscope:${sign.english.toLowerCase()}`;
                // שמירת ההורוסקופ במאגר הנתונים KV
                await kv.set(key, horoscopeText);
                console.log(`Successfully updated horoscope for ${sign.name}`);
            } catch (error) {
                console.error(`Failed to generate horoscope for ${sign.name}:`, error.message);
                // אנחנו ממשיכים לנסות את המזל הבא גם אם אחד נכשל
            }
        }

        console.log("All horoscopes updated successfully.");
        return response.status(200).json({ message: "Horoscopes updated successfully." });

    } catch (error) {
        console.error("A critical error occurred during the cron job:", error);
        return response.status(500).json({ message: "Failed to update horoscopes." });
    }

}


