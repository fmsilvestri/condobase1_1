/**
 * eWeLink Service - Integration with Sonoff Cloud API
 * 
 * This service handles authentication and device control via the eWeLink Cloud API.
 * Uses the official ewelink-api-next library for reliable authentication.
 * 
 * API Documentation reference: https://coolkit-technologies.github.io/eWeLink-API/
 */

import crypto from 'crypto';

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
  client?: any;
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

// Region mapping for eWeLink
const REGION_MAP: Record<string, string> = {
  us: 'us',
  eu: 'eu',
  as: 'as',
  cn: 'cn',
  br: 'us', // Brazil uses US region
  sa: 'us', // South America uses US region
};

/**
 * Login to eWeLink using official library
 */
export async function ewelinkLogin(
  email: string,
  password: string,
  region: string = 'us'
): Promise<{ success: boolean; message: string; sessionKey?: string }> {
  const mappedRegion = REGION_MAP[region] || 'us';
  
  console.log(`[eWeLink] Attempting login for ${email} to region ${mappedRegion}`);
  
  try {
    // Dynamic import of ewelink-api-next
    const eWeLink = await import('ewelink-api-next');
    
    // Create client
    const client = new eWeLink.WebAPI({
      appId: APP_ID,
      appSecret: APP_SECRET,
      region: mappedRegion as 'us' | 'eu' | 'as' | 'cn',
    });

    // Perform login
    const response = await client.user.login({
      account: email,
      password: password,
      areaCode: '+55', // Brazil country code
    });

    console.log(`[eWeLink] Login response:`, JSON.stringify(response, null, 2));

    if (response.error !== 0) {
      // Map common error codes to user-friendly messages
      const errorMessages: Record<number, string> = {
        400: 'Parâmetros inválidos',
        401: 'Email ou senha incorretos',
        402: 'Email não encontrado',
        406: 'Acesso negado - conta bloqueada',
        407: 'Muitas tentativas - aguarde alguns minutos',
        500: 'Erro interno do servidor eWeLink',
        10001: 'AppID inválido',
        10002: 'AppID não encontrado',
      };
      
      return {
        success: false,
        message: errorMessages[response.error] || `Erro eWeLink: ${response.msg || response.error}`,
      };
    }

    // Store session with client instance
    const sessionKey = crypto.randomBytes(16).toString('hex');
    
    // Set the token on the client for future requests
    client.at = response.data.at;
    
    sessions.set(sessionKey, {
      accessToken: response.data.at,
      refreshToken: response.data.rt,
      region: mappedRegion,
      userId: response.data.user?.apikey || '',
      expiresAt: Date.now() + (response.data.atExpiredTime || 86400) * 1000,
      client: client,
    });

    console.log(`[eWeLink] Login successful, session created: ${sessionKey.substring(0, 8)}...`);

    return {
      success: true,
      message: 'Login realizado com sucesso',
      sessionKey,
    };
  } catch (error: any) {
    console.error('[eWeLink] Login error:', error);
    return {
      success: false,
      message: `Erro de conexão: ${error.message || 'Erro desconhecido'}`,
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
 * Logout and clear session
 */
export function ewelinkLogout(sessionKey: string): boolean {
  return sessions.delete(sessionKey);
}

/**
 * Get devices from eWeLink account
 */
export async function ewelinkGetDevices(sessionKey: string): Promise<{
  success: boolean;
  message: string;
  devices?: EwelinkDevice[];
}> {
  const session = getSession(sessionKey);
  
  if (!session) {
    return {
      success: false,
      message: 'Sessão expirada ou inválida. Faça login novamente.',
    };
  }

  try {
    const client = session.client;
    if (!client) {
      return {
        success: false,
        message: 'Cliente não inicializado. Faça login novamente.',
      };
    }
    
    // Get devices
    const response = await client.device.getAllThings();
    
    console.log(`[eWeLink] Get devices response:`, JSON.stringify(response, null, 2));

    if (response.error !== 0) {
      return {
        success: false,
        message: `Erro ao obter dispositivos: ${response.msg || response.error}`,
      };
    }

    // Map devices to our format
    const devices: EwelinkDevice[] = (response.data?.thingList || []).map((thing: any) => {
      const item = thing.itemData || thing;
      let state: 'on' | 'off' | 'unknown' = 'unknown';
      
      // Try to get switch state from different possible locations
      if (item.params?.switch) {
        state = item.params.switch;
      } else if (item.params?.switches?.[0]?.switch) {
        state = item.params.switches[0].switch;
      }
      
      return {
        deviceid: item.deviceid || '',
        name: item.name || 'Dispositivo sem nome',
        state,
        online: item.online ?? true,
        brandName: item.brandName || item.extra?.brandName || '',
        productModel: item.productModel || item.extra?.productModel || '',
      };
    });

    return {
      success: true,
      message: 'Dispositivos carregados com sucesso',
      devices,
    };
  } catch (error: any) {
    console.error('[eWeLink] Get devices error:', error);
    return {
      success: false,
      message: `Erro ao carregar dispositivos: ${error.message || 'Erro desconhecido'}`,
    };
  }
}

/**
 * Control device (turn on/off)
 */
export async function ewelinkControlDevice(
  sessionKey: string,
  deviceId: string,
  action: 'on' | 'off'
): Promise<{ success: boolean; message: string }> {
  const session = getSession(sessionKey);
  
  if (!session) {
    return {
      success: false,
      message: 'Sessão expirada ou inválida. Faça login novamente.',
    };
  }

  try {
    const client = session.client;
    if (!client) {
      return {
        success: false,
        message: 'Cliente não inicializado. Faça login novamente.',
      };
    }
    
    // Control device
    const response = await client.device.setThingStatus({
      id: deviceId,
      type: 1,
      params: {
        switch: action,
      },
    });

    console.log(`[eWeLink] Control device response:`, JSON.stringify(response, null, 2));

    if (response.error !== 0) {
      return {
        success: false,
        message: `Erro ao controlar dispositivo: ${response.msg || response.error}`,
      };
    }

    return {
      success: true,
      message: `Dispositivo ${action === 'on' ? 'ligado' : 'desligado'} com sucesso`,
    };
  } catch (error: any) {
    console.error('[eWeLink] Control device error:', error);
    return {
      success: false,
      message: `Erro ao controlar dispositivo: ${error.message || 'Erro desconhecido'}`,
    };
  }
}

/**
 * Check session status
 */
export function isSessionValid(sessionKey: string): boolean {
  return getSession(sessionKey) !== null;
}

/**
 * Alias for isSessionValid for route compatibility
 */
export function ewelinkCheckSession(sessionKey: string): boolean {
  return isSessionValid(sessionKey);
}
