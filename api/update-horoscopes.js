import { kv } from '@vercel/kv';
import { zodiacSigns } from '../lib/zodiac.js';

// פונקציה חדשה שמותאמת ל-API של Groq
async function generateHoroscopeForSign(sign, dateStr) {
    const apiKey = process.env.GROQ_API_KEY;
    // כתובת ה-API של Groq (תואמת OpenAI)
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    const prompt = `צור תחזית אסטרולוגית יומית, קצרה ומעוררת השראה למזל ${sign.name} (${sign.english}) לתאריך ${dateStr}. התחזית צריכה להיות באורך של 2-3 משפטים, בסגנון חיובי, ולהתייחס בקצרה לאחד או שניים מהתחומים: אהבה, קריירה, כספים או רווחה אישית. כתוב בעברית רהוטה. אל תוסיף כותרת או את שם המזל בתשובה.`;

    const payload = {
        // אחד המודלים הזמינים ב-Groq
        model: 'llama3-8b-8192',
        messages: [
            {
                role: 'system',
                content: 'You are a helpful and positive astrologer.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 500
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}` // שיטת אימות זהה ל-OpenAI
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Groq API Error: ${response.status}`, errorBody);
        throw new Error(`Groq API request failed for ${sign.name}`);
    }

    const result = await response.json();
    if (!result.choices || result.choices.length === 0) {
        console.error("Groq API returned no choices for", sign.name);
        return "לא נוצרה תחזית עקב תקלה זמנית.";
    }

    return result.choices[0].message.content.trim();
}


// החלק הזה נשאר כמעט זהה
export default async function handler(request, response) {
    // ## חשוב! הפעל מחדש את האבטחה אחרי שהכל עובד ##
    
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return response.status(401).json({ message: 'Unauthorized' });
    }
    

    try {
        const todayStr = new Date().toLocaleDateString('en-CA');
        console.log(`Starting daily horoscope generation for ${todayStr} using Groq`);

        for (const sign of zodiacSigns) {
            try {
                const horoscopeText = await generateHoroscopeForSign(sign, todayStr);
                const key = `horoscope:${sign.english.toLowerCase()}`;
                
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


