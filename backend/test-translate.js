const { translate } = require('@vitalets/google-translate-api');

async function test() {
    try {
        const q = "టమాటా";
        console.log(`Testing translation for: ${q}`);
        const result = await translate(q, { to: 'en', from: 'auto' });
        console.log("Result:", result.text);
        console.log("From:", result.from.language.iso);
    } catch (err) {
        console.error("Translation error:", err);
    }
}

test();
