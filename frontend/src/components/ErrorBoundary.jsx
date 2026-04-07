import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    background: '#fff', 
                    height: '100vh', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    alignItems: 'center' 
                }}>
                    <h1 style={{ color: '#d32f2f' }}>Something went wrong.</h1>
                    <p>We encountered an unexpected error while loading this page.</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{ 
                            marginTop: '20px', 
                            padding: '10px 20px', 
                            background: '#14532d', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer' 
                        }}
                    >
                        Reload Page
                    </button>
                    <button 
                        onClick={() => window.location.href = '/'} 
                        style={{ 
                            marginTop: '10px', 
                            padding: '10px 20px', 
                            background: '#f0f2f2', 
                            color: '#333', 
                            border: '1px solid #d5d9d9', 
                            borderRadius: '5px', 
                            cursor: 'pointer' 
                        }}
                    >
                        Go to Home
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
