import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ initialRating = 0, onRate, readonly = false, size = 24 }) => {
    const [hover, setHover] = useState(null);
    const [rating, setRating] = useState(initialRating);

    const handleClick = (val) => {
        if (readonly) return;
        setRating(val);
        if (onRate) onRate(val);
    };

    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={size}
                    fill={(hover || rating) >= star ? "#fbbf24" : "none"}
                    color={(hover || rating) >= star ? "#fbbf24" : "#cbd5e1"}
                    style={{ cursor: readonly ? 'default' : 'pointer', transition: '0.2s' }}
                    onMouseEnter={() => !readonly && setHover(star)}
                    onMouseLeave={() => !readonly && setHover(null)}
                    onClick={() => handleClick(star)}
                />
            ))}
        </div>
    );
};

export default StarRating;
