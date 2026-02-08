import React, { useState, useCallback, useEffect, useRef } from 'react';

// 检查是否为有效的域名格式
const isValidDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain.trim());
};

// DNS查询函数 - 支持IPv4、IPv6和CNAME记录
const queryDNS = async (domain) => {
    try {
        // 并行查询A记录(IPv4)、AAAA记录(IPv6)和CNAME记录
        const [aResponse, aaaaResponse, cnameResponse] = await Promise.all([
            fetch(`https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=A`),
            fetch(`https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=AAAA`),
            fetch(`https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=CNAME`)
        ]);

        let allRecords = [];
        let errors = [];

        // 处理A记录响应
        if (aResponse.ok) {
            const aData = await aResponse.json();
            if (aData.Answer) {
                allRecords = [...allRecords, ...aData.Answer];
            }
        } else {
            errors.push(`A记录查询失败: ${aResponse.status}`);
        }

        // 处理AAAA记录响应
        if (aaaaResponse.ok) {
            const aaaaData = await aaaaResponse.json();
            if (aaaaData.Answer) {
                allRecords = [...allRecords, ...aaaaData.Answer];
            }
        } else {
            errors.push(`AAAA记录查询失败: ${aaaaResponse.status}`);
        }

        // 处理CNAME记录响应
        if (cnameResponse.ok) {
            const cnameData = await cnameResponse.json();
            if (cnameData.Answer) {
                allRecords = [...allRecords, ...cnameData.Answer];
            }
        } else {
            errors.push(`CNAME记录查询失败: ${cnameResponse.status}`);
        }

        // 如果有记录返回成功结果
        if (allRecords.length > 0) {
            return {
                Answer: allRecords,
                error: null
            };
        }

        // 如果都没有记录但请求成功，返回无记录
        if (errors.length === 0) {
            return {
                Answer: null,
                error: '无解析记录'
            };
        }

        // 如果都有错误，返回第一个错误
        return {
            Answer: null,
            error: errors.join('; ')
        };

    } catch (error) {
        return {
            Answer: null,
            error: 'DNS查询失败: ' + error.message
        };
    }
};

// 解析DNS响应数据
const parseDNSResponse = (data) => {
    if (!data || !data.Answer) {
        return {
            records: [],
            error: '无解析记录'
        };
    }

    const records = data.Answer.map(item => {
        // 根据记录类型设置标签和背景色
        let typeLabel = '';
        let bgColor = '';
        
        switch (item.type) {
            case 1: // A记录
                typeLabel = 'IPv4';
                bgColor = 'bg-green-100 text-green-800';
                break;
            case 28: // AAAA记录
                typeLabel = 'IPv6';
                bgColor = 'bg-blue-100 text-blue-800';
                break;
            case 5: // CNAME记录
                typeLabel = 'CNAME';
                bgColor = 'bg-purple-100 text-purple-800';
                break;
            default:
                typeLabel = `TYPE-${item.type}`;
                bgColor = 'bg-gray-100 text-gray-800';
        }
        
        return {
            name: item.name,
            type: item.type,
            typeLabel,
            ttl: item.TTL,
            data: item.data,
            bgColor
        };
    });

    // 按照优先级排序：CNAME(5) > IPv4(1) > IPv6(28)
    const sortedRecords = [...records].sort((a, b) => {
        const priority = { 5: 1, 1: 2, 28: 3 }; // CNAME最高优先级，IPv4次之，IPv6最低
        const priorityA = priority[a.type] || 999;
        const priorityB = priority[b.type] || 999;
        return priorityA - priorityB;
    });

    return {
        records: sortedRecords,
        error: null
    };
};

