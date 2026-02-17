(function () {
    const SDK_VERSION = '1.0.0';
    const SUPABASE_URL = 'https://sxlvxihdgvdrrlfmmusu.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bHZ4aWhkZ3ZkcnJsZm1tdXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDI4NjQsImV4cCI6MjA4NjExODg2NH0.hjEKovqdb5P--C8Jhirz0_k78aeyMmGIKlR_PLoVzzk';

    // State management
    let modalElement = null;
    let pollingInterval = null;
    let countdownInterval = null;

    const styles = `
        .yourpay-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .yourpay-modal {
            background: #fff;
            width: 100%;
            max-width: 400px;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            transform: translateY(20px);
            transition: transform 0.3s ease;
            position: relative;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            text-align: center;
        }
        .yourpay-show .yourpay-overlay { opacity: 1; }
        .yourpay-show .yourpay-modal { transform: translateY(0); }
        
        .yourpay-header {
            padding: 32px 24px 24px;
            background: linear-gradient(135deg, #6200EE, #7C4DFF);
            color: white;
        }
        .yourpay-merchant { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .yourpay-amount { font-size: 32px; font-weight: 800; }
        
        .yourpay-body { padding: 32px 24px; }
        .yourpay-qr-container {
            width: 200px; height: 200px;
            background: #f8f9fa;
            margin: 0 auto 24px;
            border-radius: 16px;
            padding: 12px;
            border: 1px solid #e0e0e0;
            display: flex;
            align-items: center; justify-content: center;
        }
        .yourpay-timer { 
            font-size: 14px; 
            color: #666; 
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .yourpay-timer span { font-weight: 700; color: #d32f2f; }
        
        .yourpay-btn-cancel {
            background: none;
            border: none;
            color: #666;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 8px;
            transition: background 0.2s;
        }
        .yourpay-btn-cancel:hover { background: #f1f3f4; color: #333; }

        .yourpay-success-ui { padding: 40px 20px; }
        .yourpay-success-icon {
            width: 64px; height: 64px;
            background: #E8F5E9;
            color: #2E7D32;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 16px;
        }
    `;

    async function sha256(message) {
        const msgUint8 = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    const YourPay = {
        open: async function ({ apiKey, amount, orderId, onSuccess, onFailure }) {
            try {
                if (!apiKey || !amount || !orderId) {
                    throw new Error('Missing required fields: apiKey, amount, or orderId');
                }

                // Initialize session
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

                // Add orderId to session object for UI
                session.order_id = orderId;

                // Load QR library if needed
                await loadScript('https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js');

                this._renderModal(session, onSuccess, onFailure);
            } catch (err) {
                console.error('YourPay Error:', err);
                if (onFailure) onFailure(err.message || err);
                // We keep the alert as a fallback if no failure handler or for debugging
                console.warn('Payment initialization failed:', err.message);
            }
        },

        _renderModal: function (session, onSuccess, onFailure) {
            // Block scroll
            document.body.style.overflow = 'hidden';

            // Create styles
            if (!document.getElementById('yourpay-styles')) {
                const s = document.createElement('style');
                s.id = 'yourpay-styles';
                s.textContent = styles;
                document.head.appendChild(s);
            }

            // Create modal
            modalElement = document.createElement('div');
            modalElement.className = 'yourpay-container';
            modalElement.innerHTML = `
                <div class="yourpay-overlay">
                    <div class="yourpay-modal">
                        <div class="yourpay-header">
                            <div class="yourpay-merchant">${session.merchant_name}</div>
                            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">Order ID: ${session.order_id}</div>
                            <div class="yourpay-amount">Rs. ${parseFloat(session.amount).toFixed(2)}</div>
                        </div>
                        <div class="yourpay-body" id="yourpay-body">
                            <div class="yourpay-qr-container" id="yourpay-qr"></div>
                            <div class="yourpay-timer">
                                Expires in <span id="yourpay-countdown">02:00</span>
                            </div>
                            <button class="yourpay-btn-cancel" id="yourpay-cancel">Cancel Payment</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalElement);

            // Animate in
            setTimeout(() => modalElement.classList.add('yourpay-show'), 10);

            // Render QR
            new QRCode(document.getElementById("yourpay-qr"), {
                text: `APP://PAY?type=session&token=${session.payment_token}`,
                width: 180, height: 180,
                colorDark: "#1A1C1E", colorLight: "#ffffff"
            });

            // Start countdown
            this._startCountdown(120, () => {
                this._handleExpired(session, onFailure);
            });

            // Start Polling
            this._startPolling(session, onSuccess, onFailure);

            // Cancel button
            document.getElementById('yourpay-cancel').onclick = () => {
                this.close();
                if (onFailure) onFailure('Payment cancelled by user');
            };
        },

        _startCountdown: function (seconds, onExpire) {
            let left = seconds;
            const el = document.getElementById('yourpay-countdown');
            countdownInterval = setInterval(() => {
                left--;
                const m = Math.floor(left / 60);
                const s = left % 60;
                el.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

                if (left <= 0) {
                    clearInterval(countdownInterval);
                    onExpire();
                }
            }, 1000);
        },

        _startPolling: function (session, onSuccess, onFailure) {
            pollingInterval = setInterval(async () => {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/resolve_payment_token_v2`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
                    body: JSON.stringify({ p_payment_token: session.payment_token })
                });
                const data = await res.json();
                if (data && data.status === 'completed') {
                    this._handleSuccess(onSuccess);
                } else if (data && data.is_expired) {
                    this._handleExpired(session, onFailure);
                }
            }, 3000);
        },

        _handleSuccess: function (onSuccess) {
            this._stopAll();
            const body = document.getElementById('yourpay-body');
            body.innerHTML = `
                <div class="yourpay-success-ui">
                    <div class="yourpay-success-icon">
                        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h3 style="margin-bottom: 8px;">Payment Successful!</h3>
                    <p style="color: #666; font-size: 14px;">Your transaction was completed.</p>
                </div>
            `;
            setTimeout(() => {
                this.close();
                if (onSuccess) onSuccess({ status: 'completed' });
            }, 2000);
        },

        _handleExpired: function (session, onFailure) {
            this._stopAll();
            const body = document.getElementById('yourpay-body');
            body.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="color: #d32f2f; margin-bottom: 8px;">Session Expired</h3>
                    <p style="color: #666; font-size: 14px; margin-bottom: 24px;">The payment window has timed out.</p>
                    <button class="yourpay-btn-cancel" onclick="location.reload()" style="background: #6200EE; color: white;">Retry</button>
                    <p style="margin-top: 12px;"><button class="yourpay-btn-cancel" id="yourpay-close-err">Close</button></p>
                </div>
            `;
            document.getElementById('yourpay-close-err').onclick = () => this.close();
            if (onFailure) onFailure('Payment session expired');
        },

        _stopAll: function () {
            clearInterval(pollingInterval);
            clearInterval(countdownInterval);
        },

        close: function () {
            this._stopAll();
            if (modalElement) {
                modalElement.classList.remove('yourpay-show');
                setTimeout(() => {
                    modalElement.remove();
                    modalElement = null;
                    document.body.style.overflow = '';
                }, 300);
            }
        }
    };

    window.YourPay = YourPay;
})();
