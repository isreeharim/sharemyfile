import os from 'os';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

export function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const results = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      // Pick IPv4 and non-internal
      if (net.family === 'IPv4' && !net.internal) {
        const isWifi = /wi-?fi|wlan|wireless/i.test(name);
        const isEthernet = /ethernet|eth|en/i.test(name);
        const isVirtual = /vEthernet|virtual|vmware|vbox|docker|loopback/i.test(name);

        let priority = 1;
        if (isWifi) priority = 3;
        else if (isEthernet) priority = 2;
        if (isVirtual) priority = 0;

        results.push({
          interfaceName: name,
          address: net.address,
          mac: net.mac,
          priority
        });
      }
    }
  }

  // Sort by priority descending
  results.sort((a, b) => b.priority - a.priority);

  if (results.length === 0) {
    results.push({
      interfaceName: 'localhost',
      address: '127.0.0.1',
      mac: '',
      priority: 0
    });
  }

  return results;
}

export function getPrimaryIpAddress() {
  const list = getLocalIpAddresses();
  return list[0]?.address || '127.0.0.1';
}

export async function generateQrDataUrl(url) {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H', // High error correction (30% redundancy)
      margin: 4,                  // Standard 4-module quiet zone margin
      width: 400,                 // High resolution (sharp on retina & 4K displays)
      color: {
        dark: '#000000',          // Pure black modules for maximum contrast
        light: '#ffffff'          // Pure white background
      }
    });
  } catch (err) {
    console.error('Error generating QR code data URL:', err);
    return null;
  }
}

export async function generateQrSvg(url) {
  try {
    return await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 4,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR code SVG:', err);
    return null;
  }
}

export function printTerminalQr(url) {
  try {
    qrcodeTerminal.generate(url, { small: true });
  } catch (e) {
    // ignore
  }
}
