// App.jsx - Main application component
import React, { useState } from 'react';
import { Send, Users, Building2, Wallet, ArrowRightLeft, AlertCircle, CheckCircle } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'https://harbor-sandbox.owlpay.com/api/v1';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('customers');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    type: 'individual',
    first_name: 'John',
    middle_name: 'Michael',
    last_name: 'Doe',
    email: '[email protected]',
    phone_country_code: 'US',
    phone_number: '555-555-1234',
    birth_date: '1988-04-15',
    description: 'Test customer'
  });

  // Bank account form state
  const [bankAccountForm, setBankAccountForm] = useState({
    customer_uuid: '345e6789-abcd-1234-ef00-1234567890ab',
    account_number: '123456789',
    routing_number: '021000021',
    account_holder_name: 'John Doe',
    bank_name: 'Test Bank',
    account_type: 'checking'
  });

  // Crypto address form state
  const [cryptoAddressForm, setCryptoAddressForm] = useState({
    customer_uuid: 'e6789-abcd-1234-ef00-1234567890ab',
    chain: 'ethereum',
    asset: 'USDC',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    label: 'My Ethereum Wallet'
  });

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    transfer_type: 'on-ramp',
    on_behalf_of: 'w',
    source_asset: 'USD',
    source_amount: '100.00',
    source_chain: '',
    destination_asset: 'USDC',
    destination_chain: 'ethereum',
    destination_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    transfer_purpose: 'Salary',
    is_self_transfer: false,
    commission_percentage: '1',
    commission_amount: '1.00',
    application_transfer_uuid: `txn_${Date.now()}`
  });

  const [listCustomerId, setListCustomerId] = useState('');
  const [transferId, setTransferId] = useState('');

  const makeRequest = async (endpoint, method = 'GET', body = null) => {
    if (!apiKey) {
      setError('Please enter your API key');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      };

      if (method === 'POST' && body) {
        headers['X-Idempotency-Key'] = `idem_${Date.now()}_${Math.random()}`;
      }

      const options = {
        method,
        headers,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }
      console.log('Request Options:', options);

      const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const data = await res.json();

      console.log('Response Data:', data);

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      setResponse({ status: res.status, data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = () => {
    makeRequest('/customers', 'POST', customerForm);
  };

  const listCustomers = () => {
    makeRequest('/customers', 'GET');
  };

  const getCustomer = () => {
    if (!listCustomerId) {
      setError('Please enter a customer UUID');
      return;
    }
    makeRequest(`/customers/${listCustomerId}`, 'GET');
  };

  const createBankAccount = () => {
    if (!bankAccountForm.customer_uuid) {
      setError('Please enter a customer UUID');
      return;
    }
    makeRequest(`/customers/${bankAccountForm.customer_uuid}/bank_accounts`, 'POST', {
      account_number: bankAccountForm.account_number,
      routing_number: bankAccountForm.routing_number,
      account_holder_name: bankAccountForm.account_holder_name,
      bank_name: bankAccountForm.bank_name,
      account_type: bankAccountForm.account_type
    });
  };

  const listBankAccounts = () => {
    if (!listCustomerId) {
      setError('Please enter a customer UUID');
      return;
    }
    makeRequest(`/customers/${listCustomerId}/bank_accounts`, 'GET');
  };

  const createCryptoAddress = () => {
    if (!cryptoAddressForm.customer_uuid) {
      setError('Please enter a customer UUID');
      return;
    }
    makeRequest(`/customers/${cryptoAddressForm.customer_uuid}/blockchain_addresses`, 'POST', {
      chain: cryptoAddressForm.chain,
      asset: cryptoAddressForm.asset,
      address: cryptoAddressForm.address,
      label: cryptoAddressForm.label
    });
  };

  const listCryptoAddresses = () => {
    if (!listCustomerId) {
      setError('Please enter a customer UUID');
      return;
    }
    makeRequest(`/customers/${listCustomerId}/blockchain_addresses`, 'GET');
  };

  const createTransfer = () => {
    if (!transferForm.on_behalf_of) {
      setError('Please enter a customer UUID (on_behalf_of)');
      return;
    }

    let transferData = {
      on_behalf_of: transferForm.on_behalf_of,
      commission: {
        percentage: transferForm.commission_percentage,
        amount: transferForm.commission_amount
      },
      application_transfer_uuid: transferForm.application_transfer_uuid
    };

    if (transferForm.transfer_type === 'on-ramp') {
      transferData.source = {
        asset: transferForm.source_asset,
        amount: transferForm.source_amount
      };
      transferData.destination = {
        asset: transferForm.destination_asset,
        chain: transferForm.destination_chain,
        address: transferForm.destination_address,
        transfer_purpose: transferForm.transfer_purpose,
        is_self_transfer: transferForm.is_self_transfer
      };
    } else if (transferForm.transfer_type === 'off-ramp') {
      transferData.source = {
        asset: transferForm.source_asset,
        chain: transferForm.source_chain,
        amount: transferForm.source_amount
      };
      transferData.destination = {
        asset: transferForm.destination_asset,
        amount: transferForm.source_amount
      };
    } else if (transferForm.transfer_type === 'on-chain') {
      transferData.source = {
        chain: transferForm.source_chain,
        asset: transferForm.source_asset,
        amount: transferForm.source_amount
      };
      transferData.destination = {
        asset: transferForm.destination_asset,
        chain: transferForm.destination_chain,
        address: transferForm.destination_address,
        is_self_transfer: transferForm.is_self_transfer,
        transfer_purpose: transferForm.transfer_purpose
      };
    }

    makeRequest('/transfers', 'POST', transferData);
  };

  const getTransfer = () => {
    if (!transferId) {
      setError('Please enter a transfer UUID');
      return;
    }
    makeRequest(`/transfers/${transferId}`, 'GET');
  };

  const listTransfers = () => {
    makeRequest('/transfers', 'GET');
  };

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
              <p className="subtitle">Customer Solutions Engineer Integration Tool</p>
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
              onClick={() => setActiveTab('customers')}
              className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
            >
              <Users size={18} />
              Customers
            </button>
            <button
              onClick={() => setActiveTab('bank-accounts')}
              className={`tab ${activeTab === 'bank-accounts' ? 'active' : ''}`}
            >
              <Building2 size={18} />
              Bank Accounts
            </button>
            <button
              onClick={() => setActiveTab('crypto-addresses')}
              className={`tab ${activeTab === 'crypto-addresses' ? 'active' : ''}`}
            >
              <Wallet size={18} />
              Crypto Addresses
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`tab ${activeTab === 'transfers' ? 'active' : ''}`}
            >
              <ArrowRightLeft size={18} />
              Transfers
            </button>
          </div>

          <div className="tab-content">
            {/* CUSTOMERS TAB */}
            {activeTab === 'customers' && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">Create Customer</h3>
                  <div className="form-grid">
                    <div>
                      <label className="label">Type</label>
                      <select
                        value={customerForm.type}
                        onChange={(e) => setCustomerForm({...customerForm, type: e.target.value})}
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
                        onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">First Name</label>
                      <input
                        value={customerForm.first_name}
                        onChange={(e) => setCustomerForm({...customerForm, first_name: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input
                        value={customerForm.last_name}
                        onChange={(e) => setCustomerForm({...customerForm, last_name: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Phone Number</label>
                      <input
                        value={customerForm.phone_number}
                        onChange={(e) => setCustomerForm({...customerForm, phone_number: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Birth Date</label>
                      <input
                        type="date"
                        value={customerForm.birth_date}
                        onChange={(e) => setCustomerForm({...customerForm, birth_date: e.target.value})}
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
                    <button onClick={listCustomers} disabled={loading} className="btn btn-success">
                      List All
                    </button>
                    <button onClick={getCustomer} disabled={loading} className="btn btn-info">
                      Get Single
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BANK ACCOUNTS TAB */}
            {activeTab === 'bank-accounts' && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">Add Bank Account</h3>
                  <div className="form-grid">
                    <div className="full-width">
                      <label className="label">Customer UUID *</label>
                      <input
                        value={bankAccountForm.customer_uuid}
                        onChange={(e) => setBankAccountForm({...bankAccountForm, customer_uuid: e.target.value})}
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Account Number</label>
                      <input
                        value={bankAccountForm.account_number}
                        onChange={(e) => setBankAccountForm({...bankAccountForm, account_number: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Routing Number</label>
                      <input
                        value={bankAccountForm.routing_number}
                        onChange={(e) => setBankAccountForm({...bankAccountForm, routing_number: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Account Holder Name</label>
                      <input
                        value={bankAccountForm.account_holder_name}
                        onChange={(e) => setBankAccountForm({...bankAccountForm, account_holder_name: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Bank Name</label>
                      <input
                        value={bankAccountForm.bank_name}
                        onChange={(e) => setBankAccountForm({...bankAccountForm, bank_name: e.target.value})}
                        className="input"
                      />
                    </div>
                  </div>
                  <button onClick={createBankAccount} disabled={loading} className="btn btn-primary">
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
                    <button onClick={listBankAccounts} disabled={loading} className="btn btn-success">
                      List Accounts
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CRYPTO ADDRESSES TAB */}
            {activeTab === 'crypto-addresses' && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">Add Blockchain Address</h3>
                  <div className="form-grid">
                    <div className="full-width">
                      <label className="label">Customer UUID *</label>
                      <input
                        value={cryptoAddressForm.customer_uuid}
                        onChange={(e) => setCryptoAddressForm({...cryptoAddressForm, customer_uuid: e.target.value})}
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Chain</label>
                      <select
                        value={cryptoAddressForm.chain}
                        onChange={(e) => setCryptoAddressForm({...cryptoAddressForm, chain: e.target.value})}
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
                        onChange={(e) => setCryptoAddressForm({...cryptoAddressForm, asset: e.target.value})}
                        placeholder="USDC"
                        className="input"
                      />
                    </div>
                    <div className="full-width">
                      <label className="label">Wallet Address</label>
                      <input
                        value={cryptoAddressForm.address}
                        onChange={(e) => setCryptoAddressForm({...cryptoAddressForm, address: e.target.value})}
                        placeholder="0x..."
                        className="input"
                      />
                    </div>
                    <div className="full-width">
                      <label className="label">Label</label>
                      <input
                        value={cryptoAddressForm.label}
                        onChange={(e) => setCryptoAddressForm({...cryptoAddressForm, label: e.target.value})}
                        placeholder="My Wallet"
                        className="input"
                      />
                    </div>
                  </div>
                  <button onClick={createCryptoAddress} disabled={loading} className="btn btn-primary">
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
                    <button onClick={listCryptoAddresses} disabled={loading} className="btn btn-success">
                      List Addresses
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TRANSFERS TAB */}
            {activeTab === 'transfers' && (
              <div className="space-y">
                <div>
                  <h3 className="section-title">Create Transfer</h3>
                  <div className="form-grid">
                    <div className="full-width">
                      <label className="label">Transfer Type</label>
                      <select
                        value={transferForm.transfer_type}
                        onChange={(e) => setTransferForm({...transferForm, transfer_type: e.target.value})}
                        className="input"
                      >
                        <option value="on-ramp">On-Ramp (Fiat → Crypto)</option>
                        <option value="off-ramp">Off-Ramp (Crypto → Fiat)</option>
                        <option value="on-chain">On-Chain (Crypto → Crypto)</option>
                      </select>
                    </div>
                    <div className="full-width">
                      <label className="label">Customer UUID (on_behalf_of) *</label>
                      <input
                        value={transferForm.on_behalf_of}
                        onChange={(e) => setTransferForm({...transferForm, on_behalf_of: e.target.value})}
                        placeholder="cus_xxxxx"
                        className="input"
                      />
                    </div>
                    
                    <div className="full-width info-box">
                      <h4 className="info-title">Source</h4>
                      <div className="form-grid">
                        {transferForm.transfer_type !== 'on-ramp' && (
                          <div>
                            <label className="label">Chain</label>
                            <select
                              value={transferForm.source_chain}
                              onChange={(e) => setTransferForm({...transferForm, source_chain: e.target.value})}
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
                            onChange={(e) => setTransferForm({...transferForm, source_asset: e.target.value})}
                            className="input"
                            placeholder="USD or USDC"
                          />
                        </div>
                        <div>
                          <label className="label">Amount</label>
                          <input
                            type="number"
                            value={transferForm.source_amount}
                            onChange={(e) => setTransferForm({...transferForm, source_amount: e.target.value})}
                            className="input"
                            placeholder="100.00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="full-width info-box">
                      <h4 className="info-title">Destination</h4>
                      <div className="form-grid">
                        {transferForm.transfer_type !== 'off-ramp' && (
                          <div>
                            <label className="label">Chain</label>
                            <select
                              value={transferForm.destination_chain}
                              onChange={(e) => setTransferForm({...transferForm, destination_chain: e.target.value})}
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
                            onChange={(e) => setTransferForm({...transferForm, destination_asset: e.target.value})}
                            className="input"
                            placeholder="USDC or USD"
                          />
                        </div>
                        {transferForm.transfer_type !== 'off-ramp' && (
                          <>
                            <div className="full-width">
                              <label className="label">Destination Address</label>
                              <input
                                value={transferForm.destination_address}
                                onChange={(e) => setTransferForm({...transferForm, destination_address: e.target.value})}
                                className="input"
                                placeholder="0x..."
                              />
                            </div>
                            <div>
                              <label className="label">Transfer Purpose</label>
                              <input
                                value={transferForm.transfer_purpose}
                                onChange={(e) => setTransferForm({...transferForm, transfer_purpose: e.target.value})}
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
                        onChange={(e) => setTransferForm({...transferForm, application_transfer_uuid: e.target.value})}
                        className="input"
                        placeholder="Unique ID for this transfer"
                      />
                    </div>
                  </div>
                  <button onClick={createTransfer} disabled={loading} className="btn btn-primary">
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
                    <button onClick={getTransfer} disabled={loading} className="btn btn-info">
                      Get Status
                    </button>
                    <button onClick={listTransfers} disabled={loading} className="btn btn-success">
                      List All
                    </button>
                  </div>
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
                    <strong>Status {response.status}:</strong> Request successful
                  </div>
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