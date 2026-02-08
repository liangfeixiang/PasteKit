import React, { useState, useCallback, useEffect, useRef } from 'react';

// 检查是否为有效的IPv4地址
const isValidIPv4 = (ip) => {
    const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
};

// 检查是否为有效的IPv6地址
const isValidIPv6 = (ip) => {
    // IPv6完整格式：xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx
    // IPv6压缩格式：支持::表示连续的0段
    const ipv6FullRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    const ipv6CompressedRegex = /^(([0-9a-fA-F]{1,4}:){1,7}:|:(([0-9a-fA-F]{1,4}:){1,7}|:)|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
    
    return ipv6FullRegex.test(ip) || ipv6CompressedRegex.test(ip);
};

// 检查是否为有效的CIDR格式（如 192.168.1.0/24）
const isValidCIDR = (cidr) => {
    const cidrRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([1-9]|[12][0-9]|3[0-2])$/;
    return cidrRegex.test(cidr);
};

// 检查是否为有效的IPv6 CIDR格式（如 2001:db8::/32）
const isValidIPv6CIDR = (cidr) => {
    const parts = cidr.split('/');
    if (parts.length !== 2) return false;
    
    const [ip, prefix] = parts;
    const prefixNum = parseInt(prefix, 10);
    
    // IPv6前缀长度范围是0-128
    if (prefixNum < 0 || prefixNum > 128) return false;
    
    return isValidIPv6(ip);
};

// 解析CIDR并计算相关信息
const parseCIDR = (cidr) => {
    try {
        const [network, prefix] = cidr.split('/');
        const prefixLength = parseInt(prefix, 10);
        
        // 计算子网掩码
        const mask = Array(32).fill('1').fill('0', prefixLength).join('');
        const maskParts = [
            parseInt(mask.substring(0, 8), 2),
            parseInt(mask.substring(8, 16), 2),
            parseInt(mask.substring(16, 24), 2),
            parseInt(mask.substring(24, 32), 2)
        ];
        const subnetMask = maskParts.join('.');
        
        // 计算网络地址
        const ipParts = network.split('.').map(part => parseInt(part, 10));
        const networkAddressParts = [];
        for (let i = 0; i < 4; i++) {
            const octet = ipParts[i].toString(2).padStart(8, '0');
            const maskedOctet = octet.substring(0, Math.floor(prefixLength / 8 + (i === Math.floor(prefixLength / 8) ? prefixLength % 8 : 0))); // 简化处理
            networkAddressParts.push(parseInt(maskedOctet.padEnd(8, '0'), 2));
        }
        const networkAddress = networkAddressParts.join('.');
        
        // 计算广播地址
        const hostBits = 32 - prefixLength;
        const maxHosts = Math.pow(2, hostBits) - 2; // 减去网络地址和广播地址
        
        // 计算可用IP数量
        const totalIPCount = Math.pow(2, hostBits);
        const usableIPCount = totalIPCount - 2; // 减去网络地址和广播地址
        
        // 计算起始和结束IP
        const startIP = [...networkAddressParts];
        startIP[3] += 1; // 第一个可用IP
        
        const endIP = [...networkAddressParts];
        const broadcast = [];
        for (let i = 0; i < 4; i++) {
            broadcast.push(~maskParts[i] & 0xFF); // 反转掩码得到广播地址部分
        }
        endIP[0] = (networkAddressParts[0] | broadcast[0]) & 0xFF;
        endIP[1] = (networkAddressParts[1] | broadcast[1]) & 0xFF;
        endIP[2] = (networkAddressParts[2] | broadcast[2]) & 0xFF;
        endIP[3] = (networkAddressParts[3] | broadcast[3]) - 1; // 最后一个可用IP
        
        return {
            networkAddress,
            subnetMask,
            prefixLength,
            totalIPCount,
            usableIPCount,
            startIP: startIP.join('.'),
            endIP: endIP.join('.'),
            broadcastAddress: [networkAddressParts[0] | broadcast[0], 
                             networkAddressParts[1] | broadcast[1], 
                             networkAddressParts[2] | broadcast[2], 
                             networkAddressParts[3] | broadcast[3]].join('.'),
            error: null
        };
    } catch (e) {
        return {
            error: 'CIDR格式解析失败: ' + e.message
        };
    }
};

// 解析IPv6 CIDR
const parseIPv6CIDR = (cidr) => {
    try {
        const [network, prefix] = cidr.split('/');
        const prefixLength = parseInt(prefix, 10);
        
        // 计算可用地址数量（简化处理）
        const hostBits = 128 - prefixLength;
        const totalAddresses = Math.pow(2, hostBits);
        const usableAddresses = totalAddresses > 2 ? totalAddresses - 2 : 0; // 减去网络地址和广播地址
        
        return {
            networkAddress: network,
            prefixLength,
            totalAddresses,
            usableAddresses,
            error: null
        };
    } catch (e) {
        return {
            error: 'IPv6 CIDR格式解析失败: ' + e.message
        };
    }
};

// 获取单个IP的信息
// 添加请求缓存
const ipInfoCache = new Map();

const getIpInfo = async (ip) => {
    // 检查缓存
    if (ipInfoCache.has(ip)) {
        console.log('キャッシング 从缓存获取IP信息:', ip);
        return ipInfoCache.get(ip);
    }
    
    try {
        console.log('🌐 发起IP信息请求:', ip);
        // 对于IPv6地址，需要进行URL编码处理
        const encodedIp = encodeURIComponent(ip);
        const response = await fetch(`https://free.freeipapi.com/api/json/${encodedIp}`);
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }
        const data = await response.json();
        const result = {
            ...data,
            error: null
        };
        
        // 缓存结果（设置5分钟过期）
        ipInfoCache.set(ip, result);
        setTimeout(() => {
            ipInfoCache.delete(ip);
        }, 5 * 60 * 1000);
        
        return result;
    } catch (error) {
        const errorResult = {
            error: '获取IP信息失败: ' + error.message
        };
        // 错误也缓存一段时间，避免频繁重试
        ipInfoCache.set(ip, errorResult);
        setTimeout(() => {
            ipInfoCache.delete(ip);
        }, 60 * 1000);
        
        return errorResult;
    }
};

