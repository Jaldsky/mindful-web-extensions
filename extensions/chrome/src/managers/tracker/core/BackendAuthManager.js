const CONFIG = require('../../../config/config.js');

/**
 * Выделенный менеджер auth/session API для BackendManager.
 *
 * @class BackendAuthManager
 */
class BackendAuthManager {
    /**
     * @param {import('./BackendManager.js')} backendManager
     */
    constructor(backendManager) {
        this.backend = backendManager;
    }

    setAuthToken(token) {
        const backend = this.backend;
        if (typeof token !== 'string') {
            throw new TypeError('Auth token must be a string');
        }
        backend.authToken = token;
        backend.updateState({ authTokenSet: true });
        backend._log({ key: 'logs.backend.authTokenUpdated' });
    }

    setAuthSession(accessToken, refreshToken = null) {
        const backend = this.backend;
        this.setAuthToken(accessToken);
        backend.refreshToken = refreshToken || null;
        backend._log({ key: 'logs.backend.authSessionUpdated' }, { hasRefresh: Boolean(backend.refreshToken) });
    }

    clearAuthSession() {
        const backend = this.backend;
        backend.authToken = null;
        backend.refreshToken = null;
        backend.updateState({ authTokenSet: false });
        backend._log({ key: 'logs.backend.authSessionCleared' });
    }

    _extractErrorDetail(obj) {
        if (obj == null) return '';
        const raw = obj.message ?? obj.detail ?? obj.error ?? obj.msg;
        if (typeof raw === 'string') return raw;
        if (Array.isArray(raw) && raw.length > 0) {
            const first = raw[0];
            if (typeof first === 'string') return first;
            if (first && typeof first === 'object') return first.msg ?? first.message ?? first.detail ?? String(first);
        }
        if (raw != null) return String(raw);
        const details = obj.details;
        if (Array.isArray(details) && details.length > 0) {
            const first = details[0];
            if (first && typeof first === 'object' && typeof first.message === 'string') return first.message;
        }
        return '';
    }

