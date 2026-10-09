export function detectDevice() {
  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  let deviceType = 'desktop';
  let browser = 'Unknown Browser';

  // Detect OS
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
    os = 'iOS';
    deviceType = /iPad/.test(ua) ? 'tablet' : 'mobile';
  } else if (/Android/.test(ua)) {
    os = 'Android';
    deviceType = /Mobile/.test(ua) ? 'mobile' : 'tablet';
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = 'macOS';
    deviceType = 'desktop';
  } else if (/Windows NT/.test(ua)) {
    os = 'Windows';
    deviceType = 'desktop';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
    deviceType = 'desktop';
  }

  // Detect Browser
  if (/Chrome/.test(ua) && !/Chromium|Edge|Edg|OPR/.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/.test(ua)) {
    browser = 'Edge';
  }

  // Friendly default device name
  let defaultName = `${os} ${deviceType === 'desktop' ? 'PC' : deviceType === 'mobile' ? 'Phone' : 'Tablet'}`;
  if (os === 'iOS') {
    defaultName = deviceType === 'tablet' ? 'iPad' : 'iPhone';
  } else if (os === 'macOS') {
    defaultName = 'MacBook';
  } else if (os === 'Android') {
    defaultName = 'Android Device';
  } else if (os === 'Windows') {
    defaultName = 'Windows Laptop';
  }

  // Check saved name in localStorage
  const savedName = localStorage.getItem('sharemyfile_device_name');

  return {
    os,
    deviceType,
    browser,
    name: savedName || defaultName
  };
}

export function saveDeviceName(name) {
  if (name && name.trim()) {
    localStorage.setItem('sharemyfile_device_name', name.trim());
  }
}
