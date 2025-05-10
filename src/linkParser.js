function atob(str) {
  return Buffer.from(str, 'base64').toString('utf-8');
}

// Fungsi utama untuk memparse berbagai jenis link
export function parseV2RayLink(link) {
  if (link.startsWith('vmess://')) {
    return parseVMessLink(link);
  } else if (link.startsWith('vless://')) {
    return parseVLESSLink(link);
  } else if (link.startsWith('trojan://')) {
    return parseTrojanLink(link);
  } else if (link.startsWith('ss://')) {
    return parseShadowsocksLink(link);
  }
  throw new Error('Unsupported link type');
}

// Fungsi untuk memparse link VMess
function parseVMessLink(link) {
  const base64 = link.substring(8);
  const decoded = atob(base64);

  // Memastikan data yang didekode adalah JSON yang valid
  let config;
  try {
    config = JSON.parse(decoded);
  } catch (e) {
    console.error('Failed to parse VMess config:', e);
    throw new Error('Invalid VMess link');
  }

  return {
    type: 'vmess',
    name: config.ps,
    server: config.add,
    port: config.port,
    uuid: config.id,
    alterId: config.aid || 0,
    cipher: config.scy || 'auto',
    tls: config.tls === 'tls', // Memastikan TLS di-set dengan benar
    skipCertVerify: false,
    network: config.net || 'tcp', // Defaultkan network ke 'tcp' jika tidak ada
    wsPath: config.path || '', // Path WebSocket (jika ada)
    wsHost: config.host || config.add, // Host WebSocket (jika ada)
    sni: config.sni || config.host || config.add // SNI fallback ke host atau server
  };
}

// Fungsi untuk memparse link VLESS
function parseVLESSLink(link) {
  const url = new URL(link);
  const params = new URLSearchParams(url.search);

  return {
    type: 'vless',
    name: decodeURIComponent(url.hash.substring(1)), // Nama dari hash (fragment)
    server: url.hostname,
    port: parseInt(url.port),
    uuid: url.username,
    tls: params.get('security') === 'tls',
    skipCertVerify: false,
    network: params.get('type') || 'tcp', // Defaultkan network ke 'tcp'
    wsPath: params.get('path') || '', // Path WebSocket (jika ada)
    wsHost: params.get('host') || url.hostname, // Host WebSocket (jika ada)
    sni: params.get('sni') || params.get('host') || url.hostname // SNI fallback
  };
}

// Fungsi untuk memparse link Trojan
function parseTrojanLink(link) {
  const url = new URL(link);
  const params = new URLSearchParams(url.search);

  return {
    type: 'trojan',
    name: decodeURIComponent(url.hash.substring(1)), // Nama dari hash (fragment)
    server: url.hostname,
    port: parseInt(url.port),
    password: url.username, // Password dari username
    tls: params.get('security') === 'tls',
    skipCertVerify: false,
    network: params.get('type') || 'tcp', // Defaultkan network ke 'tcp'
    wsPath: params.get('path') || '', // Path WebSocket (jika ada)
    wsHost: params.get('host') || url.hostname, // Host WebSocket (jika ada)
    sni: params.get('sni') || params.get('host') || url.hostname // SNI fallback
  };
}

// Fungsi untuk memparse link Shadowsocks dengan v2ray-plugin atau WebSocket
function parseShadowsocksLink(link) {
  const url = new URL(link);
  const params = new URLSearchParams(url.search);

  if (params.get('plugin') === 'v2ray-plugin' || params.get('type') === 'ws') {
    return {
      type: 'ss',
      name: decodeURIComponent(url.hash.substring(1)), // Nama dari hash (fragment)
      server: url.hostname,
      port: parseInt(url.port),
      cipher: url.protocol.substring(3) || 'none', // Cipher dari protokol
      password: url.username, // Password dari username
      tls: params.get('security') === 'tls',
      skipCertVerify: false,
      network: params.get('type') || 'tcp', // Defaultkan network ke 'tcp'
      wsPath: params.get('path') || '', // Path WebSocket (jika ada)
      wsHost: params.get('host') || url.hostname, // Host WebSocket (jika ada)
      sni: params.get('sni') || params.get('host') || url.hostname // SNI fallback
    };
  }

  throw new Error('Only Shadowsocks with v2ray-plugin/WebSocket transport is supported');
}
