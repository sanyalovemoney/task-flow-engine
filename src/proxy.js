export const AuthStrategy = { API_KEY: 'api-key', BEARER_TOKEN: 'bearer-token', BASIC_AUTH: 'basic-auth', OAUTH2: 'oauth2', JWT: 'jwt' };

export class APIAuthProxy {
  constructor(baseURL, strategy = AuthStrategy.API_KEY, credentials = {}) {
    Object.assign(this, { baseURL, strategy, credentials, requestLog: [], requestCount: 0, resetTime: 0 });
    this.maxRPM = credentials.rateLimit || Infinity;
  }

 injectAuthHeaders(headers = {}) {
    const { apiKey, token, username, password, accessToken, jwtToken } = this.credentials;
    const authMap = {
      [AuthStrategy.API_KEY]: { 'X-API-Key': apiKey },
      [AuthStrategy.BEARER_TOKEN]: { 'Authorization': `Bearer ${token}` },
      [AuthStrategy.JWT]: { 'Authorization': `Bearer ${jwtToken}` },
      [AuthStrategy.OAUTH2]: { 'Authorization': `OAuth ${accessToken}` },
      [AuthStrategy.BASIC_AUTH]: { 'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` }
    };
    return { ...headers, ...(authMap[this.strategy] || {}) };
  }

  async request(method, endpoint, options = {}) {
    const now = Date.now();
    if (now > this.resetTime) { this.requestCount = 0; this.resetTime = now + 60000; }
    if (++this.requestCount > this.maxRPM) throw new Error('Rate limit exceeded');

    const headers = this.injectAuthHeaders(options.headers);
    const url = `${this.baseURL}${endpoint}`;
    
    const res = { method, url, timestamp: new Date().toISOString(), strategy: this.strategy };
    this.requestLog.push(res);
    console.log(`[AuthProxy] ${method} ${url}`);

    return { status: 200, headers, data: { success: true, endpoint }, timestamp: res.timestamp };
  }
}