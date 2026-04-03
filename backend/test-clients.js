const { translate } = require('@vitalets/google-translate-api');

async function testClients() {
    const query = "టమాటా";
    const clients = ['at', 'gtx', 't', 'dict-chrome-ex'];
    
    for (const client of clients) {
        try {
            console.log(`Testing with client: ${client}`);
            // Note: Different versions of the library handle 'client' differently.
            // Version 9.2.1 used in this project.
            const res = await translate(query, { to: 'en', from: 'auto', client });
            console.log(`Success [${client}]:`, res.text);
            return;
        } catch (err) {
            console.error(`Failed [${client}]:`, err.message);
        }
    }
}

testClients();