    async login(username, password) {
        const backend = this.backend;
        return await backend._executeWithTimingAsync('login', async () => {
            try {
                const backendUrlObj = new URL(backend.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.AUTH_LOGIN_PATH;
                const loginUrl = backendUrlObj.toString();

                const acceptLanguage = await backend._getAcceptLanguageAsync();
                const response = await fetch(loginUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    let errorDetail = '';
                    try {
                        const errorText = await response.text();
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorDetail = this._extractErrorDetail(errorJson);
                        } catch {
                            // ignore
                        }
                    } catch {
                        // ignore
                    }
                    const t = backend._getTranslateFn();
                    const userMessage = errorDetail || t('logs.backend.unknownError') || 'Unknown error';
                    backend._logError({ key: 'logs.backend.authLoginError' }, new Error(userMessage));
                    return { success: false, error: userMessage };
                }

                const data = await response.json();
                if (!data || !data.access_token || !data.refresh_token) {
                    const t = backend._getTranslateFn();
                    const errorMessage = t('logs.backend.authLoginInvalidResponse');
                    backend._logError({ key: 'logs.backend.authLoginError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token };
            } catch (error) {
                backend._logError({ key: 'logs.backend.authLoginError' }, error);
                const t = backend._getTranslateFn();
                const errorMessage = error.message || t('logs.backend.unknownError');
                return { success: false, error: errorMessage };
            }
        });
    }

    async refreshAccessToken(refreshToken = null) {
        const backend = this.backend;
        return await backend._executeWithTimingAsync('refreshAccessToken', async () => {
            try {
                const backendUrlObj = new URL(backend.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.AUTH_REFRESH_PATH;
                const refreshUrl = backendUrlObj.toString();

                const body = refreshToken
                    ? JSON.stringify({ refresh_token: refreshToken })
                    : undefined;

                const acceptLanguage = await backend._getAcceptLanguageAsync();
                const response = await fetch(refreshUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    },
                    body,
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMessage = CONFIG.BACKEND.ERROR_MESSAGE_TEMPLATE
                        .replace('{status}', response.status)
                        .replace('{message}', errorText || response.statusText);
                    backend._logError({ key: 'logs.backend.authRefreshError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                const data = await response.json();
                if (!data || !data.access_token) {
                    const t = backend._getTranslateFn();
                    const errorMessage = t('logs.backend.authRefreshInvalidResponse');
                    backend._logError({ key: 'logs.backend.authRefreshError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token };
            } catch (error) {
                backend._logError({ key: 'logs.backend.authRefreshError' }, error);
                const t = backend._getTranslateFn();
                const errorMessage = error.message || t('logs.backend.unknownError');
                return { success: false, error: errorMessage };
            }
        });
    }

    async register(username, email, password) {
        const backend = this.backend;
        return await backend._executeWithTimingAsync('register', async () => {
            try {
                const backendUrlObj = new URL(backend.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.AUTH_REGISTER_PATH;
                const registerUrl = backendUrlObj.toString();

                const acceptLanguage = await backend._getAcceptLanguageAsync();
                const response = await fetch(registerUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    },
                    body: JSON.stringify({ username, email, password }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    let errorMessage = '';
                    let errorDetail = '';

                    try {
                        const errorText = await response.text();
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorDetail = errorJson.detail || errorJson.message || errorJson.error || '';
                            errorMessage = errorDetail || errorText;
                        } catch {
                            errorMessage = errorText || response.statusText;
                        }
                    } catch {
                        errorMessage = response.statusText || 'Unknown error';
                    }

                    const formattedError = errorDetail
                        ? `[${response.status}] ${errorDetail}`
                        : `[${response.status}] ${errorMessage}`;

                    backend._logError({ key: 'logs.backend.authRegisterError' }, new Error(formattedError));
                    return { success: false, error: formattedError, status: response.status };
                }

                const data = await response.json();
                if (!data || !data.user_id) {
                    const t = backend._getTranslateFn();
                    const errorMessage = t('logs.backend.authRegisterInvalidResponse');
                    backend._logError({ key: 'logs.backend.authRegisterError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                return { success: true, userId: data.user_id };
            } catch (error) {
                backend._logError({ key: 'logs.backend.authRegisterError' }, error);
                const t = backend._getTranslateFn();
                const errorMessage = error.message || t('logs.backend.unknownError');
                return { success: false, error: errorMessage };
            }
        });
    }

    async verify(email, code) {
        const backend = this.backend;
        return await backend._executeWithTimingAsync('verify', async () => {
            try {
                const backendUrlObj = new URL(backend.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.AUTH_VERIFY_PATH;
                const verifyUrl = backendUrlObj.toString();

                const acceptLanguage = await backend._getAcceptLanguageAsync();
                const response = await fetch(verifyUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    },
                    body: JSON.stringify({ email, code }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    let errorMessage = '';
                    let errorDetail = '';

                    try {
                        const errorText = await response.text();
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorDetail = errorJson.detail || errorJson.message || errorJson.error || '';
                            errorMessage = errorDetail || errorText;
                        } catch {
                            errorMessage = errorText || response.statusText;
                        }
                    } catch {
                        errorMessage = response.statusText || 'Unknown error';
                    }

                    const formattedError = errorDetail
                        ? `[${response.status}] ${errorDetail}`
                        : `[${response.status}] ${errorMessage}`;

                    backend._logError({ key: 'logs.backend.authVerifyError' }, new Error(formattedError));
                    return { success: false, error: formattedError, status: response.status };
                }

                return { success: true };
            } catch (error) {
                backend._logError({ key: 'logs.backend.authVerifyError' }, error);
                return { success: false, error: error.message };
            }
        });
    }

    async resendCode(email) {
        const backend = this.backend;
        return await backend._executeWithTimingAsync('resendCode', async () => {
            try {
                const backendUrlObj = new URL(backend.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.AUTH_RESEND_CODE_PATH;
                const resendUrl = backendUrlObj.toString();

                const acceptLanguage = await backend._getAcceptLanguageAsync();
                const response = await fetch(resendUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    },
                    body: JSON.stringify({ email }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    let errorMessage = '';
                    let errorDetail = '';

                    try {
                        const errorText = await response.text();
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorDetail = errorJson.detail || errorJson.message || errorJson.error || '';
                            errorMessage = errorDetail || errorText;
                        } catch {
                            errorMessage = errorText || response.statusText;
                        }
                    } catch {
                        errorMessage = response.statusText || 'Unknown error';
                    }

                    const formattedError = errorDetail
                        ? `[${response.status}] ${errorDetail}`
                        : `[${response.status}] ${errorMessage}`;

                    backend._logError({ key: 'logs.backend.authResendCodeError' }, new Error(formattedError));
                    return { success: false, error: formattedError, status: response.status };
                }

                return { success: true };
            } catch (error) {
                backend._logError({ key: 'logs.backend.authResendCodeError' }, error);
                return { success: false, error: error.message };
            }
        });
    }

    async logout() {
        const backend = this.backend;
        return await backend._executeWithTimingAsync('logout', async () => {
            try {
                const backendUrlObj = new URL(backend.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.AUTH_LOGOUT_PATH;
                const logoutUrl = backendUrlObj.toString();

                const acceptLanguage = await backend._getAcceptLanguageAsync();
                const response = await fetch(logoutUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMessage = CONFIG.BACKEND.ERROR_MESSAGE_TEMPLATE
                        .replace('{status}', response.status)
                        .replace('{message}', errorText || response.statusText);
                    backend._logError({ key: 'logs.backend.authLogoutError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                return { success: true };
            } catch (error) {
                backend._logError({ key: 'logs.backend.authLogoutError' }, error);
                return { success: false, error: error.message };
            }
        });
    }

    async getSession() {
        const backend = this.backend;
        return await backend._executeWithTimingAsync('getSession', async () => {
            try {
                const backendUrlObj = new URL(backend.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.AUTH_SESSION_PATH;
                const sessionUrl = backendUrlObj.toString();

                const acceptLanguage = await backend._getAcceptLanguageAsync();
                const response = await fetch(sessionUrl, {
                    method: CONFIG.BACKEND.METHODS.GET,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMessage = CONFIG.BACKEND.ERROR_MESSAGE_TEMPLATE
                        .replace('{status}', response.status)
                        .replace('{message}', errorText || response.statusText);
                    backend._logError({ key: 'logs.backend.authSessionError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                const data = await response.json();
                if (!data || !data.status) {
                    const t = backend._getTranslateFn();
                    const errorMessage = t('logs.backend.authSessionInvalidResponse');
                    backend._logError({ key: 'logs.backend.authSessionError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                return {
                    success: true,
                    status: data.status,
                    userId: data.user_id || null,
                    anonId: data.anon_id || null
                };
            } catch (error) {
                backend._logError({ key: 'logs.backend.authSessionError' }, error);
                const t = backend._getTranslateFn();
                const errorMessage = error.message || t('logs.backend.unknownError');
                return { success: false, error: errorMessage };
            }
        });
    }
}

module.exports = BackendAuthManager;
module.exports.default = BackendAuthManager;
