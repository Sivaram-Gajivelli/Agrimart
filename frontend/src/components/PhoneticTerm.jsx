import React from 'react';

const PhoneticTerm = ({ english, te, hi, ta, kn, ml, mr, gu, pa, bn, or, as }) => (
    <span className="phonetic-text">
        <span className="native-label notranslate" translate="no">{english}</span>
        {te && <span className="tr-label te notranslate" translate="no">{te}</span>}
        {hi && <span className="tr-label hi notranslate" translate="no">{hi}</span>}
        {ta && <span className="tr-label ta notranslate" translate="no">{ta}</span>}
        {kn && <span className="tr-label kn notranslate" translate="no">{kn}</span>}
        {ml && <span className="tr-label ml notranslate" translate="no">{ml}</span>}
        {mr && <span className="tr-label mr notranslate" translate="no">{mr}</span>}
        {gu && <span className="tr-label gu notranslate" translate="no">{gu}</span>}
        {pa && <span className="tr-label pa notranslate" translate="no">{pa}</span>}
        {bn && <span className="tr-label bn notranslate" translate="no">{bn}</span>}
        {or && <span className="tr-label or notranslate" translate="no">{or}</span>}
        {as && <span className="tr-label as notranslate" translate="no">{as}</span>}
    </span>
);


export default PhoneticTerm;
