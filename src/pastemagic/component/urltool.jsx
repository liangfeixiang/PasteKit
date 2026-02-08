import React, { useState, useCallback, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// URL工具函数

// URL编码
const encodeUrl = (str) => {
    try {
        return encodeURIComponent(str);
    } catch (e) {
        throw new Error('URL编码失败: ' + e.message);
    }
};

// URL解码
const decodeUrl = (str) => {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        throw new Error('URL解码失败: ' + e.message);
    }
};

// 检测URL格式
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// 检测是否为URL编码格式
const isUrlEncoded = (str) => {
    // 检查是否有百分号编码字符
    const urlEncodedPattern = /%[0-9A-Fa-f]{2}/;
    return urlEncodedPattern.test(str);
};

// 检测是否为Base64编码
const isBase64Encoded = (str) => {
    // Base64 字符串只能包含 A-Z, a-z, 0-9, +, /, = 这些字符，并且长度是4的倍数
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) return false;
    try {
        // 验证是否能正确解析
        const decoded = atob(str);
        return btoa(decoded) === str;
    } catch (e) {
        return false;
    }
};

// Base64解码
const decodeBase64 = (str) => {
    try {
        return atob(str);
    } catch (e) {
        throw new Error('Base64解码失败: ' + e.message);
    }
};

// Base64编码
const encodeBase64 = (str) => {
    try {
        return btoa(str);
    } catch (e) {
        throw new Error('Base64编码失败: ' + e.message);
    }
};

// 检测是否为十六进制编码
const isHexEncoded = (str) => {
    // 检查是否是十六进制字符串（通常以0x开头或只包含十六进制字符）
    const hexRegex = /^(0x)?[0-9a-fA-F]+$/;
    return hexRegex.test(str) && str.length % 2 === 0;
};

// 十六进制解码
const decodeHex = (str) => {
    try {
        let cleanStr = str.replace(/^0x/i, '');
        let result = '';
        for (let i = 0; i < cleanStr.length; i += 2) {
            result += String.fromCharCode(parseInt(cleanStr.substr(i, 2), 16));
        }
        return result;
    } catch (e) {
        throw new Error('十六进制解码失败: ' + e.message);
    }
};

// 十六进制编码
const encodeHex = (str) => {
    try {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += str.charCodeAt(i).toString(16).padStart(2, '0');
        }
        return result;
    } catch (e) {
        throw new Error('十六进制编码失败: ' + e.message);
    }
};

// 使用专业二维码组件库，已移除自实现算法

