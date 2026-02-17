# YourPay Developer Documentation

Welcome to the YourPay integration guide. YourPay is a premium, QR-only payment gateway designed for speed and security.

## 1. Introduction

YourPay provides a hosted checkout experience where users pay by scanning a dynamically generated QR code. Our system uses backend polling to detect success, ensuring a robust integration without complex webhook requirements (though webhooks are supported).

## 2. Authentication

All API requests must include your Merchant API Key in the headers or as a hash depending on the SDK.

- **Test Mode**: Use keys starting with `yp_test_`
- **Live Mode**: Use keys starting with `yp_live_`

## 3. Core API (REST)

### Create Payment Session

`POST /functions/v1/api-gateway/session`

**Headers:**

```http
X-Merchant-Key: <your_merchant_api_key>
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
  "merchant_name": "Student Wallet",
  "amount": 500.00
}
```

---

## 4. Checkout SDK (JavaScript)

Include the SDK:

```html
<script src="https://cdn.yourapp.com/sdk/checkout.js"></script>
```

Launch Checkout:

```javascript
YourPay.open({
    apiKey: "your_public_api_key",
    amount: 500.00,
    orderId: "ORD_123",
    onSuccess: function(data) {
        console.log("Payment Successful:", data);
        window.location.href = "/success";
    },
    onFailure: function(error) {
        console.error("Payment Failed:", error);
    }
});
```

---

## 5. Flutter Integration

Add the `yourpay_sdk.dart` to your project and use:

```dart
YourPay.openPayment(
  apiKey: "yp_live_...",
  amount: 250.0,
  orderId: "INV-001",
  onSuccess: (data) {
    print("Success: $data");
  },
  onFailure: (error) {
    print("Error: $error");
  },
);
```

---

## 6. Python Integration Example

```python
import requests
import time
import webbrowser  # Added this to handle the "popout"

# 1. Configuration 
API_BASE_URL = "https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway"
MERCHANT_KEY = "your_apikey"

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
session = create_payment(150.00, "ORDER_PY_99")

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

## 8. AI Integration Prompt

Copy and paste this into any AI (ChatGPT, Claude, etc.) to integrate YourPay:

> "I want to integrate the YourPay QR payment gateway into my [Website/App].
> I have my API Key. Please write the code to launch the checkout modal for an amount of [Amount] and handle the success callback by redirecting to my success page."

---

## 9. cURL Examples

**Create Session:**

```bash
curl -X POST https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway/session \
     -H "X-Merchant-Key: your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"amount": 150, "order_id": "ORDER_101"}'
```

**Check Status:**

```bash
curl -X GET "https://sxlvxihdgvdrrlfmmusu.supabase.co/functions/v1/api-gateway/status?token=your_token_here"
```
