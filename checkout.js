(function () {
    const SDK_VERSION = '1.0.0';
    const SUPABASE_URL = 'https://sxlvxihdgvdrrlfmmusu.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bHZ4aWhkZ3ZkcnJsZm1tdXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDI4NjQsImV4cCI6MjA4NjExODg2NH0.hjEKovqdb5P--C8Jhirz0_k78aeyMmGIKlR_PLoVzzk';

    // To determine where to open index.html from
    const scriptUrl = document.currentScript ? document.currentScript.src : window.location.href;
    const checkoutPageUrl = new URL('index.html', scriptUrl).href;

    async function sha256(message) {
        const msgUint8 = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const YourPay = {
        open: async function (options) {
            const { apiKey, amount, orderId, token, onSuccess, onFailure } = options;

            try {
                let paymentToken = token;

                if (!paymentToken) {
                    if (!apiKey || !amount || !orderId) {
                        throw new Error('Missing required fields: token OR (apiKey, amount, orderId)');
                    }

                    const apiKeyHash = await sha256(apiKey);
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_sdk_session`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': ANON_KEY,
                            'Authorization': `Bearer ${ANON_KEY}`
                        },
                        body: JSON.stringify({
                            p_api_key_hash: apiKeyHash,
                            p_amount: amount,
                            p_metadata: { order_id: orderId }
                        })
                    });

                    const session = await response.json();
                    if (session.error || !session.payment_token) throw new Error(session.message || 'Failed to create session');
                    paymentToken = session.payment_token;
                }

                // Open in new tab
                const popupWidth = 450;
                const popupHeight = 750;
                const left = window.screen.width / 2 - popupWidth / 2;
                const top = window.screen.height / 2 - popupHeight / 2;

                const popup = window.open(
                    `${checkoutPageUrl}?token=${paymentToken}`,
                    'YourPayCheckout',
                    `width=${popupWidth},height=${popupHeight},top=${top},left=${left},scrollbars=yes,resizable=yes`
                );

                if (!popup) {
                    throw new Error('Please allow popups for this site');
                }

                // Listen for messages from the popup
                const messageHandler = (event) => {
                    // In a production environment, verify event.origin
                    const data = event.data;

                    if (data && data.type === 'YOURPAY_SUCCESS') {
                        window.removeEventListener('message', messageHandler);
                        if (onSuccess) onSuccess(data.data);
                    } else if (data && data.type === 'YOURPAY_ERROR') {
                        window.removeEventListener('message', messageHandler);
                        if (onFailure) onFailure(data.data);
                    }
                };

                window.addEventListener('message', messageHandler);

            } catch (err) {
                console.error('YourPay Error:', err);
                if (onFailure) onFailure(err.message || err);
            }
        }
    };

    window.YourPay = YourPay;
})();
