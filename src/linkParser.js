function decodeBase64(str) {
  return Buffer.from(str, 'base64').toString('utf-8');
}

export function parseV2RayLink(link) {
  try {
    if (link.startsWith('vmess://')) {
      const base64 = link.substring(8);
      const decoded = decodeBase64(base64);
      const config = JSON.parse(decoded);
      
      return {
        type: 'vmess',
        name: config.ps || `VMess-${config.add}:${config.port}`,
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
    // ... (parser lainnya tetap sama)
  } catch (error) {
    console.error(`Failed to parse link: ${link}`, error);
    throw new Error(`Gagal parsing link: ${link.substring(0, 30)}...`);
  }
}