// 获取本机IP信息
const getMyIpInfo = async () => {
    try {
        const response = await fetch('https://free.freeipapi.com/api/json');
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }
        const data = await response.json();
        return {
            ...data,
            error: null
        };
    } catch (error) {
        return {
            error: '获取本机IP信息失败: ' + error.message
        };
    }
};

export default function IpTool({ content, showMyIp = true }) {
    console.log('🌐 IpTool渲染:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        timestamp: Date.now()
    });

    // 如果没有内容，自动查询本机IP
    const isEmptyContent = !content || content === undefined || content === null;

    const [results, setResults] = useState({
        original: '',
        type: 'unknown', // 'ipv4', 'ipv6', 'cidr', 'ipv6cidr', 'invalid'
        ipInfo: null,
        cidrInfo: null
    });
    const [error, setError] = useState(null);
    const [myIpInfo, setMyIpInfo] = useState(null);
    const [isFetchingMyIp, setIsFetchingMyIp] = useState(false);
    const [autoQueryDone, setAutoQueryDone] = useState(false);
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 IP工具状态更新:', { hasError: !!error });

    // 处理IP内容的核心函数
    const processContent = useCallback(async (inputContent = content) => {
        console.log('🚀 执行processContent:', {
            content: inputContent?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        setError(null);
        setResults({
            original: inputContent,
            type: 'unknown',
            ipInfo: null,
            cidrInfo: null
        });

        try {
            const trimmedContent = inputContent?.trim() || '';
            if (!trimmedContent) {
                return;
            }

            const newResults = {
                original: trimmedContent
            };

            // 检测内容类型并处理（按优先级排序）
            if (isValidIPv6CIDR(trimmedContent)) {
                // 是IPv6 CIDR格式
                newResults.type = 'ipv6cidr';
                newResults.cidrInfo = parseIPv6CIDR(trimmedContent);
            } else if (isValidCIDR(trimmedContent)) {
                // 是IPv4 CIDR格式，进行子网计算
                newResults.type = 'cidr';
                newResults.cidrInfo = parseCIDR(trimmedContent);
            } else if (isValidIPv6(trimmedContent)) {
                // 是IPv6地址，获取IP信息
                newResults.type = 'ipv6';
                newResults.ipInfo = await getIpInfo(trimmedContent);
            } else if (isValidIPv4(trimmedContent)) {
                // 是IPv4地址，获取IP信息
                newResults.type = 'ipv4';
                newResults.ipInfo = await getIpInfo(trimmedContent);
            } else {
                // 无效的IP格式
                newResults.type = 'invalid';
                setError('输入的不是有效的IP地址或CIDR格式');
            }

            setResults(newResults);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    // 查询本机IP的函数
    const handleQueryMyIp = async () => {
        setIsFetchingMyIp(true);
        setError(null);
        
        try {
            const myIpData = await getMyIpInfo();
            setMyIpInfo(myIpData);
            
            // 清空之前的结果
            setResults({
                original: '',
                type: 'unknown',
                ipInfo: null,
                cidrInfo: null
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsFetchingMyIp(false);
        }
    };

    // 防抖处理content变化（合并初始处理和变化监听）
    useEffect(() => {
        console.log('🎯 content变化监听:', {
            content: content?.substring(0, 50) + '...',
            hasContent: !!content,
            lastProcessed: lastProcessedContentRef.current?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        // 如果content为空或未变化，跳过处理
        if (!content || content === lastProcessedContentRef.current) {
            console.log('⚠️ content未变化或为空，跳过处理');
            return;
        }

        console.log('🔍 防抖触发:', {content: content.substring(0, 50) + '...', timestamp: Date.now()});

        // 清除之前的定时器
        if (debounceTimerRef.current) {
            console.log('🧹 清除旧定时器:', debounceTimerRef.current);
            clearTimeout(debounceTimerRef.current);
        }

        // 设置新的防抖定时器
        debounceTimerRef.current = setTimeout(() => {
            console.log('✅ 防抖执行content变化:', {
                content: content.substring(0, 50) + '...',
                timestamp: Date.now()
            });
            processContent(content);
            
            // 更新最后处理的内容
            lastProcessedContentRef.current = content;
        }, 300);

        console.log('⏰ 设置新定时器:', debounceTimerRef.current, '延迟: 300ms');

        // 清理函数
        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 组件卸载时清除定时器:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, processContent]);

    // 自动查询本机IP（当内容为空时）
    useEffect(() => {
        console.log('🔄 自动查询useEffect触发:', {
            isEmptyContent,
            autoQueryDone,
            isFetchingMyIp,
            myIpInfo: !!myIpInfo
        });
        
        if (!autoQueryDone && !isFetchingMyIp) {
            console.log('🔄 开始自动查询本机IP');
            setAutoQueryDone(true);
            handleQueryMyIp();
        }
    }, [isEmptyContent, autoQueryDone, isFetchingMyIp]);

    return (
        <div>
            <div className="w-full border rounded p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">IP工具</h3>
                </div>
                
                {/* 错误提示 */}
                {error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
                        <strong>处理错误：</strong> {error}
                    </div>
                )}

                {/* 本机IP显示 */}
                {showMyIp && myIpInfo && (
                    <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-700">🏠 本机公网IP</h4>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    🌐 自动获取
                                </span>
                            </div>
                            
                            {myIpInfo.error ? (
                                <div className="text-red-600 text-sm text-center py-2">
                                    ❌ {myIpInfo.error}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="text-2xl font-mono font-bold text-gray-800 mb-1 max-w-full break-all overflow-x-auto">
                                        {myIpInfo.ipAddress}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        IPv{myIpInfo.ipVersion} 地址
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Content IP信息显示 */}
                {content && (
                    <>
                        {/* IPv4地址信息 */}
                        {results.type === 'ipv4' && results.ipInfo && (
                            <div className="space-y-4">
                                <div className="border rounded-lg p-4 bg-blue-50 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-700">📍 IPv4地址信息</h4>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            🔍 查询结果
                                        </span>
                                    </div>
                                    {results.ipInfo.error ? (
                                        <div className="text-red-600 text-sm text-center py-2">
                                            {results.ipInfo.error}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">IP地址:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.ipAddress}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">国家:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.countryName}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">省份:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.regionName}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">城市:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.cityName}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">纬度:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.latitude}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">经度:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.longitude}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">ISP:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.isp}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">组织:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.organization}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* IPv6地址信息 */}
                        {results.type === 'ipv6' && results.ipInfo && (
                            <div className="space-y-4">
                                <div className="border rounded-lg p-4 bg-purple-50 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-700">📍 IPv6地址信息</h4>
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                            🔍 查询结果
                                        </span>
                                    </div>
                                    {results.ipInfo.error ? (
                                        <div className="text-red-600 text-sm text-center py-2">
                                            {results.ipInfo.error}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">IP地址:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.ipAddress}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">国家:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.countryName}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">省份:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.regionName}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">城市:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.cityName}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">纬度:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.latitude}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">经度:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.longitude}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">ISP:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.isp}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-right text-gray-600 mr-2">组织:</span>
                                                <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.organization}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* 无效输入提示 */}
                        {results.type === 'invalid' && !error && (
                            <div className="text-center text-gray-500 py-6">
                                <div className="text-3xl mb-2">❌</div>
                                <div className="font-medium">请输入有效的IP地址或CIDR格式</div>
                                <div className="text-sm mt-1 text-gray-400">例如: 221.111.111.111 或 2001:db8::1 或 192.168.1.0/24</div>
                            </div>
                        )}
                    </>
                )}
                
                {/* IPv4 CIDR计算结果 */}
                {results.type === 'cidr' && results.cidrInfo && (
                    <div className="space-y-4">
                        <div className="border rounded p-3 bg-green-50">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-700">🧮 IPv4子网计算结果</h4>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    🔢 IPv4 CIDR
                                </span>
                            </div>
                            {results.cidrInfo.error ? (
                                <div className="text-xs text-red-600">
                                    {results.cidrInfo.error}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div><strong>网络地址:</strong> {results.cidrInfo.networkAddress}</div>
                                    <div><strong>子网掩码:</strong> {results.cidrInfo.subnetMask}</div>
                                    <div><strong>CIDR前缀:</strong> /{results.cidrInfo.prefixLength}</div>
                                    <div><strong>总IP数:</strong> {results.cidrInfo.totalIPCount}</div>
                                    <div><strong>可用IP数:</strong> {results.cidrInfo.usableIPCount}</div>
                                    <div><strong>起始IP:</strong> {results.cidrInfo.startIP}</div>
                                    <div><strong>结束IP:</strong> {results.cidrInfo.endIP}</div>
                                    <div><strong>广播地址:</strong> {results.cidrInfo.broadcastAddress}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* IPv6 CIDR计算结果 */}
                {results.type === 'ipv6cidr' && results.cidrInfo && (
                    <div className="space-y-4">
                        <div className="border rounded p-3 bg-indigo-50">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-700">🧮 IPv6子网计算结果</h4>
                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                                    🔢 IPv6 CIDR
                                </span>
                            </div>
                            {results.cidrInfo.error ? (
                                <div className="text-xs text-red-600">
                                    {results.cidrInfo.error}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="break-all"><strong>网络地址:</strong> {results.cidrInfo.networkAddress}</div>
                                    <div><strong>CIDR前缀:</strong> /{results.cidrInfo.prefixLength}</div>
                                    <div><strong>总地址数:</strong> {results.cidrInfo.totalAddresses}</div>
                                    <div><strong>可用地址数:</strong> {results.cidrInfo.usableAddresses}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {results.type === 'invalid' && !error && (
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">❌</div>
                        <div>请输入有效的IP地址或CIDR格式</div>
                        <div className="text-sm mt-1">例如: 221.111.111.111 或 2001:db8::1 或 192.168.1.0/24 或 2001:db8::/32</div>
                    </div>
                )}

                {/* 空状态提示 */}
                {!content && !myIpInfo && !isFetchingMyIp && (
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">🌐</div>
                        <div>正在自动查询本机IP地址...</div>
                        <div className="text-sm mt-1">支持IPv4/IPv6地址查询和子网计算</div>
                    </div>
                )}
            </div>
        </div>
    );
}