export const AuthStrategy = { API_KEY: 'api-key', BEARER_TOKEN: 'bearer-token', BASIC_AUTH: 'basic-auth', OAUTH2: 'oauth2', JWT: 'jwt' };

export class APIAuthProxy {
  constructor(baseURL, strategy = AuthStrategy.API_KEY, credentials = {}) {
    Object.assign(this, { baseURL, strategy, credentials, requestLog: [], requestCount: 0, resetTime: 0 });
    this.maxRPM = credentials.rateLimit || Infinity;
  }
}