export default function UrlTool({ content }) {
    console.log('🔗 UrlTool渲染:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        timestamp: Date.now()
    });

    // 如果没有内容，不显示组件
    if (!content || content === undefined || content === null) {
        return null;
    }

    const [results, setResults] = useState({
        encoded: '',
        decoded: '',
        original: '',
        qrcode: null,
        contentType: 'unknown', // 'url', 'url_encoded', 'base64', 'hex', 'other'
        decodedType: '' // 记录解码类型
    });
    const [error, setError] = useState(null);
    const [qrSize, setQrSize] = useState(200);
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 URL工具状态更新:', { hasError: !!error });

    // 处理编码解码的核心函数
    const processContent = useCallback((inputContent = content) => {
        console.log('🚀 执行processContent:', {
            content: inputContent?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        setError(null);
        setResults({
            encoded: '',
            decoded: '',
            original: inputContent,
            qrcode: null,
            contentType: 'unknown',
            decodedType: ''
        });

        try {
            const trimmedContent = inputContent?.trim() || '';
            if (!trimmedContent) {
                return;
            }

            const newResults = {
                original: trimmedContent
            };

            // 检测内容类型并处理
            if (isUrlEncoded(trimmedContent)) {
                // 是URL编码内容，进行解码
                try {
                    newResults.decoded = decodeUrl(trimmedContent);
                    newResults.contentType = 'url_encoded';
                    newResults.decodedType = 'URL编码';
                    
                    // 对解码后的内容再次编码，用于对比
                    newResults.encoded = encodeUrl(newResults.decoded);
                } catch (e) {
                    // 解码失败
                    setError('URL编码内容解码失败: ' + e.message);
                    newResults.decoded = trimmedContent;
                    newResults.contentType = 'other';
                }
            } else if (isBase64Encoded(trimmedContent)) {
                // 是Base64编码内容，进行解码
                try {
                    newResults.decoded = decodeBase64(trimmedContent);
                    newResults.contentType = 'base64';
                    newResults.decodedType = 'Base64';
                    
                    // 对解码后的内容再次编码，用于对比
                    newResults.encoded = encodeBase64(newResults.decoded);
                } catch (e) {
                    // 解码失败
                    setError('Base64编码内容解码失败: ' + e.message);
                    newResults.decoded = trimmedContent;
                    newResults.contentType = 'other';
                }
            } else if (isHexEncoded(trimmedContent)) {
                // 是十六进制编码内容，进行解码
                try {
                    newResults.decoded = decodeHex(trimmedContent);
                    newResults.contentType = 'hex';
                    newResults.decodedType = '十六进制';
                    
                    // 对解码后的内容再次编码，用于对比
                    newResults.encoded = encodeHex(newResults.decoded);
                } catch (e) {
                    // 解码失败
                    setError('十六进制编码内容解码失败: ' + e.message);
                    newResults.decoded = trimmedContent;
                    newResults.contentType = 'other';
                }
            } else if (isValidUrl(trimmedContent)) {
                // 是普通URL，进行编码
                newResults.encoded = encodeUrl(trimmedContent);
                newResults.decoded = trimmedContent; // URL本身也可以作为"解码"内容
                newResults.contentType = 'url';
                newResults.decodedType = 'URL';
            } else {
                // 其他内容，按普通文本处理
                newResults.encoded = encodeUrl(trimmedContent);
                newResults.decoded = decodeUrl(trimmedContent);
                newResults.contentType = 'other';
                newResults.decodedType = '普通文本';
            }

            // 生成二维码 - 根据内容类型决定二维码内容
            if (newResults.contentType === 'url_encoded' || newResults.contentType === 'base64' || newResults.contentType === 'hex') {
                // 如果是各种编码的URL，使用解码后的内容生成二维码
                newResults.qrcode = newResults.decoded;
            } else if (newResults.contentType === 'url') {
                // 如果是普通URL，使用原始内容生成二维码
                newResults.qrcode = trimmedContent;
            } else {
                // 其他情况使用原始内容
                newResults.qrcode = trimmedContent;
            }

            setResults(newResults);
        } catch (err) {
            setError(err.message);
        }
    }, [setResults, setError]); // 添加必要的依赖

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
        }, 300); // 减少延迟以获得更快速的响应

        console.log('⏰ 设置新定时器:', debounceTimerRef.current, '延迟: 300ms');

        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 组件卸载时清除定时器:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, processContent]); // 包含所有必要的依赖

    // 初始处理
    useEffect(() => {
        if (content && content !== lastProcessedContentRef.current) {
            processContent(content);
            lastProcessedContentRef.current = content;
        }
    }, [content, processContent]); // 包含所有必要的依赖

    return (
        <div>
            <div className="w-full border rounded p-4 space-y-4">
                <h3 className="text-lg font-bold">编码解码工具</h3>
                
                {/* 错误提示 */}
                {error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
                        <strong>处理错误：</strong> {error}
                    </div>
                )}

                {/* 根据内容类型显示编码/解码结果 */}
                {(results.contentType === 'url_encoded' || results.contentType === 'base64' || results.contentType === 'hex') && (
                    // 如果是编码内容，显示解码结果
                    <div className="space-y-4">
                        <div className="border rounded p-3 bg-yellow-50">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-700">📤 {results.decodedType}解码结果</h4>
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                    🔐 已解码
                                </span>
                            </div>
                            {results.decoded ? (
                                <div className="text-xs font-mono bg-orange-100 px-2 py-1 rounded break-all">
                                    {results.decoded}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 italic">
                                    解码失败或输入不是编码格式
                                </div>
                            )}
                        </div>
                        
                        <div className="border rounded p-3 bg-green-50">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-700">📥 {results.decodedType}编码对比</h4>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    🔧 对比
                                </span>
                            </div>
                            {results.encoded ? (
                                <div className="text-xs font-mono bg-green-100 px-2 py-1 rounded break-all">
                                    {results.encoded}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 italic">
                                    编码失败
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {results.contentType === 'url' && (
                    // 如果是普通URL，显示编码结果
                    <div className="space-y-4">
                        <div className="border rounded p-3 bg-green-50">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-700">📥 URL编码</h4>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    🌐 URL
                                </span>
                            </div>
                            {results.encoded ? (
                                <div className="text-xs font-mono bg-green-100 px-2 py-1 rounded break-all">
                                    {results.encoded}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 italic">
                                    URL已进行编码
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {results.contentType === 'other' && (
                    // 如果是其他内容，显示编码结果
                    <div className="space-y-4">
                        <div className="border rounded p-3 bg-green-50">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-700">📥 文本编码</h4>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    📝 文本
                                </span>
                            </div>
                            {results.encoded ? (
                                <div className="text-xs font-mono bg-green-100 px-2 py-1 rounded break-all">
                                    {results.encoded}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 italic">
                                    内容已进行URL编码
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 二维码区域 - 总是显示，自动基于合适的内容生成 */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mr-2">
                                二维码尺寸:
                            </label>
                            <select 
                                value={qrSize}
                                onChange={(e) => setQrSize(Number(e.target.value))}
                                className="px-3 py-1 border rounded text-sm"
                            >
                                <option value={100}>100×100</option>
                                <option value={150}>150×150</option>
                                <option value={200}>200×200</option>
                                <option value={250}>250×250</option>
                                <option value={300}>300×300</option>
                            </select>
                        </div>
                        
                        <button
                            onClick={() => processContent(content)} // 重新处理以更新二维码
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                        >
                            🔄 重新生成
                        </button>
                    </div>

                    <div className="flex justify-center">
                        {results.qrcode ? (
                            <div className="text-center w-full">
                                <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                                    <QRCodeSVG
                                        value={results.qrcode}
                                        size={qrSize}
                                        level="M"
                                        includeMargin={true}
                                        bgColor="#ffffff"
                                        fgColor="#000000"
                                    />
                                </div>
                                <div className="mt-3 text-sm text-gray-600">
                                    📱 扫描二维码访问内容
                                </div>
                                <div className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded break-all overflow-x-auto max-w-full">
                                    二维码内容: {results.qrcode}
                                </div>
                                {/* 根据内容类型显示额外信息 */}
                                {(results.contentType === 'url_encoded' || results.contentType === 'base64' || results.contentType === 'hex') && (
                                    <div className="mt-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded break-all overflow-x-auto max-w-full">
                                        原始编码内容: {results.original}
                                    </div>
                                )}
                                {results.contentType === 'url' && (
                                    <div className="mt-2 text-xs text-gray-500 bg-blue-50 p-2 rounded break-all overflow-x-auto max-w-full">
                                        原始URL: {results.original}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8 w-full">
                                <div className="text-4xl mb-2">📱</div>
                                <div className="text-sm">请输入内容生成二维码</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 空状态提示 */}
                {!content && (
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">🔗</div>
                        <div>请输入URL或文本内容开始使用工具</div>
                        <div className="text-sm mt-1">支持URL编码解码和二维码生成</div>
                    </div>
                )}
            </div>
        </div>
    );
}