export default function DnsTool({ content }) {
    console.log('🌐 DnsTool渲染:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        timestamp: Date.now()
    });

    // 如果没有内容，不显示组件
    if (!content || content === undefined || content === null) {
        return null;
    }

    const [results, setResults] = useState({
        original: '',
        records: [],
        isLoading: false,
        error: null
    });
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 DNS工具状态更新:', { hasError: !!results.error });

    // 处理域名查询的核心函数
    const processContent = useCallback(async (inputContent = content) => {
        console.log('🚀 执行processContent:', {
            content: inputContent?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        setResults(prev => ({
            ...prev,
            isLoading: true,
            error: null
        }));

        try {
            const trimmedContent = inputContent?.trim() || '';
            if (!trimmedContent) {
                setResults({
                    original: '',
                    records: [],
                    isLoading: false,
                    error: null
                });
                return;
            }

            // 验证域名格式
            if (!isValidDomain(trimmedContent)) {
                setResults({
                    original: trimmedContent,
                    records: [],
                    isLoading: false,
                    error: '请输入有效的域名格式'
                });
                return;
            }

            // 执行DNS查询
            const dnsData = await queryDNS(trimmedContent);
            
            if (dnsData.error) {
                setResults({
                    original: trimmedContent,
                    records: [],
                    isLoading: false,
                    error: dnsData.error
                });
                return;
            }

            // 解析响应数据
            const parsedData = parseDNSResponse(dnsData);
            
            setResults({
                original: trimmedContent,
                records: parsedData.records,
                isLoading: false,
                error: parsedData.error
            });

        } catch (err) {
            setResults({
                original: inputContent,
                records: [],
                isLoading: false,
                error: err.message
            });
        }
    }, []);

    // 防抖处理content变化
    useEffect(() => {
        console.log('🎯 content变化监听:', {
            content: content?.substring(0, 50) + '...',
            hasContent: !!content,
            lastProcessed: lastProcessedContentRef.current?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        if (!content || content === lastProcessedContentRef.current) {
            console.log('⚠️ content未变化或为空，跳过防抖处理');
            return;
        }

        console.log('🔍 防抖触发:', {content: content.substring(0, 50) + '...', timestamp: Date.now()});

        if (debounceTimerRef.current) {
            console.log('🧹 清除旧定时器:', debounceTimerRef.current);
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            console.log('✅ 防抖执行content变化:', {
                content: content.substring(0, 50) + '...',
                timestamp: Date.now()
            });
            processContent(content);
            
            // 更新最后处理的内容
            lastProcessedContentRef.current = content;
        }, 500);

        console.log('⏰ 设置新定时器:', debounceTimerRef.current, '延迟: 500ms');

        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 组件卸载时清除定时器:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, processContent]);

    // 初始处理
    useEffect(() => {
        if (content && content !== lastProcessedContentRef.current) {
            processContent(content);
            lastProcessedContentRef.current = content;
        }
    }, [content, processContent]);

    return (
        <div>
            <div className="w-full border rounded p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">🌐 DNS解析工具</h3>
                </div>
                
                {/* 错误提示 */}
                {results.error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
                        <strong>查询错误：</strong> {results.error}
                    </div>
                )}

                {/* 加载状态 */}
                {results.isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                        <span className="text-gray-600">正在查询DNS记录...</span>
                    </div>
                )}

                {/* DNS解析结果 */}
                {!results.isLoading && results.records.length > 0 && (
                    <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-700">📋 DNS解析结果</h4>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    🌐 {results.original}
                                </span>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="text-left py-2 px-3 font-medium text-gray-700">记录类型</th>
                                            <th className="text-left py-2 px-3 font-medium text-gray-700">TTL</th>
                                            <th className="text-left py-2 px-3 font-medium text-gray-700">解析地址</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.records.map((record, index) => (
                                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-2 px-3 font-medium text-gray-800">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${record.bgColor}`}>
                                                        {record.typeLabel}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-gray-600">{record.ttl}s</td>
                                                <td className="py-2 px-3">
                                                    <div className="font-mono text-gray-800 bg-gray-50 rounded px-2 py-1 break-all">
                                                        {record.data}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* 统计信息 */}
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                                <span>IPv4记录: {results.records.filter(r => r.type === 1).length} 条</span>
                                <span>IPv6记录: {results.records.filter(r => r.type === 28).length} 条</span>
                                <span>CNAME记录: {results.records.filter(r => r.type === 5).length} 条</span>
                                <span>总计: {results.records.length} 条记录</span>
                            </div>
                            
                            <div className="mt-3 text-xs text-gray-500">
                                共找到 {results.records.length} 条记录
                            </div>
                        </div>
                    </div>
                )}

                {/* 无效域名提示 */}
                {!results.isLoading && results.records.length === 0 && !results.error && results.original && (
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">🔍</div>
                        <div>未找到域名 "{results.original}" 的DNS记录</div>
                        <div className="text-sm mt-1">请检查域名拼写是否正确</div>
                    </div>
                )}

                {/* 空状态提示 */}
                {!content && (
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">🌐</div>
                        <div>请输入域名开始DNS解析</div>
                        <div className="text-sm mt-1">例如: www.google.com 或 github.com</div>
                    </div>
                )}
            </div>
        </div>
    );
}