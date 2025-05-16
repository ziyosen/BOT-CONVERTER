// Menggunakan TextDecoder untuk decode base64 di lingkungan CF Workers
function decodeBase64(str) {
  // Alternatif 1: Menggunakan atob (browser API)
  if (typeof atob === 'function') {
    return atob(str);
  }
  
  // Alternatif 2: Implementasi manual base64 decode
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  let char1, char2, char3;
  let enc1, enc2, enc3, enc4;

  // Remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  str = str.replace(/[^A-Za-z0-9+/=]/g, '');

  while (i < str.length) {
    enc1 = base64Chars.indexOf(str.charAt(i++));
    enc2 = base64Chars.indexOf(str.charAt(i++));
    enc3 = base64Chars.indexOf(str.charAt(i++));
    enc4 = base64Chars.indexOf(str.charAt(i++));

    char1 = (enc1 << 2) | (enc2 >> 4);
    char2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    char3 = ((enc3 & 3) << 6) | enc4;

    result += String.fromCharCode(char1);
    if (enc3 !== 64) result += String.fromCharCode(char2);
    if (enc4 !== 64) result += String.fromCharCode(char3);
  }

  return result;
}

export function parseV2RayLink(link) {
  try {
    if (link.startsWith('vmess://')) {
      const base64 = link.substring(8);
      const decoded = decodeBase64(base64);
      let config;
      
      try {
        config = JSON.parse(decoded);
      } catch (e) {
        // Fallback untuk format non-standard
        const match = decoded.match(/{"v":"\d+".*}/);
        if (match) {
          config = JSON.parse(match[0]);
        } else {
          throw new Error('Format VMess tidak valid');
        }
      }
      
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

    if (link.startsWith('vless://')) {
      return parseVLESSLink(link);
    }

    if (link.startsWith('trojan://')) {
      return parseTrojanLink(link);
    }

    if (link.startsWith('ss://')) {
      return parseShadowsocksLink(link);
    }

    throw new Error('Unsupported link type');

  } catch (error) {
    console.error(`Failed to parse link: ${link}`, error);
    throw new Error(`Gagal parsing link VMess: ${error.message}`);
  }
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

  throw new Error('Shadowsocks link invalid');
}

export async function checkProxyStatus(ip, port) {
    const url = `https://api2.stupidworld.web.id/check?ip=${ip}:${port}`;
    console.log(`Checking proxy status for ${ip}:${port}...`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("API Response:", data);

        if (data.proxyip === true) {
            return {
                status: 'active',
                ip: data.ip ?? 'Unknown',
                port: data.port ?? 'Unknown',
                asOrganization: data.asOrganization ?? 'Unknown',
                countryCode: data.countryCode ?? 'Unknown',
                countryName: data.countryName ?? 'Unknown',
                countryFlag: data.countryFlag ?? '',
                asn: data.asn ?? 'Unknown',
                city: data.colo ?? '',
                httpProtocol: data.httpProtocol ?? 'Unknown',
                delay: data.delay ?? 'Unknown',
                latitude: data.latitude ?? 'Unknown',
                longitude: data.longitude ?? 'Unknown'
            };
        } else {
            return {
                status: 'dead',
                message: data.message ?? 'Proxy mati'
            };
        }
    } catch (error) {
        console.error('Error checking proxy status:', error);
        return {
            status: 'dead',
            message: 'Gagal menghubungi server pengecekan.'
        };
    }
}

export async function fetchProxyList(countryCode, chatId) {
    const url = `https://raw.githubusercontent.com/stpdwrld/Stupid-Tunnel/refs/heads/main/allproxy.txt`;

    try {
        const searchingMessageId = await sendMessage(chatId, '⏳ Sedang mencari proxy aktif...');
        if (!searchingMessageId) return;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Gagal mengambil data');

        const textData = await response.text();
        const lines = textData.split('\n').map(line => line.trim()).filter(Boolean);

        const proxyList = lines
            .map(line => {
                const [ip, port, country, isp] = line.split(',');
                return { ip, port, country, isp };
            })
            .filter(proxy => proxy.country.toLowerCase() === countryCode.toLowerCase());

        if (proxyList.length === 0) {
            await editMessage(chatId, searchingMessageId, '⚠️ Tidak ada proxy tersedia untuk negara ini.');
            return 'Tidak ada proxy tersedia untuk negara ini.';
        }

        let unusedProxies = proxyList.filter(p => `${p.ip}:${p.port}` !== selectedProxies[chatId]);

        if (unusedProxies.length === 0) {
            selectedProxies[chatId] = null;
            unusedProxies = proxyList;
        }

        unusedProxies = unusedProxies.sort(() => Math.random() - 0.5);

        for (const { ip, port, isp } of unusedProxies) {
            if (await checkProxyStatus(ip, port)) {
                const proxyStr = `${ip}:${port}`;
                selectedProxies[chatId] = proxyStr;
                await editMessage(chatId, searchingMessageId, `✅ IP/Port aktif ditemukan: ${proxyStr}\nISP: ${isp}`);
                await deleteMessage(chatId, searchingMessageId);
                return proxyStr;
            }
        }

        await editMessage(chatId, searchingMessageId, '⚠️ Tidak ada proxy aktif yang tersedia saat ini.');
        await deleteMessage(chatId, searchingMessageId);
        return 'Tidak ada proxy aktif yang tersedia saat ini.';
    } catch (error) {
        console.error('Error fetching proxy list:', error);
        return 'Terjadi kesalahan, coba lagi nanti.';
    }
}
