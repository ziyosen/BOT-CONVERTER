function decodeBase64(str) {
  // Using atob which is available in Cloudflare Workers
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

function parseUrlParams(url) {
  const params = new URLSearchParams(url.search);
  return {
    type: params.get('type') || 'tcp',
    path: params.get('path') || '',
    host: params.get('host') || url.hostname,
    sni: params.get('sni') || params.get('host') || url.hostname,
    security: params.get('security') || 'none',
    encryption: params.get('encryption') || 'none'
  };
}

export function parseV2RayLink(link) {
  try {
    if (link.startsWith('vmess://')) {
      const base64 = link.substring(8);
      const decoded = decodeBase64(base64);
      let config;
      
      try {
        config = JSON.parse(decoded);
      } catch {
        // Fallback for non-standard formats
        const jsonMatch = decoded.match(/{.*}/);
        if (jsonMatch) config = JSON.parse(jsonMatch[0]);
        else throw new Error('Invalid VMess format');
      }

      return {
        type: 'vmess',
        name: config.ps || `VMess ${config.add}:${config.port}`,
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

    const url = new URL(link);
    const params = parseUrlParams(url);
    const name = decodeURIComponent(url.hash.substring(1) || 
                `${url.protocol.replace('://','')} ${url.hostname}:${url.port}`;

    if (link.startsWith('vless://')) {
      return {
        type: 'vless',
        name,
        server: url.hostname,
        port: parseInt(url.port),
        uuid: url.username,
        tls: params.security === 'tls',
        skipCertVerify: false,
        network: params.type,
        wsPath: params.path,
        wsHost: params.host,
        sni: params.sni
      };
    }

    if (link.startsWith('trojan://')) {
      return {
        type: 'trojan',
        name,
        server: url.hostname,
        port: parseInt(url.port),
        password: url.username,
        tls: params.security === 'tls',
        skipCertVerify: false,
        network: params.type,
        wsPath: params.path,
        wsHost: params.host,
        sni: params.sni
      };
    }

    if (link.startsWith('ss://')) {
      return {
        type: 'ss',
        name,
        server: url.hostname,
        port: parseInt(url.port),
        cipher: url.protocol.substring(3, url.protocol.length-1) || 'none',
        password: url.username,
        tls: params.security === 'tls',
        skipCertVerify: false,
        network: params.type,
        wsPath: params.path,
        wsHost: params.host,
        sni: params.sni
      };
    }

    throw new Error('Unsupported link type');
  } catch (error) {
    console.error(`Failed to parse link: ${link.substring(0, 50)}...`, error);
    throw new Error(`Invalid config: ${error.message}`);
  }
}
