/**
 * eWeLink Service - Integration with Sonoff Cloud API
 * 
 * This service handles authentication and device control via the eWeLink Cloud API.
 * The eWeLink API is a private API used by Sonoff devices.
 * 
 * API Documentation reference: https://coolkit-technologies.github.io/eWeLink-API/
 */

import crypto from 'crypto';

// eWeLink API regions and their base URLs
const REGION_URLS: Record<string, string> = {
  cn: 'https://cn-apia.coolkit.cn',
  as: 'https://as-apia.coolkit.cc',
  us: 'https://us-apia.coolkit.cc',
  eu: 'https://eu-apia.coolkit.cc',
};

// eWeLink App credentials from environment variables
const APP_ID = process.env.EWELINK_APP_ID || 'YzfeftUVcZ6twZw1OoVKPRFYTrGEg01Q';
const APP_SECRET = process.env.EWELINK_APP_SECRET || '4G91qSoboqYO4Y0XJ0LPPKIsq8reHdfa';

// In-memory token storage per user session
interface UserSession {
  accessToken: string;
  refreshToken: string;
  region: string;
  userId: string;
  expiresAt: number;
}

// Store sessions by a session key (could be user email or session ID)
const sessions = new Map<string, UserSession>();

// Device interface
export interface EwelinkDevice {
  deviceid: string;
  name: string;
  state: 'on' | 'off' | 'unknown';
  online: boolean;
  brandName?: string;
  productModel?: string;
}

/**
 * Generate HMAC-SHA256 signature for API requests
 */
function generateSignature(data: string): string {
  return crypto
    .createHmac('sha256', APP_SECRET)
    .update(data)
    .digest('base64');
}

/**
 * Get API base URL for a region
 */
function getApiUrl(region: string): string {
  return REGION_URLS[region] || REGION_URLS.us;
}

/**
 * Login to eWeLink and obtain access token
 */
export async function ewelinkLogin(
  email: string,
  password: string,
  region: string = 'us'
): Promise<{ success: boolean; message: string; sessionKey?: string }> {
  const apiUrl = getApiUrl(region);
  const timestamp = Date.now();
  
  // Create login payload
  const payload = {
    email,
    password,
    countryCode: '+1', // Default country code
  };

  const payloadStr = JSON.stringify(payload);
  const signature = generateSignature(payloadStr);

  try {
    const response = await fetch(`${apiUrl}/v2/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CK-Appid': APP_ID,
        'X-CK-Nonce': crypto.randomBytes(8).toString('hex'),
        'Authorization': `Sign ${signature}`,
      },
      body: payloadStr,
    });

    const data = await response.json();

    if (data.error !== 0) {
      // Map common error codes to user-friendly messages
      const errorMessages: Record<number, string> = {
        400: 'Parâmetros inválidos',
        401: 'Email ou senha incorretos',
        402: 'Email não encontrado',
        406: 'Acesso negado - conta bloqueada',
        500: 'Erro interno do servidor eWeLink',
      };
      
      return {
        success: false,
        message: errorMessages[data.error] || `Erro eWeLink: ${data.msg || data.error}`,
      };
    }

    // Store session
    const sessionKey = crypto.randomBytes(16).toString('hex');
    sessions.set(sessionKey, {
      accessToken: data.data.at,
      refreshToken: data.data.rt,
      region,
      userId: data.data.user.apikey,
      expiresAt: Date.now() + (data.data.atExpiredTime || 86400) * 1000,
    });

    return {
      success: true,
      message: 'Login realizado com sucesso',
      sessionKey,
    };
  } catch (error) {
    console.error('[eWeLink] Login error:', error);
    return {
      success: false,
      message: 'Erro de conexão com o servidor eWeLink',
    };
  }
}

/**
 * Get user session by session key
 */
function getSession(sessionKey: string): UserSession | null {
  const session = sessions.get(sessionKey);
  if (!session) return null;
  
  // Check if token is expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionKey);
    return null;
  }
  
  return session;
}

/**
 * List all devices for authenticated user
 */
export async function ewelinkGetDevices(
  sessionKey: string
): Promise<{ success: boolean; devices?: EwelinkDevice[]; message?: string }> {
  const session = getSession(sessionKey);
  if (!session) {
    return { success: false, message: 'Sessão expirada. Faça login novamente.' };
  }

  const apiUrl = getApiUrl(session.region);

  try {
    const response = await fetch(`${apiUrl}/v2/device/thing`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CK-Appid': APP_ID,
        'X-CK-Nonce': crypto.randomBytes(8).toString('hex'),
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    const data = await response.json();

    if (data.error !== 0) {
      if (data.error === 401) {
        sessions.delete(sessionKey);
        return { success: false, message: 'Token expirado. Faça login novamente.' };
      }
      return { success: false, message: `Erro ao listar dispositivos: ${data.msg}` };
    }

    // Map device data to our interface
    const devices: EwelinkDevice[] = (data.data?.thingList || []).map((thing: any) => {
      const device = thing.itemData;
      const params = device.params || {};
      
      // Determine device state (handle different device types)
      let state: 'on' | 'off' | 'unknown' = 'unknown';
      if (params.switch !== undefined) {
        state = params.switch === 'on' ? 'on' : 'off';
      } else if (params.switches && Array.isArray(params.switches)) {
        // Multi-channel device - check if any channel is on
        state = params.switches.some((s: any) => s.switch === 'on') ? 'on' : 'off';
      }

      return {
        deviceid: device.deviceid,
        name: device.name || 'Dispositivo sem nome',
        state,
        online: device.online === true,
        brandName: device.brandName,
        productModel: device.productModel,
      };
    });

    return { success: true, devices };
  } catch (error) {
    console.error('[eWeLink] Get devices error:', error);
    return { success: false, message: 'Erro de conexão com o servidor eWeLink' };
  }
}

/**
 * Control device state (turn on/off)
 */
export async function ewelinkControlDevice(
  sessionKey: string,
  deviceId: string,
  action: 'on' | 'off'
): Promise<{ success: boolean; message: string }> {
  const session = getSession(sessionKey);
  if (!session) {
    return { success: false, message: 'Sessão expirada. Faça login novamente.' };
  }

  const apiUrl = getApiUrl(session.region);

  const payload = {
    type: 1, // Device type
    id: deviceId,
    params: {
      switch: action,
    },
  };

  try {
    const response = await fetch(`${apiUrl}/v2/device/thing/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CK-Appid': APP_ID,
        'X-CK-Nonce': crypto.randomBytes(8).toString('hex'),
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error !== 0) {
      if (data.error === 401) {
        sessions.delete(sessionKey);
        return { success: false, message: 'Token expirado. Faça login novamente.' };
      }
      return { success: false, message: `Erro ao controlar dispositivo: ${data.msg}` };
    }

    return {
      success: true,
      message: `Dispositivo ${action === 'on' ? 'ligado' : 'desligado'} com sucesso`,
    };
  } catch (error) {
    console.error('[eWeLink] Control device error:', error);
    return { success: false, message: 'Erro de conexão com o servidor eWeLink' };
  }
}

/**
 * Logout and invalidate session
 */
export function ewelinkLogout(sessionKey: string): { success: boolean; message: string } {
  if (sessions.has(sessionKey)) {
    sessions.delete(sessionKey);
    return { success: true, message: 'Logout realizado com sucesso' };
  }
  return { success: false, message: 'Sessão não encontrada' };
}

/**
 * Check if session is valid
 */
export function ewelinkCheckSession(sessionKey: string): boolean {
  return getSession(sessionKey) !== null;
}
