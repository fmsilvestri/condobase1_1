/**
 * eWeLink Service - Integration with Sonoff Cloud API
 * 
 * This service handles authentication and device control via the eWeLink Cloud API.
 * Uses the ewelink-api library for reliable authentication.
 * 
 * API Documentation reference: https://github.com/skydiver/ewelink-api
 */

import crypto from 'crypto';

// eWeLink App credentials from environment variables
const APP_ID = process.env.EWELINK_APP_ID || 'U2mQaukklNdG5s5Fzhi49MOwAA2DFeVs';
const APP_SECRET = process.env.EWELINK_APP_SECRET || '8CWzxwKIfniMDuzMhqjplN7LY4T5uJHn';

// In-memory token storage per user session
interface UserSession {
  email: string;
  region: string;
  expiresAt: number;
  connection?: any;
}

// Store sessions by a session key
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
  br: 'us',
  brasil: 'us',
  sa: 'us',
};

/**
 * Login to eWeLink using ewelink-api library
 */
export async function ewelinkLogin(
  email: string,
  password: string,
  region: string = 'us'
): Promise<{ success: boolean; message: string; sessionKey?: string }> {
  const mappedRegion = REGION_MAP[region] || 'us';
  
  console.log(`[eWeLink] Attempting login for ${email} to region ${mappedRegion}`);
  
  try {
    // Dynamic import of ewelink-api
    const ewelink = require('ewelink-api');
    
    // Create connection with APP_ID and APP_SECRET
    const connection = new ewelink({
      email: email,
      password: password,
      region: mappedRegion,
      APP_ID: APP_ID,
      APP_SECRET: APP_SECRET,
    });

    // Test connection by getting credentials
    const credentials = await connection.getCredentials();
    
    console.log(`[eWeLink] Login response:`, JSON.stringify(credentials, null, 2));

    if (credentials.error) {
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
        message: errorMessages[credentials.error] || `Erro eWeLink: ${credentials.msg || credentials.error}`,
      };
    }

    // Store session with connection instance
    const sessionKey = crypto.randomBytes(16).toString('hex');
    
    sessions.set(sessionKey, {
      email: email,
      region: mappedRegion,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      connection: connection,
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
    const connection = session.connection;
    if (!connection) {
      return {
        success: false,
        message: 'Conexão não inicializada. Faça login novamente.',
      };
    }
    
    // Get devices
    const deviceList = await connection.getDevices();
    
    console.log(`[eWeLink] Get devices response:`, JSON.stringify(deviceList, null, 2));

    if (deviceList.error) {
      return {
        success: false,
        message: `Erro ao obter dispositivos: ${deviceList.msg || deviceList.error}`,
      };
    }

    // Map devices to our format
    const devices: EwelinkDevice[] = (deviceList || []).map((device: any) => {
      let state: 'on' | 'off' | 'unknown' = 'unknown';
      
      // Try to get switch state from different possible locations
      if (device.params?.switch) {
        state = device.params.switch;
      } else if (device.params?.switches?.[0]?.switch) {
        state = device.params.switches[0].switch;
      }
      
      return {
        deviceid: device.deviceid || '',
        name: device.name || 'Dispositivo sem nome',
        state,
        online: device.online ?? true,
        brandName: device.brandName || device.extra?.brandName || '',
        productModel: device.productModel || device.extra?.productModel || '',
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
    const connection = session.connection;
    if (!connection) {
      return {
        success: false,
        message: 'Conexão não inicializada. Faça login novamente.',
      };
    }
    
    // Control device using setDevicePowerState
    const response = await connection.setDevicePowerState(deviceId, action);

    console.log(`[eWeLink] Control device response:`, JSON.stringify(response, null, 2));

    if (response.error) {
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
