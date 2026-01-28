/**
 * eWeLink Service - Integration with Sonoff Cloud API
 * 
 * This service handles device control via the eWeLink Cloud API.
 * Uses the ewelink-api library with fixed credentials.
 */

import crypto from 'crypto';

// eWeLink credentials from environment variables
const EWELINK_EMAIL = process.env.EWELINK_EMAIL || 'fmsilvestri39@gmail.com';
const EWELINK_PASSWORD = process.env.EWELINK_PASSWORD || '';
const EWELINK_REGION = process.env.EWELINK_REGION || 'us';
const APP_ID = process.env.EWELINK_APP_ID || 'Uw83EKZFxdif7XFXEsrpduz5YyjP7nTl';
const APP_SECRET = process.env.EWELINK_APP_SECRET || 'mXLOjea0woSMvK9gw7Fjsy7YlFO4iSu6';

// Singleton connection
let connection: any = null;
let connectionInitialized = false;

// Device interface
export interface EwelinkDevice {
  deviceid: string;
  name: string;
  state: 'on' | 'off' | 'unknown';
  online: boolean;
  brandName?: string;
  productModel?: string;
}

// In-memory session storage for user logins
interface UserSession {
  email: string;
  region: string;
  expiresAt: number;
  connection?: any;
}

const sessions = new Map<string, UserSession>();

// Region mapping
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
 * Initialize the global eWeLink connection
 */
async function initConnection(): Promise<any> {
  if (connection && connectionInitialized) {
    return connection;
  }

  if (!EWELINK_PASSWORD) {
    console.log('[eWeLink] No password configured, skipping auto-connection');
    return null;
  }

  try {
    const ewelink = require('ewelink-api');
    
    connection = new ewelink({
      email: EWELINK_EMAIL,
      password: EWELINK_PASSWORD,
      region: EWELINK_REGION,
      APP_ID: APP_ID,
      APP_SECRET: APP_SECRET,
    });

    // Test connection
    const devices = await connection.getDevices();
    console.log(`[eWeLink] Connected! ${devices?.length || 0} devices found`);
    connectionInitialized = true;
    
    return connection;
  } catch (error: any) {
    console.error('[eWeLink] Connection error:', error.message);
    return null;
  }
}

// Try to initialize on module load
initConnection().catch(console.error);

/**
 * Login to eWeLink (creates user session)
 */
export async function ewelinkLogin(
  email: string,
  password: string,
  region: string = 'us'
): Promise<{ success: boolean; message: string; sessionKey?: string }> {
  const mappedRegion = REGION_MAP[region] || 'us';
  
  console.log(`[eWeLink] Attempting login for ${email} to region ${mappedRegion}`);
  
  try {
    const ewelink = require('ewelink-api');
    
    const userConnection = new ewelink({
      email: email,
      password: password,
      region: mappedRegion,
      APP_ID: APP_ID,
      APP_SECRET: APP_SECRET,
    });

    // Test connection by getting devices
    const devices = await userConnection.getDevices();
    
    console.log(`[eWeLink] Login successful, ${devices?.length || 0} devices found`);

    if (devices?.error) {
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
        message: errorMessages[devices.error] || `Erro eWeLink: ${devices.msg || devices.error}`,
      };
    }

    // Store session
    const sessionKey = crypto.randomBytes(16).toString('hex');
    
    sessions.set(sessionKey, {
      email: email,
      region: mappedRegion,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      connection: userConnection,
    });

    console.log(`[eWeLink] Session created: ${sessionKey.substring(0, 8)}...`);

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
 * Get session by key
 */
function getSession(sessionKey: string): UserSession | null {
  const session = sessions.get(sessionKey);
  if (!session) return null;
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionKey);
    return null;
  }
  
  return session;
}

/**
 * Logout
 */
export function ewelinkLogout(sessionKey: string): boolean {
  return sessions.delete(sessionKey);
}

