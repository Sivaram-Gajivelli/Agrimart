import React from 'react';
import LivePrices from '../components/LivePrices';
import ProductsSection from '../components/ProductsSection';
import PhoneticTerm from '../components/PhoneticTerm';

const RetailerHome = () => {
    return (
        <>
            <div style={{ paddingTop: '100px', paddingBottom: '40px', textAlign: 'center', background: 'var(--primary-dark)', color: 'white' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
                    <PhoneticTerm english="Retailer" te="రిటైలర్" hi="रिटेलर" ta="ரிடைலர்" kn="ರಿಟೇಲರ್" ml="റീട്ടെയ്‌ലർ" mr="रिटेलर" gu="રિટેલર" pa="ਰਿਟੇਲਰ" bn="রিটেইলার" or="ରିଟେଲର୍" as="ৰিটেইলৰ" /> <PhoneticTerm english="Portal" te="పోర్టల్" hi="पोर्टल" ta="போர்ட்டல்" kn="ಪೋರ್ಟಲ್" ml="പോർട്ടൽ" mr="पोर्टल" gu="પોર્ટલ" pa="ਪੋਰਟਲ" bn="পোর্টাল" or="ପୋର୍ଟାଲ୍" as="প’ৰ্টেল" />
                </h1>
                <p style={{ opacity: 0.9 }}>Place bulk orders and analyze wholesale market prices.</p>
            </div>

            <div style={{ background: 'var(--bg-main)' }}>
                <LivePrices />
            </div>

            <div style={{ padding: '20px 0' }}>
                <h2 style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '2rem', marginTop: '20px' }}>Available Bulk Produce</h2>
                <ProductsSection />
            </div>
        </>
    );
};

export default RetailerHome;
