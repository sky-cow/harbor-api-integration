// App.jsx - Main application component
import React, { useState, useEffect } from "react";
import {
  Send,
  Users,
  Building2,
  Wallet,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import "./App.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://harbor-stage.owlpay.com/api/v1";
const WEBHOOK_VIEWER_URL =
  process.env.REACT_APP_WEBHOOK_VIEWER_URL || "http://localhost:4000";

function App() {
  const [apiKey, setApiKey] = useState("");
  const [activeTab, setActiveTab] = useState("customers");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    type: "individual",
    first_name: "John",
    middle_name: "Michael",
    last_name: "Doe",
    email: "[email protected]",
    phone_country_code: "US",
    phone_number: "555-555-1234",
    birth_date: "1988-04-15",
    description: "Test customer",
  });

  // Bank account form state
  const [bankAccountForm, setBankAccountForm] = useState({
    customer_uuid: "345e6789-abcd-1234-ef00-1234567890ab",
    account_number: "123456789",
    routing_number: "021000021",
    account_holder_name: "John Doe",
    bank_name: "Test Bank",
    account_type: "checking",
    bank_address: "123 Test St, Test City, TS 12345",
    bank_city: "Test City",
    bank_state: "TS",
    bank_postal_code: "12345",
    bank_country: "US",
    residential_country_code: "US",
    residential_state: "MN",
    residential_city: "Test City",
    residential_address1: "123 Test St",
    residential_postal_code: "12345",
  });

  // Crypto address form state
  const [cryptoAddressForm, setCryptoAddressForm] = useState({
    customer_uuid: "e6789-abcd-1234-ef00-1234567890ab",
    chain: "ethereum",
    asset: "USDC",
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    label: "My Ethereum Wallet",
  });

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    transfer_type: "on-ramp",
    on_behalf_of: "w",
    source_asset: "USD",
    source_amount: "100.00",
    source_chain: "",
    destination_asset: "USDC",
    destination_chain: "ethereum",
    destination_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    transfer_purpose: "Salary",
    is_self_transfer: false,
    commission_percentage: "1",
    commission_amount: "1.00",
    application_transfer_uuid: `txn_${Date.now()}`,
  });

  const [listCustomerId, setListCustomerId] = useState("");
  const [transferId, setTransferId] = useState("");

  // Subscriptions (webhook subscriptions) state
  const [subscriptionForm, setSubscriptionForm] = useState({
    endpoint: "https://example.com/webhook",
    notification_types: ["*"],
    name: "Transactions Webhook",
    enabled: true,
    restricted: false,
    // Harbor docs: /api/v1/notifications/subscriptions
    endpointPath: "/notifications/subscriptions",
  });
  const [subscriptionId, setSubscriptionId] = useState("");

  const [webhookEvents, setWebhookEvents] = useState([]);
  const [webhookViewerError, setWebhookViewerError] = useState(null);
  const [webhookViewerLoading, setWebhookViewerLoading] = useState(false);

  const MAX_WEBHOOK_EVENTS_UI = 50;

  // Webhook verifier state (client-side helper for verifying signatures)
  const [verifier, setVerifier] = useState({
    secret: "",
    signature: "",
    payload: '{"example":"payload"}',
    signatureFormat: "hex", // or 'base64'
  });
  const [verifierResult, setVerifierResult] = useState(null);

  // Centralized request helper with improved error handling and debug info
  const makeRequest = async (
    endpoint,
    method = "GET",
    body = null,
    optionsOverrides = {}
  ) => {
    if (!apiKey) {
      setError("Please enter your API key");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      };

      if (
        (method === "POST" || method === "PUT" || method === "PATCH") &&
        body
      ) {
        headers["X-Idempotency-Key"] = `idem_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 10)}`;
      }

      const options = {
        method,
        headers,
        ...optionsOverrides,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const uri = `${API_BASE_URL}${endpoint}`;

      console.log("Request:", { uri, options });

      const res = await fetch(uri, options);

      // Try parse JSON, fallback to text
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = await res.text();
      }

      const resHeaders = {};
      res.headers.forEach((v, k) => (resHeaders[k] = v));

      console.log("Response:", {
        status: res.status,
        statusText: res.statusText,
        data,
        headers: resHeaders,
      });

      if (!res.ok) {
        // Prefer API error message if present
        const msg =
          data && data.message
            ? data.message
            : `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(msg);
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
        headers: resHeaders,
        curl: generateCurl(uri, options, body),
      });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Small helper to generate a curl string for debugging
  const generateCurl = (uri, options, body) => {
    const headers = options.headers || {};
    const headersPart = Object.keys(headers)
      .map((h) => `-H '${h}: ${headers[h]}'`)
      .join(" ");
    const dataPart = body ? `--data '${JSON.stringify(body)}'` : "";
    const methodPart =
      options.method && options.method !== "GET" ? `-X ${options.method}` : "";
    return `curl ${methodPart} ${headersPart} ${dataPart} '${uri}'`;
  };

  // Existing API actions (customers, bank accounts, crypto addresses, transfers)
  const createCustomer = () => {
    makeRequest("/customers", "POST", customerForm);
  };

  const listCustomers = () => {
    makeRequest("/customers", "GET");
  };

  const getCustomer = () => {
    if (!listCustomerId) {
      setError("Please enter a customer UUID");
      return;
    }
    makeRequest(`/customers/${listCustomerId}`, "GET");
  };

  const createBankAccount = () => {
    if (!bankAccountForm.customer_uuid) {
      setError("Please enter a customer UUID");
      return;
    }
    makeRequest(
      `/customers/${bankAccountForm.customer_uuid}/bank_accounts`,
      "POST",
      {
        account_number: bankAccountForm.account_number,
        routing_number: bankAccountForm.routing_number,
        account_holder_name: bankAccountForm.account_holder_name,
        bank_name: bankAccountForm.bank_name,
        account_type: bankAccountForm.account_type,
        bank_address: bankAccountForm.bank_address,
        bank_city: bankAccountForm.bank_city,
        bank_state: bankAccountForm.bank_state,
        bank_postal_code: bankAccountForm.bank_postal_code,
        bank_country: bankAccountForm.bank_country,
        residential_country_code: bankAccountForm.residential_country_code,
        residential_state: bankAccountForm.residential_state,
        residential_city: bankAccountForm.residential_city,
        residential_address_1: bankAccountForm.residential_address1,
        residential_postal_code: bankAccountForm.residential_postal_code,
      }
    );
  };

  const listBankAccounts = () => {
    if (!listCustomerId) {
      setError("Please enter a customer UUID");
      return;
    }
    makeRequest(`/customers/${listCustomerId}/bank_accounts`, "GET");
  };

  const createCryptoAddress = () => {
    if (!cryptoAddressForm.customer_uuid) {
      setError("Please enter a customer UUID");
      return;
    }
    makeRequest(
      `/customers/${cryptoAddressForm.customer_uuid}/crypto_addresses`,
      "POST",
      {
        chain: cryptoAddressForm.chain,
        asset: cryptoAddressForm.asset,
        address: cryptoAddressForm.address,
        label: cryptoAddressForm.label,
      }
    );
  };

  const listCryptoAddresses = () => {
    if (!listCustomerId) {
      setError("Please enter a customer UUID");
      return;
    }
    makeRequest(`/customers/${listCustomerId}/crypto_addresses`, "GET");
  };

  const createTransfer = () => {
    if (!transferForm.on_behalf_of) {
      setError("Please enter a customer UUID (on_behalf_of)");
      return;
    }

    let transferData = {
      on_behalf_of: transferForm.on_behalf_of,
      commission: {
        percentage: transferForm.commission_percentage,
        amount: transferForm.commission_amount,
      },
      application_transfer_uuid: transferForm.application_transfer_uuid,
    };

    if (transferForm.transfer_type === "on-ramp") {
      transferData.source = {
        asset: transferForm.source_asset,
        amount: transferForm.source_amount,
      };
      transferData.destination = {
        asset: transferForm.destination_asset,
        chain: transferForm.destination_chain,
        address: transferForm.destination_address,
        transfer_purpose: transferForm.transfer_purpose,
        is_self_transfer: transferForm.is_self_transfer,
      };
    } else if (transferForm.transfer_type === "off-ramp") {
      transferData.source = {
        asset: transferForm.source_asset,
        chain: transferForm.source_chain,
        amount: transferForm.source_amount,
      };
      transferData.destination = {
        asset: transferForm.destination_asset,
        amount: transferForm.source_amount,
      };
    } else if (transferForm.transfer_type === "on-chain") {
      transferData.source = {
        chain: transferForm.source_chain,
        asset: transferForm.source_asset,
        amount: transferForm.source_amount,
      };
      transferData.destination = {
        asset: transferForm.destination_asset,
        chain: transferForm.destination_chain,
        address: transferForm.destination_address,
        is_self_transfer: transferForm.is_self_transfer,
        transfer_purpose: transferForm.transfer_purpose,
      };
    }

    makeRequest("/transfers", "POST", transferData);
  };

  const getTransfer = () => {
    if (!transferId) {
      setError("Please enter a transfer UUID");
      return;
    }
    makeRequest(`/transfers/${transferId}`, "GET");
  };

  const listTransfers = () => {
    makeRequest("/transfers", "GET");
  };

  // --- Subscriptions (webhook) API helpers ---
  // NOTE: default endpointPath can be changed in the subscription form if your API differs.
  const createSubscription = () => {
    if (!subscriptionForm.endpoint) {
      setError("Please enter a webhook endpoint URL");
      return;
    }

    const notificationTypes = Array.isArray(subscriptionForm.notification_types)
      ? subscriptionForm.notification_types.filter(Boolean)
      : [];

    const payload = {
      endpoint: subscriptionForm.endpoint,
      notification_types: notificationTypes.length ? notificationTypes : ["*"],
      name: subscriptionForm.name,
      enabled: subscriptionForm.enabled,
      restricted: subscriptionForm.restricted,
    };
    makeRequest(
      subscriptionForm.endpointPath || "/notifications/subscriptions",
      "POST",
      payload
    );
  };

  const listSubscriptions = () => {
    makeRequest(
      subscriptionForm.endpointPath || "/notifications/subscriptions",
      "GET"
    );
  };

  const getSubscription = () => {
    if (!subscriptionId) {
      setError("Please enter a subscription UUID");
      return;
    }
    makeRequest(
      `${
        subscriptionForm.endpointPath || "/notifications/subscriptions"
      }/${subscriptionId}`,
      "GET"
    );
  };

  const deleteSubscription = () => {
    if (!subscriptionId) {
      setError("Please enter a subscription UUID");
      return;
    }
    makeRequest(
      `${
        subscriptionForm.endpointPath || "/notifications/subscriptions"
      }/${subscriptionId}`,
      "DELETE"
    );
  };

  const fetchWebhookEvents = async () => {
    setWebhookViewerLoading(true);
    setWebhookViewerError(null);
    try {
      const res = await fetch(`${WEBHOOK_VIEWER_URL}/events`);
      if (!res.ok) {
        throw new Error(
          `Local listener responded with HTTP ${res.status} ${res.statusText}`
        );
      }
      const data = await res.json();
      setWebhookEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      setWebhookViewerError(err.message || String(err));
    } finally {
      setWebhookViewerLoading(false);
    }
  };

  const clearWebhookEvents = async () => {
    setWebhookViewerError(null);
    try {
      const res = await fetch(`${WEBHOOK_VIEWER_URL}/events/reset`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(
          `Unable to clear events: HTTP ${res.status} ${res.statusText}`
        );
      }
      setWebhookEvents([]);
    } catch (err) {
      setWebhookViewerError(err.message || String(err));
    }
  };

  // --- Webhook verification helper (client-side tester) ---
  // Uses Web Crypto API to compute HMAC-SHA256 of payload with provided secret.
  // Many Harbor webhook implementations sign payload with HMAC-SHA256. This helper
  // computes hex and base64 and compares to the provided signature string.
  const computeHmacSha256 = async (secret, payload) => {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const alg = { name: "HMAC", hash: "SHA-256" };
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      alg,
      false,
      ["sign"]
    );
    const sigBuffer = await window.crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(payload)
    );
    const bytes = new Uint8Array(sigBuffer);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const b64 = btoa(String.fromCharCode(...bytes));
    return { hex, base64: b64 };
  };

  const verifyWebhook = async () => {
    setVerifierResult(null);
    setError(null);

    if (!verifier.secret || !verifier.signature || !verifier.payload) {
      setError("Please provide secret, signature, and payload to verify.");
      return;
    }

    try {
      const { hex, base64 } = await computeHmacSha256(
        verifier.secret,
        verifier.payload
      );
      const provided = verifier.signature.trim();

      const matchHex = provided === hex;
      const matchBase64 = provided === base64;

      const match = matchHex || matchBase64;

      setVerifierResult({
        ok: match,
        computed: { hex, base64 },
        provided,
      });
    } catch (err) {
      setError("Verifier error: " + (err.message || String(err)));
    }
  };

  // Real-time listener: EventSource to webhook-server's /events/stream
  useEffect(() => {
    let es;
    // only open live stream while user is on subscriptions tab
    if (activeTab === "subscriptions") {
      setWebhookViewerError(null);
      try {
        es = new EventSource(`${WEBHOOK_VIEWER_URL}/events/stream`);
        es.onmessage = (evt) => {
          try {
            const parsed = JSON.parse(evt.data);
            setWebhookEvents((prev) =>
              [parsed, ...prev].slice(0, MAX_WEBHOOK_EVENTS_UI)
            );
          } catch (err) {
            console.warn("SSE parse error", err);
          }
        };
        es.onerror = (err) => {
          console.warn("EventSource error", err);
          setWebhookViewerError("SSE connection error");
          // keep connection open for automatic reconnect attempts by browser
        };
      } catch (err) {
        setWebhookViewerError(err.message || String(err));
      }
    }

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [activeTab, WEBHOOK_VIEWER_URL]);

  return (
    <div className="app">
      <div className="container">
        <div className="header-card">
          <div className="header-content">
            <div>
              <h1 className="title">
                <Wallet className="icon-primary" />
                OwlPay Harbor API Tester
              </h1>
              <p className="subtitle">
                Customer Solutions Engineer Integration Tool
              </p>
            </div>
            <div className="badge">Sandbox Environment</div>
          </div>

          <div className="api-key-section">
            <label className="label">API Key (Sandbox)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Harbor API Key"
              className="input"
            />
            <p className="help-text">
              Contact [email protected] to get your sandbox API key
            </p>
          </div>
        </div>

        <div className="main-card">
          <div className="tabs">
            <button
              onClick={() => setActiveTab("customers")}
              className={`tab ${activeTab === "customers" ? "active" : ""}`}
            >
              <Users size={18} />
              Customers
            </button>
            <button
              onClick={() => setActiveTab("bank-accounts")}
              className={`tab ${activeTab === "bank-accounts" ? "active" : ""}`}
            >
              <Building2 size={18} />
              Bank Accounts
            </button>
            <button
              onClick={() => setActiveTab("crypto-addresses")}
              className={`tab ${
                activeTab === "crypto-addresses" ? "active" : ""
              }`}
            >
              <Wallet size={18} />
              Crypto Addresses
            </button>
            <button
              onClick={() => setActiveTab("transfers")}
              className={`tab ${activeTab === "transfers" ? "active" : ""}`}
            >
              <ArrowRightLeft size={18} />
              Transfers
            </button>
            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`tab ${activeTab === "subscriptions" ? "active" : ""}`}
            >
              <CheckCircle size={18} />
              Subscriptions
            </button>
          </div>

          <div className="tab-content">
            {/* CUSTOMERS TAB */}
            {activeTab === "customers" && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">Create Customer</h3>
                  <div className="form-grid">
                    <div>
                      <label className="label">Type</label>
                      <select
                        value={customerForm.type}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            type: e.target.value,
                          })
                        }
                        className="input"
                      >
                        <option value="individual">Individual</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            email: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">First Name</label>
                      <input
                        value={customerForm.first_name}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            first_name: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input
                        value={customerForm.last_name}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            last_name: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Phone Number</label>
                      <input
                        value={customerForm.phone_number}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            phone_number: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Birth Date</label>
                      <input
                        type="date"
                        value={customerForm.birth_date}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            birth_date: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                  <button
                    onClick={createCustomer}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    <Send size={18} />
                    Create Customer
                  </button>
                </div>

                <div className="divider">
                  <h3 className="section-title">List/Get Customers</h3>
                  <div className="flex-row">
                    <div className="flex-1">
                      <label className="label">Customer UUID (optional)</label>
                      <input
                        value={listCustomerId}
                        onChange={(e) => setListCustomerId(e.target.value)}
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>
                    <button
                      onClick={listCustomers}
                      disabled={loading}
                      className="btn btn-success"
                    >
                      List All
                    </button>
                    <button
                      onClick={getCustomer}
                      disabled={loading}
                      className="btn btn-info"
                    >
                      Get Single
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BANK ACCOUNTS TAB */}
            {activeTab === "bank-accounts" && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">Add Bank Account</h3>
                  <div className="form-grid">
                    <div className="full-width">
                      <label className="label">Customer UUID *</label>
                      <input
                        value={bankAccountForm.customer_uuid}
                        onChange={(e) =>
                          setBankAccountForm({
                            ...bankAccountForm,
                            customer_uuid: e.target.value,
                          })
                        }
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Account Number</label>
                      <input
                        value={bankAccountForm.account_number}
                        onChange={(e) =>
                          setBankAccountForm({
                            ...bankAccountForm,
                            account_number: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Routing Number</label>
                      <input
                        value={bankAccountForm.routing_number}
                        onChange={(e) =>
                          setBankAccountForm({
                            ...bankAccountForm,
                            routing_number: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Account Holder Name</label>
                      <input
                        value={bankAccountForm.account_holder_name}
                        onChange={(e) =>
                          setBankAccountForm({
                            ...bankAccountForm,
                            account_holder_name: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Bank Name</label>
                      <input
                        value={bankAccountForm.bank_name}
                        onChange={(e) =>
                          setBankAccountForm({
                            ...bankAccountForm,
                            bank_name: e.target.value,
                          })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                  <button
                    onClick={createBankAccount}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    <Building2 size={18} />
                    Add Bank Account
                  </button>
                </div>

                <div className="divider">
                  <h3 className="section-title">List Bank Accounts</h3>
                  <div className="flex-row">
                    <div className="flex-1">
                      <label className="label">Customer UUID *</label>
                      <input
                        value={listCustomerId}
                        onChange={(e) => setListCustomerId(e.target.value)}
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>
                    <button
                      onClick={listBankAccounts}
                      disabled={loading}
                      className="btn btn-success"
                    >
                      List Accounts
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CRYPTO ADDRESSES TAB */}
            {activeTab === "crypto-addresses" && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">Add Blockchain Address</h3>
                  <div className="form-grid">
                    <div className="full-width">
                      <label className="label">Customer UUID *</label>
                      <input
                        value={cryptoAddressForm.customer_uuid}
                        onChange={(e) =>
                          setCryptoAddressForm({
                            ...cryptoAddressForm,
                            customer_uuid: e.target.value,
                          })
                        }
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Chain</label>
                      <select
                        value={cryptoAddressForm.chain}
                        onChange={(e) =>
                          setCryptoAddressForm({
                            ...cryptoAddressForm,
                            chain: e.target.value,
                          })
                        }
                        className="input"
                      >
                        <option value="ethereum">Ethereum</option>
                        <option value="stellar">Stellar</option>
                        <option value="polygon">Polygon</option>
                        <option value="arbitrum">Arbitrum</option>
                        <option value="optimism">Optimism</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Asset</label>
                      <input
                        value={cryptoAddressForm.asset}
                        onChange={(e) =>
                          setCryptoAddressForm({
                            ...cryptoAddressForm,
                            asset: e.target.value,
                          })
                        }
                        placeholder="USDC"
                        className="input"
                      />
                    </div>
                    <div className="full-width">
                      <label className="label">Wallet Address</label>
                      <input
                        value={cryptoAddressForm.address}
                        onChange={(e) =>
                          setCryptoAddressForm({
                            ...cryptoAddressForm,
                            address: e.target.value,
                          })
                        }
                        placeholder="0x..."
                        className="input"
                      />
                    </div>
                    <div className="full-width">
                      <label className="label">Label</label>
                      <input
                        value={cryptoAddressForm.label}
                        onChange={(e) =>
                          setCryptoAddressForm({
                            ...cryptoAddressForm,
                            label: e.target.value,
                          })
                        }
                        placeholder="My Wallet"
                        className="input"
                      />
                    </div>
                  </div>
                  <button
                    onClick={createCryptoAddress}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    <Wallet size={18} />
                    Add Address
                  </button>
                </div>

                <div className="divider">
                  <h3 className="section-title">List Blockchain Addresses</h3>
                  <div className="flex-row">
                    <div className="flex-1">
                      <label className="label">Customer UUID *</label>
                      <input
                        value={listCustomerId}
                        onChange={(e) => setListCustomerId(e.target.value)}
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>
                    <button
                      onClick={listCryptoAddresses}
                      disabled={loading}
                      className="btn btn-success"
                    >
                      List Addresses
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TRANSFERS TAB */}
            {activeTab === "transfers" && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">Create Transfer</h3>
                  <div className="form-grid">
                    <div className="full-width">
                      <label className="label">Transfer Type</label>
                      <select
                        value={transferForm.transfer_type}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            transfer_type: e.target.value,
                          })
                        }
                        className="input"
                      >
                        <option value="on-ramp">On-Ramp (Fiat → Crypto)</option>
                        <option value="off-ramp">
                          Off-Ramp (Crypto → Fiat)
                        </option>
                        <option value="on-chain">
                          On-Chain (Crypto → Crypto)
                        </option>
                      </select>
                    </div>
                    <div className="full-width">
                      <label className="label">
                        Customer UUID (on_behalf_of) *
                      </label>
                      <input
                        value={transferForm.on_behalf_of}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            on_behalf_of: e.target.value,
                          })
                        }
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>

                    <div className="full-width info-box">
                      <h4 className="info-title">Source</h4>
                      <div className="form-grid">
                        {transferForm.transfer_type !== "on-ramp" && (
                          <div>
                            <label className="label">Chain</label>
                            <select
                              value={transferForm.source_chain}
                              onChange={(e) =>
                                setTransferForm({
                                  ...transferForm,
                                  source_chain: e.target.value,
                                })
                              }
                              className="input"
                            >
                              <option value="">Select chain</option>
                              <option value="ethereum">Ethereum</option>
                              <option value="stellar">Stellar</option>
                              <option value="polygon">Polygon</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="label">Asset</label>
                          <input
                            value={transferForm.source_asset}
                            onChange={(e) =>
                              setTransferForm({
                                ...transferForm,
                                source_asset: e.target.value,
                              })
                            }
                            className="input"
                            placeholder="USD or USDC"
                          />
                        </div>
                        <div>
                          <label className="label">Amount</label>
                          <input
                            type="number"
                            value={transferForm.source_amount}
                            onChange={(e) =>
                              setTransferForm({
                                ...transferForm,
                                source_amount: e.target.value,
                              })
                            }
                            className="input"
                            placeholder="100.00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="full-width info-box">
                      <h4 className="info-title">Destination</h4>
                      <div className="form-grid">
                        {transferForm.transfer_type !== "off-ramp" && (
                          <div>
                            <label className="label">Chain</label>
                            <select
                              value={transferForm.destination_chain}
                              onChange={(e) =>
                                setTransferForm({
                                  ...transferForm,
                                  destination_chain: e.target.value,
                                })
                              }
                              className="input"
                            >
                              <option value="ethereum">Ethereum</option>
                              <option value="stellar">Stellar</option>
                              <option value="polygon">Polygon</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="label">Asset</label>
                          <input
                            value={transferForm.destination_asset}
                            onChange={(e) =>
                              setTransferForm({
                                ...transferForm,
                                destination_asset: e.target.value,
                              })
                            }
                            className="input"
                            placeholder="USDC or USD"
                          />
                        </div>
                        {transferForm.transfer_type !== "off-ramp" && (
                          <>
                            <div className="full-width">
                              <label className="label">
                                Destination Address
                              </label>
                              <input
                                value={transferForm.destination_address}
                                onChange={(e) =>
                                  setTransferForm({
                                    ...transferForm,
                                    destination_address: e.target.value,
                                  })
                                }
                                className="input"
                                placeholder="0x..."
                              />
                            </div>
                            <div>
                              <label className="label">Transfer Purpose</label>
                              <input
                                value={transferForm.transfer_purpose}
                                onChange={(e) =>
                                  setTransferForm({
                                    ...transferForm,
                                    transfer_purpose: e.target.value,
                                  })
                                }
                                className="input"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="full-width">
                      <label className="label">Application Transfer UUID</label>
                      <input
                        value={transferForm.application_transfer_uuid}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            application_transfer_uuid: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="Unique ID for this transfer"
                      />
                    </div>
                  </div>
                  <button
                    onClick={createTransfer}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    <ArrowRightLeft size={18} />
                    Create Transfer
                  </button>
                </div>

                <div className="divider">
                  <h3 className="section-title">Get Transfer Status</h3>
                  <div className="flex-row">
                    <div className="flex-1">
                      <label className="label">Transfer UUID</label>
                      <input
                        value={transferId}
                        onChange={(e) => setTransferId(e.target.value)}
                        placeholder="txn_xxxxx"
                        className="input"
                      />
                    </div>
                    <button
                      onClick={getTransfer}
                      disabled={loading}
                      className="btn btn-info"
                    >
                      Get Status
                    </button>
                    <button
                      onClick={listTransfers}
                      disabled={loading}
                      className="btn btn-success"
                    >
                      List All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBSCRIPTIONS TAB */}
            {activeTab === "subscriptions" && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">
                    Manage Webhook Subscriptions
                  </h3>
                  <div className="form-grid">
                    <div className="full-width">
                      <label className="label">API Endpoint Path</label>
                      <input
                        value={subscriptionForm.endpointPath}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            endpointPath: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="/notifications/subscriptions"
                      />
                      <p className="help-text">
                        Harbor default is /api/v1/notifications/subscriptions.
                      </p>
                    </div>

                    <div className="full-width">
                      <label className="label">Subscription Name</label>
                      <input
                        value={subscriptionForm.name}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            name: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="Transactions Webhook"
                      />
                    </div>

                    <div className="full-width">
                      <label className="label">Webhook Endpoint URL</label>
                      <input
                        value={subscriptionForm.endpoint}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            endpoint: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="https://yourapp.example/webhook"
                      />
                    </div>

                    <div className="full-width">
                      <label className="label">
                        Notification Types (comma separated)
                      </label>
                      <input
                        value={
                          Array.isArray(subscriptionForm.notification_types)
                            ? subscriptionForm.notification_types.join(",")
                            : subscriptionForm.notification_types
                        }
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            notification_types: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className="input"
                        placeholder="*, transfer.created, transfer.updated"
                      />
                      <p className="help-text">
                        Use * for all events or list specific ones from the
                        Harbor docs.
                      </p>
                    </div>

                    <div>
                      <label className="label">Enabled</label>
                      <select
                        value={subscriptionForm.enabled ? "true" : "false"}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            enabled: e.target.value === "true",
                          })
                        }
                        className="input"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Restricted</label>
                      <select
                        value={subscriptionForm.restricted ? "true" : "false"}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            restricted: e.target.value === "true",
                          })
                        }
                        className="input"
                      >
                        <option value="false">false</option>
                        <option value="true">true</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-row">
                    <button
                      onClick={createSubscription}
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      Create Subscription
                    </button>
                    <button
                      onClick={listSubscriptions}
                      disabled={loading}
                      className="btn btn-success"
                    >
                      List Subscriptions
                    </button>
                  </div>
                </div>

                <div className="divider">
                  <h3 className="section-title">Get / Delete Subscription</h3>
                  <div className="flex-row">
                    <div className="flex-1">
                      <label className="label">Subscription UUID</label>
                      <input
                        value={subscriptionId}
                        onChange={(e) => setSubscriptionId(e.target.value)}
                        placeholder="sub_xxxxx"
                        className="input"
                      />
                    </div>
                    <button
                      onClick={getSubscription}
                      disabled={loading}
                      className="btn btn-info"
                    >
                      Get Subscription
                    </button>
                    <button
                      onClick={deleteSubscription}
                      disabled={loading}
                      className="btn btn-danger"
                    >
                      Delete Subscription
                    </button>
                  </div>
                </div>

                <div className="divider">
                  <h3 className="section-title">
                    Webhook Verifier (client-side tester)
                  </h3>
                  <div className="form-grid">
                    <div className="full-width">
                      <label className="label">Signing Secret</label>
                      <input
                        value={verifier.secret}
                        onChange={(e) =>
                          setVerifier({ ...verifier, secret: e.target.value })
                        }
                        className="input"
                        placeholder="Your webhook signing secret"
                      />
                    </div>
                    <div className="full-width">
                      <label className="label">
                        Signature (from Harbor header)
                      </label>
                      <input
                        value={verifier.signature}
                        onChange={(e) =>
                          setVerifier({
                            ...verifier,
                            signature: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="hex or base64 signature"
                      />
                    </div>
                    <div className="full-width">
                      <label className="label">Payload (raw body)</label>
                      <textarea
                        value={verifier.payload}
                        onChange={(e) =>
                          setVerifier({ ...verifier, payload: e.target.value })
                        }
                        className="input"
                        rows={6}
                      />
                    </div>
                    <div>
                      <label className="label">Signature Format</label>
                      <select
                        value={verifier.signatureFormat}
                        onChange={(e) =>
                          setVerifier({
                            ...verifier,
                            signatureFormat: e.target.value,
                          })
                        }
                        className="input"
                      >
                        <option value="hex">hex</option>
                        <option value="base64">base64</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-row">
                    <button
                      onClick={verifyWebhook}
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      Verify Signature
                    </button>
                  </div>

                  {verifierResult && (
                    <div
                      className={`alert ${
                        verifierResult.ok ? "alert-success" : "alert-error"
                      }`}
                    >
                      <div>
                        <strong>Match:</strong>{" "}
                        {verifierResult.ok ? "YES" : "NO"}
                      </div>
                      <div>
                        <strong>Provided:</strong> {verifierResult.provided}
                      </div>
                      <div>
                        <strong>Computed (hex):</strong>{" "}
                        {verifierResult.computed.hex}
                      </div>
                      <div>
                        <strong>Computed (base64):</strong>{" "}
                        {verifierResult.computed.base64}
                      </div>
                    </div>
                  )}
                </div>

                <div className="divider">
                  <h3 className="section-title">
                    Local Webhook Listener (ngrok helper)
                  </h3>
                  <p className="help-text">
                    Run <code>npm run webhook-server</code> and point ngrok to{" "}
                    {WEBHOOK_VIEWER_URL}/webhooks/harbor. Use the HTTPS URL from
                    ngrok as your Harbor subscription endpoint.
                  </p>
                  <div className="flex-row">
                    <button
                      onClick={fetchWebhookEvents}
                      className="btn btn-info"
                      disabled={webhookViewerLoading}
                    >
                      Fetch Latest Events
                    </button>
                    <button
                      onClick={clearWebhookEvents}
                      className="btn btn-danger"
                    >
                      Clear Stored Events
                    </button>
                  </div>
                  {webhookViewerLoading && (
                    <div className="loading">
                      <div className="spinner"></div>
                      <span>Fetching events from local listener...</span>
                    </div>
                  )}
                  {webhookViewerError && (
                    <div className="alert alert-error">
                      <AlertCircle size={20} />
                      <div>
                        <strong>Local listener error:</strong>{" "}
                        {webhookViewerError}
                      </div>
                    </div>
                  )}
                  {!!webhookEvents.length && (
                    <div className="code-block">
                      <pre>{JSON.stringify(webhookEvents, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Response Display */}
          {(response || error || loading) && (
            <div className="response-section">
              <h3 className="section-title">API Response</h3>

              {loading && (
                <div className="loading">
                  <div className="spinner"></div>
                  <span>Making request...</span>
                </div>
              )}

              {error && (
                <div className="alert alert-error">
                  <AlertCircle size={20} />
                  <div>
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              )}

              {response && (
                <div className="alert alert-success">
                  <CheckCircle size={20} />
                  <div>
                    <strong>Status {response.status}:</strong>{" "}
                    {response.statusText || "Request successful"}
                  </div>
                </div>
              )}

              {response && response.curl && (
                <div className="code-block">
                  <pre>{response.curl}</pre>
                </div>
              )}

              {response && (
                <div className="code-block">
                  <pre>{JSON.stringify(response.data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
