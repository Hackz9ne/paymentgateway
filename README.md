# YourPay Developer Documentation

Welcome to the YourPay integration guide. YourPay is a premium, QR-only payment gateway designed for speed and security.

## 1. Introduction

YourPay provides a hosted checkout experience where users pay by scanning a dynamically generated QR code. Our system uses backend polling to detect success, ensuring a robust integration without complex webhook requirements (though webhooks are supported).

## 2. Authentication

All API requests must include your Merchant API Key, Timestamp, Nonce, and an HMAC SHA256 Signature in the headers. 

- **X-Merchant-Key**: Your public API key (`yp_test_...` or `yp_live_...`)
- **X-Timestamp**: The current ISO8601 timestamp in UTC.
- **X-Nonce**: A random string or incremental integer uniquely identifying the request.
- **X-Signature**: Cryptographic HMAC-SHA256 string matching the format below.

### Generating The Signature
Combine parameters according to standard formats: `Signature = HexEncode(HmacSHA256(Payload + Timestamp + Nonce, api_secret))`.

## 3. Core API (REST)

### Create Payment Session

`POST /functions/v1/api-gateway/session`

> [!IMPORTANT]
> Both the **Merchant API Key** and the **API Secret** are strictly required. The Secret is used to generate the cryptographic `X-Signature` header. If either component is missing or invalid, the payment session will not be created.

**Headers:**


```http
X-Merchant-Key: <your_merchant_api_key>
X-Signature: <generated_hmac_hex>
X-Timestamp: <iso8601_timestamp>
X-Nonce: <unique_identifier>
Content-Type: application/json
```


**Body:**

```json
{
  "amount": 500.00,
  "order_id": "ORD_998877"
}
```

**Response:**

```json
{
  "session_id": "abc123xyz",
  "payment_token": "pay_token_...",
  "payment_url": "https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway/checkout?token=pay_token_...",
  "merchant_name": "Student Wallet",
  "amount": 500.00
}
```

### Check Payment Status

`GET /functions/v1/api-gateway/status?token=<payment_token>`

**Response:**

```json
{
  "status": "completed",
  "is_expired": false,
  "amount": 500.00,
  "order_id": "ORD_998877"
}
```

**Status Values:** `pending`, `completed`, `expired`, `failed`

---

## 4. Frontend Integration

### Pre-requisites

Include the following script in your HTML `<head>` or before the closing `</body>` tag:

```html
<script src="https://your-cdn-link.com/checkout.js"></script>
```

### A. Professional Server-Side Flow (Recommended)

1. Use your backend (Python/Node/PHP) to create a session via the `/session` API.
2. Pass the returned `payment_token` to your frontend.
3. Launch the checkout modal:

1. Use Python/Node to create a session via the Gateway.
2. Pass the `payment_token` to your frontend.
3. Launch the checkout:

```javascript
YourPay.open({
    token: "pay_token_12345",
    onSuccess: (data) => console.log("Success!", data),
    onFailure: (err) => console.error("Error", err)
});
```

### B. Client-Side Quick Start (Test Mode Only)

*Warning: This method requires generating the signature. Exposing your API Secret in the browser is highly discouraged.*


```javascript
YourPay.open({
    apiKey: "yp_test_...",
    amount: 500.00,
    orderId: "ORD_123",
    onSuccess: (data) => location.href = "/success"
});
```

---

## 5. In-App Purchase (Flutter SDK)

The YourPay SDK provides a beautiful, animated bottom sheet for processing payments directly within your app.

Create the session on your backend and launch the UI in Flutter using the returned `token`. The SDK handles the QR generation and polling automatically.

```dart
// Launch checkout using a pre-created token
YourPay.open(
  context,
  token: "pay_token_9988",
  merchantName: "Student Wallet",
  onSuccess: (data) => print("Paid successfully! Status: ${data['status']}"),
  onFailure: (err) => print("Failed: $err"),
);
```

> [!IMPORTANT]
> Direct client-side session creation using API Keys is strictly disabled to prevent security compromises. You must generate the `payment_token` securely on your backend server and pass it to the SDK.


### C. Deep Linking (Mobile App)

If you are integrating from a mobile web experience or another app, you can launch the official Student Wallet App directly to complete the payment using the following deep link format:

```
studentwallet://pay?session_id={payment_token}
```

