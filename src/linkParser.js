function atob(str) {
  // Use native atob in browsers
  if (typeof window !== 'undefined') {
    return window.atob(str);
  }
  // Fallback to Buffer in Node.js environments
  return Buffer.from(str, 'base64').toString('binary');
}

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

function parseVMessLink(link) {
  const base64 = link.substring(8);
  const decoded = atob(base64);
  const config = JSON.parse(decoded);
  
  return {
    type: 'vmess',
    name: config.ps,
    server: config.add,
    port: config.port,
    uuid: config.id,
    alterId: config.aid || 0,
    cipher: config.scy || 'auto',
    tls: config.tls === 'tls',
    skipCertVerify: false,
    network: config.net || 'tcp',
    wsPath: config.path || '',
    wsHost: config.host || config.add,
    sni: config.sni || config.host || config.add
  };
}

function parseVLESSLink(link) {
  const url = new URL(link);
  const params = new URLSearchParams(url.search);
  
  return {
    type: 'vless',
    name: decodeURIComponent(url.hash.substring(1)),
    server: url.hostname,
    port: parseInt(url.port),
    uuid: url.username,
    tls: params.get('security') === 'tls',
    skipCertVerify: false,
    network: params.get('type') || 'tcp',
    wsPath: params.get('path') || '',
    wsHost: params.get('host') || url.hostname,
    sni: params.get('sni') || params.get('host') || url.hostname
  };
}

function parseTrojanLink(link) {
  const url = new URL(link);
  const params = new URLSearchParams(url.search);
  
  return {
    type: 'trojan',
    name: decodeURIComponent(url.hash.substring(1)),
    server: url.hostname,
    port: parseInt(url.port),
    password: url.username,
    tls: params.get('security') === 'tls',
    skipCertVerify: false,
    network: params.get('type') || 'tcp',
    wsPath: params.get('path') || '',
    wsHost: params.get('host') || url.hostname,
    sni: params.get('sni') || params.get('host') || url.hostname
  };
}

function parseShadowsocksLink(link) {
  const url = new URL(link);
  const params = new URLSearchParams(url.search);
  
  if (params.get('plugin') === 'v2ray-plugin' || params.get('type') === 'ws') {
    return {
      type: 'ss',
      name: decodeURIComponent(url.hash.substring(1)),
      server: url.hostname,
      port: parseInt(url.port),
      cipher: url.protocol.substring(3) || 'none',
      password: url.username,
      tls: params.get('security') === 'tls',
      skipCertVerify: false,
      network: params.get('type') || 'tcp',
      wsPath: params.get('path') || '',
      wsHost: params.get('host') || url.hostname,
      sni: params.get('sni') || params.get('host') || url.hostname
    };
  }
  
  throw new Error('Only Shadowsocks with v2ray-plugin/WebSocket transport is supported');
}v
