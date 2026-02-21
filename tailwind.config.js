export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                fantasy: {
                    900: '#110C1A',
                    800: '#1F142E',
                    700: '#32224A',
                    blue: '#3A5A9F',
                    red: '#9B2D3A',
                    cyan: '#38A3A5',
                    gold: '#C69C31'
                }
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both'
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 5px rgba(198, 156, 49, 0.5))' },
                    '50%': { opacity: .7, filter: 'drop-shadow(0 0 15px rgba(198, 156, 49, 1))' },
                },
                shake: {
                    '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
                    '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
                    '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
                    '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
                }
            }
        },
    },
    plugins: [],
}