**Parameters:**
- `session_id`: The `payment_token` returned by the Create Payment Session API.

**Example (Web/JavaScript):**
```javascript
window.location.href = `studentwallet://pay?session_id=${payment_token}`;
```

---

## 6. Python Integration Example

```python
import requests
import time
import webbrowser  # Added this to handle the "popout"

# 1. Configuration 
API_BASE_URL = "https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway"
MERCHANT_KEY = "your-apikey"

def create_payment(amount, order_id):
    url = f"{API_BASE_URL}/session"
    headers = {
        "X-Merchant-Key": MERCHANT_KEY,
        "Content-Type": "application/json"
    }
    data = {"amount": amount, "order_id": order_id}
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

def check_status(payment_token):
    url = f"{API_BASE_URL}/status?token={payment_token}"
    response = requests.get(url)
    return response.json()

# --- Example Usage ---

# Step 1: Create a payment
session = create_payment(2.00, "ORDER_PY_99")

if 'error' in session:
    print(f"Error: {session['error']}")
else:
    token = session['payment_token']
    pay_url = session['payment_url']
    print(f"✅ Session Created! Token: {token}")
    print(f"🔗 Opening Checkout: {pay_url}")
    
    # This line handles the "popout" automatically!
    webbrowser.open(pay_url)

    # Step 2: Poll for status
    print("Waiting for customer to pay...")
    while True:
        status_data = check_status(token)
        status = status_data.get('status', 'pending')
        print(f"Current Status: {status}")
        
        if status == 'completed':
            print("🎉 Payment Successful!")
            break
        elif status_data.get('is_expired'):
            print("❌ Session Expired.")
            break
            
        time.sleep(5)

```

---

## 7. FAQ

**Q: How long is the QR valid?**
A: Exactly 2 minutes (120 seconds).

**Q: Can the amount be changed by the user?**
A: No. The amount is fixed at session creation for security.

**Q: What happens on expiry?**
A: The modal will show an expiry message and the polling will stop. The user must restart the checkout.

**Q: Is polling secure?**
A: Yes. Polling only reveals public status. The actual debit happens securely on our servers.

---

AI Integration Prompt

Copy and paste this into any AI (ChatGPT, Claude, etc.) to integrate YourPay:

> "I want to integrate the YourPay QR payment gateway into my [Website/App]. 
> I am using the `checkout.js` library (JavaScript) or the provided Flutter SDK.
> Pre-requisite: I have my API Key. 
> Please write the code to:
> 1. Create a payment session server-side using the `/session` endpoint.
> 2. Initialize the `YourPay.open` modal in the frontend using the `payment_token`.
> 3. Handle the `onSuccess` callback by redirecting to `/success`."

---

**Create Session (Server-Side):**

### Bash / Linux / macOS

```bash
curl -X POST https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway/session \
     -H "X-Merchant-Key: your_merchant_key" \
     -H "Content-Type: application/json" \
     -d '{"amount": 100, "order_id": "CURL_777"}'
```

### Windows (PowerShell)

*Note: This is the native and most reliable way to test on Windows.*

```powershell
$headers = @{ "X-Merchant-Key" = "your_merchant_key"; "Content-Type" = "application/json" }
$body = @{ amount = 100; order_id = "CURL_777" } | ConvertTo-Json

Invoke-RestMethod -Uri "https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway/session" `
    -Method Post -Headers $headers -Body $body
```

**Check Status:**

```bash
curl -X GET "https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway/status?token=pay_token_123"
```

---

## 10. Node.js Integration

```javascript
const axios = require('axios');
const crypto = require('crypto');

async function createPayment() {
    const amount = 250;
    const order_id = "NODE_99";
    const apiKey = 'your_api_key';
    const apiSecret = 'your_api_secret';
    
    const timestamp = new Date().toISOString();
    const nonce = Date.now().toString();
    
    // Payload depends on endpoint (e.g., amount + order_id)
    const payload = amount.toString() + order_id;
    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(payload + timestamp + nonce)
        .digest('hex');

    const res = await axios.post('https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway/session', {
        amount: amount,
        order_id: order_id
    }, {
        headers: { 
            'X-Merchant-Key': apiKey,
            'X-Signature': signature,
            'X-Timestamp': timestamp,
            'X-Nonce': nonce
        }
    });
    
    console.log('Checkout URL:', res.data.payment_url);
}
```

