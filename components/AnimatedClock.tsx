export default function AnimatedClock({ size = 24, color = "currentColor" }: { size?: number, color?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style={{ display: 'block' }}
        >
            {/* Clock Face */}
            <circle cx="12" cy="12" r="9" />

            {/* Hour Hand */}
            <line x1="12" y1="12" x2="12" y2="7">
                <animateTransform
                    attributeName="transform"
                    attributeType="XML"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="12s"
                    repeatCount="indefinite"
                />
            </line>

            {/* Minute Hand */}
            <line x1="12" y1="12" x2="15.5" y2="15.5">
                <animateTransform
                    attributeName="transform"
                    attributeType="XML"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="2s"
                    repeatCount="indefinite"
                />
            </line>
        </svg>
    );
}