/**
 * Get devices
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
    const conn = session.connection;
    if (!conn) {
      return {
        success: false,
        message: 'Conexão não inicializada. Faça login novamente.',
      };
    }
    
    const deviceList = await conn.getDevices();
    
    console.log(`[eWeLink] Get devices:`, JSON.stringify(deviceList, null, 2));

    if (deviceList?.error) {
      return {
        success: false,
        message: `Erro ao obter dispositivos: ${deviceList.msg || deviceList.error}`,
      };
    }

    const devices: EwelinkDevice[] = (deviceList || []).map((device: any) => {
      let state: 'on' | 'off' | 'unknown' = 'unknown';
      
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
 * Control device (on/off)
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
    const conn = session.connection;
    if (!conn) {
      return {
        success: false,
        message: 'Conexão não inicializada. Faça login novamente.',
      };
    }
    
    const response = await conn.setDevicePowerState(deviceId, action);

    console.log(`[eWeLink] Control device response:`, JSON.stringify(response, null, 2));

    if (response?.error) {
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
 * Toggle device
 */
export async function ewelinkToggleDevice(
  sessionKey: string,
  deviceId: string
): Promise<{ success: boolean; message: string }> {
  const session = getSession(sessionKey);
  
  if (!session) {
    return {
      success: false,
      message: 'Sessão expirada ou inválida. Faça login novamente.',
    };
  }

  try {
    const conn = session.connection;
    if (!conn) {
      return {
        success: false,
        message: 'Conexão não inicializada. Faça login novamente.',
      };
    }
    
    const response = await conn.toggleDevice(deviceId);

    console.log(`[eWeLink] Toggle device response:`, JSON.stringify(response, null, 2));

    if (response?.error) {
      return {
        success: false,
        message: `Erro ao alternar dispositivo: ${response.msg || response.error}`,
      };
    }

    return {
      success: true,
      message: 'Dispositivo alternado com sucesso',
    };
  } catch (error: any) {
    console.error('[eWeLink] Toggle device error:', error);
    return {
      success: false,
      message: `Erro ao alternar dispositivo: ${error.message || 'Erro desconhecido'}`,
    };
  }
}

/**
 * Get single device status
 */
export async function ewelinkGetDevice(
  sessionKey: string,
  deviceId: string
): Promise<{ success: boolean; message: string; device?: EwelinkDevice }> {
  const session = getSession(sessionKey);
  
  if (!session) {
    return {
      success: false,
      message: 'Sessão expirada ou inválida. Faça login novamente.',
    };
  }

  try {
    const conn = session.connection;
    if (!conn) {
      return {
        success: false,
        message: 'Conexão não inicializada. Faça login novamente.',
      };
    }
    
    const device = await conn.getDevice(deviceId);

    console.log(`[eWeLink] Get device response:`, JSON.stringify(device, null, 2));

    if (device?.error) {
      return {
        success: false,
        message: `Erro ao obter dispositivo: ${device.msg || device.error}`,
      };
    }

    let state: 'on' | 'off' | 'unknown' = 'unknown';
    if (device.params?.switch) {
      state = device.params.switch;
    } else if (device.params?.switches?.[0]?.switch) {
      state = device.params.switches[0].switch;
    }

    return {
      success: true,
      message: 'Dispositivo carregado',
      device: {
        deviceid: device.deviceid || '',
        name: device.name || 'Dispositivo sem nome',
        state,
        online: device.online ?? true,
        brandName: device.brandName || device.extra?.brandName || '',
        productModel: device.productModel || device.extra?.productModel || '',
      },
    };
  } catch (error: any) {
    console.error('[eWeLink] Get device error:', error);
    return {
      success: false,
      message: `Erro ao obter dispositivo: ${error.message || 'Erro desconhecido'}`,
    };
  }
}

/**
 * Check session status
 */
export function isSessionValid(sessionKey: string): boolean {
  return getSession(sessionKey) !== null;
}

export function ewelinkCheckSession(sessionKey: string): boolean {
  return isSessionValid(sessionKey);
}
